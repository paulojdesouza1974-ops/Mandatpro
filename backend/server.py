from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime, timezone
from bson import ObjectId
from dotenv import load_dotenv
import os
import uuid
import base64
import mimetypes
import logging
import threading
import time
from pathlib import Path
from pymongo import MongoClient
import secrets
import hashlib

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# MongoDB setup
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
if not MONGO_URL or not DB_NAME:
    raise RuntimeError("MONGO_URL and DB_NAME must be set")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="KommunalCRM API", version="1.0.0")

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper function to convert ObjectId to string
def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc

def serialize_docs(docs):
    return [serialize_doc(doc) for doc in docs]

# ============ MODELS ============

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    city: Optional[str] = None
    organization: Optional[str] = None
    org_type: Optional[str] = "fraktion"
    role: Optional[str] = "user"

class UserLogin(BaseModel):
    email: str
    password: str

class OrganizationCreate(BaseModel):
    name: str
    type: Optional[str] = "fraktion"
    city: Optional[str] = None
    state: Optional[str] = None

class ContactCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    organization: str
    type: Optional[str] = None
    notes: Optional[str] = None
    member_group: Optional[str] = None
    address: Optional[str] = None

class MotionCreate(BaseModel):
    title: str
    content: Optional[str] = None
    organization: str
    type: Optional[str] = "antrag"
    status: Optional[str] = "entwurf"
    priority: Optional[str] = "mittel"
    deadline: Optional[str] = None
    assigned_to: Optional[str] = None

class MeetingCreate(BaseModel):
    title: str
    organization: str
    date: str
    end_date: Optional[str] = None
    location: Optional[str] = None
    type: Optional[str] = "sonstiges"
    status: Optional[str] = "geplant"
    description: Optional[str] = None
    agenda: Optional[str] = None

class CommunicationCreate(BaseModel):
    subject: str
    organization: str
    type: Optional[str] = "email"
    status: Optional[str] = "offen"
    content: Optional[str] = None
    contact_id: Optional[str] = None
    follow_up_date: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    organization: str
    description: Optional[str] = None
    status: Optional[str] = "offen"
    priority: Optional[str] = "mittel"
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None

class DocumentCreate(BaseModel):
    title: str
    organization: str
    type: Optional[str] = None
    content: Optional[str] = None
    file_url: Optional[str] = None

class FractionMeetingCreate(BaseModel):
    title: str
    organization: str
    date: str
    agenda: Optional[str] = None
    notes: Optional[str] = None
    template_id: Optional[str] = None

class CampaignCreate(BaseModel):
    name: str
    organization: str
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget: Optional[float] = 0
    status: Optional[str] = "aktiv"

class GenericCreate(BaseModel):
    organization: Optional[str] = None
    data: Optional[dict] = {}

# ============ AUTH ============

# Simple token storage (in production use Redis or JWT)
tokens = {}

logger = logging.getLogger("kommunalcrm")

def get_openai_key():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
    return api_key

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    tokens[token] = user_id
    return token

def get_current_user(authorization: str = None):
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user_id = tokens.get(token)
    if not user_id:
        return None
    user = db.users.find_one({"_id": ObjectId(user_id)})
    return serialize_doc(user) if user else None

@app.post("/api/auth/register")
async def register(user: UserCreate):
    existing = db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate organization slug from name
    org_slug = user.organization.lower().replace(" ", "-").replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss") if user.organization else f"org-{datetime.now().timestamp()}"
    
    # Create organization if it doesn't exist
    existing_org = db.organizations.find_one({"name": org_slug})
    if not existing_org:
        org_doc = {
            "name": org_slug,
            "display_name": user.organization,
            "type": user.org_type,
            "city": user.city,
            "created_date": datetime.now(timezone.utc).isoformat()
        }
        db.organizations.insert_one(org_doc)
    
    user_doc = {
        "email": user.email,
        "password": hash_password(user.password),
        "full_name": user.full_name,
        "city": user.city,
        "organization": org_slug,
        "org_type": user.org_type,
        "role": user.role,
        "created_date": datetime.now(timezone.utc).isoformat()
    }
    result = db.users.insert_one(user_doc)
    token = create_token(str(result.inserted_id))
    user_doc["id"] = str(result.inserted_id)
    if "_id" in user_doc:
        del user_doc["_id"]
    del user_doc["password"]
    return {"token": token, "user": user_doc}

@app.post("/api/auth/login")
async def login(credentials: UserLogin):
    user = db.users.find_one({"email": credentials.email})
    if not user or user["password"] != hash_password(credentials.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(str(user["_id"]))
    user_doc = serialize_doc(user)
    del user_doc["password"]
    return {"token": token, "user": user_doc}

@app.get("/api/auth/me")
async def get_me(authorization: str = Header(None)):
    # Get token from header
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if "password" in user:
        del user["password"]
    return user

@app.put("/api/auth/me")
async def update_me(data: dict, authorization: str = Header(None)):
    # Get token from header
    token = None
    if authorization:
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    user_id = tokens.get(token) if token else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Remove fields that shouldn't be updated
    if "_id" in data:
        del data["_id"]
    if "id" in data:
        del data["id"]
    if "email" in data:
        del data["email"]  # Email cannot be changed
    if "password" in data:
        data["password"] = hash_password(data["password"])
    
    data["updated_date"] = datetime.now(timezone.utc).isoformat()
    
    result = db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = db.users.find_one({"_id": ObjectId(user_id)})
    user_doc = serialize_doc(user)
    if "password" in user_doc:
        del user_doc["password"]
    return user_doc

@app.post("/api/auth/logout")
async def logout(authorization: str = Header(None)):
    if authorization:
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        if token in tokens:
            del tokens[token]
    return {"success": True}

# ============ GENERIC CRUD ENDPOINTS ============

def create_crud_routes(collection_name: str, entity_name: str):
    """Create CRUD routes for an entity"""
    
    @app.get(f"/api/{collection_name}")
    async def list_items(organization: Optional[str] = None, sort: Optional[str] = "-created_date", limit: Optional[int] = 100):
        query = {}
        if organization:
            query["organization"] = organization
        
        sort_field = sort.lstrip("-")
        sort_order = -1 if sort.startswith("-") else 1
        
        docs = list(db[collection_name].find(query).sort(sort_field, sort_order).limit(limit))
        return serialize_docs(docs)
    
    @app.get(f"/api/{collection_name}/{{item_id}}")
    async def get_item(item_id: str):
        doc = db[collection_name].find_one({"_id": ObjectId(item_id)})
        if not doc:
            raise HTTPException(status_code=404, detail=f"{entity_name} not found")
        return serialize_doc(doc)
    
    @app.post(f"/api/{collection_name}")
    async def create_item(data: dict):
        data["created_date"] = datetime.now(timezone.utc).isoformat()
        data["updated_date"] = datetime.now(timezone.utc).isoformat()
        result = db[collection_name].insert_one(data)
        data["id"] = str(result.inserted_id)
        if "_id" in data:
            del data["_id"]
        return data
    
    @app.put(f"/api/{collection_name}/{{item_id}}")
    async def update_item(item_id: str, data: dict):
        data["updated_date"] = datetime.now(timezone.utc).isoformat()
        if "_id" in data:
            del data["_id"]
        if "id" in data:
            del data["id"]
        result = db[collection_name].update_one(
            {"_id": ObjectId(item_id)},
            {"$set": data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail=f"{entity_name} not found")
        doc = db[collection_name].find_one({"_id": ObjectId(item_id)})
        return serialize_doc(doc)
    
    @app.delete(f"/api/{collection_name}/{{item_id}}")
    async def delete_item(item_id: str):
        result = db[collection_name].delete_one({"_id": ObjectId(item_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail=f"{entity_name} not found")
        return {"success": True}
    
    return list_items, get_item, create_item, update_item, delete_item

# Create routes for all entities
entities = [
    ("contacts", "Contact"),
    ("motions", "Motion"),
    ("meetings", "Meeting"),
    ("communications", "Communication"),
    ("tasks", "Task"),
    ("documents", "Document"),
    ("campaigns", "Campaign"),
    ("campaign_events", "CampaignEvent"),
    ("campaign_expenses", "CampaignExpense"),
    ("volunteers", "Volunteer"),
    ("organizations", "Organization"),
    ("fraction_meetings", "FractionMeeting"),
    ("fraction_meeting_templates", "FractionMeetingTemplate"),
    ("member_groups", "MemberGroup"),
    ("media_posts", "MediaPost"),
    ("print_templates", "PrintTemplate"),
    ("app_settings", "AppSettings"),
    ("invoices", "Invoice"),
    ("support_tickets", "SupportTicket"),
    ("workflow_rules", "WorkflowRule"),
    ("mandate_levies", "MandateLevy"),
    ("levy_rules", "LevyRule"),
    ("incomes", "Income"),
    ("expenses", "Expense"),
    ("receipts", "Receipt"),
    ("budgets", "Budget"),
]

# Create CRUD routes for all entities
for collection_name, entity_name in entities:
    create_crud_routes(collection_name, entity_name)

# Users have special handling
@app.get("/api/users")
async def list_users(organization: Optional[str] = None, sort: Optional[str] = "-created_date", limit: Optional[int] = 100):
    query = {}
    if organization:
        query["organization"] = organization
    
    sort_field = sort.lstrip("-")
    sort_order = -1 if sort.startswith("-") else 1
    
    docs = list(db.users.find(query).sort(sort_field, sort_order).limit(limit))
    result = serialize_docs(docs)
    for doc in result:
        if "password" in doc:
            del doc["password"]
    return result

@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    doc = db.users.find_one({"_id": ObjectId(user_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    result = serialize_doc(doc)
    if "password" in result:
        del result["password"]
    return result

@app.put("/api/users/{user_id}")
async def update_user(user_id: str, data: dict):
    data["updated_date"] = datetime.now(timezone.utc).isoformat()
    if "_id" in data:
        del data["_id"]
    if "id" in data:
        del data["id"]
    if "password" in data:
        data["password"] = hash_password(data["password"])
    
    result = db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    doc = db.users.find_one({"_id": ObjectId(user_id)})
    result = serialize_doc(doc)
    if "password" in result:
        del result["password"]
    return result

# Health check
@app.get("/api/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Seed demo data endpoint
@app.post("/api/seed-demo")
async def seed_demo():
    """Seed basic demo data for quick login including faction finances"""
    from datetime import timedelta
    import random
    
    org_name = "demo-org"
    now = datetime.now(timezone.utc)
    
    # Create demo user if not exists
    if not db.users.find_one({"email": "demo@kommunalcrm.de"}):
        demo_user = {
            "email": "demo@kommunalcrm.de",
            "password": hash_password("demo123"),
            "full_name": "Max Mustermann",
            "city": "Musterstadt",
            "organization": org_name,
            "org_type": "fraktion",
            "role": "admin",
            "created_date": now.isoformat()
        }
        db.users.insert_one(demo_user)
    
    # Create demo organization if not exists
    if not db.organizations.find_one({"name": org_name}):
        demo_org = {
            "name": org_name,
            "display_name": "SPD Fraktion Musterstadt",
            "type": "fraktion",
            "city": "Musterstadt",
            "state": "Bayern",
            "created_date": now.isoformat()
        }
        db.organizations.insert_one(demo_org)
    
    # Seed faction finances if not exists
    if db.incomes.count_documents({"organization": org_name, "type": "fraction"}) == 0:
        # Add faction income (Zuwendungen)
        faction_incomes = [
            {"title": "Fraktionszuwendung Q1/2026", "category": "zuwendung_stadt", "amount": 12500.00, "date": (now - timedelta(days=60)).isoformat(), "reference": "BV-2026-001", "notes": "Quartalszuwendung Stadt"},
            {"title": "Fraktionszuwendung Q4/2025", "category": "zuwendung_stadt", "amount": 12500.00, "date": (now - timedelta(days=150)).isoformat(), "reference": "BV-2025-004", "notes": "Quartalszuwendung Stadt"},
            {"title": "Kreiszuwendung 2025", "category": "zuwendung_kreis", "amount": 3500.00, "date": (now - timedelta(days=120)).isoformat(), "reference": "KT-2025-FZ", "notes": "Jährliche Kreiszuwendung"},
            {"title": "Fraktionszuwendung Q3/2025", "category": "zuwendung_stadt", "amount": 12500.00, "date": (now - timedelta(days=240)).isoformat(), "reference": "BV-2025-003", "notes": "Quartalszuwendung Stadt"},
        ]
        for inc in faction_incomes:
            inc["organization"] = org_name
            inc["type"] = "fraction"
            inc["created_date"] = now.isoformat()
            db.incomes.insert_one(inc)
        
        # Add faction expenses
        faction_expenses = [
            {"title": "Gehalt Fraktionsgeschäftsführer Januar", "category": "personal", "amount": 3800.00, "date": (now - timedelta(days=30)).isoformat(), "reference": "GH-2026-01", "notes": "Monatl. Gehalt inkl. AG-Anteile"},
            {"title": "Gehalt Fraktionsgeschäftsführer Dezember", "category": "personal", "amount": 3800.00, "date": (now - timedelta(days=60)).isoformat(), "reference": "GH-2025-12", "notes": "Monatl. Gehalt inkl. AG-Anteile"},
            {"title": "Miete Fraktionsbüro Februar", "category": "miete", "amount": 650.00, "date": (now - timedelta(days=15)).isoformat(), "reference": "MI-2026-02", "notes": "Inkl. Nebenkosten"},
            {"title": "Miete Fraktionsbüro Januar", "category": "miete", "amount": 650.00, "date": (now - timedelta(days=45)).isoformat(), "reference": "MI-2026-01", "notes": "Inkl. Nebenkosten"},
            {"title": "Miete Fraktionsbüro Dezember", "category": "miete", "amount": 650.00, "date": (now - timedelta(days=75)).isoformat(), "reference": "MI-2025-12", "notes": "Inkl. Nebenkosten"},
            {"title": "Telefonkosten Q1", "category": "verwaltung", "amount": 185.00, "date": (now - timedelta(days=20)).isoformat(), "reference": "TEL-2026-Q1", "notes": "Festnetz + Mobilfunk"},
            {"title": "Porto & Versand", "category": "verwaltung", "amount": 45.50, "date": (now - timedelta(days=10)).isoformat(), "reference": "PO-2026-02", "notes": "Einladungen MV"},
            {"title": "Druckkosten Flyer", "category": "verwaltung", "amount": 380.00, "date": (now - timedelta(days=35)).isoformat(), "reference": "DR-2026-001", "notes": "500 Flyer Bürgerinfo"},
            {"title": "Bürobedarf", "category": "bueromaterial", "amount": 125.00, "date": (now - timedelta(days=25)).isoformat(), "reference": "BM-2026-01", "notes": "Papier, Toner, Stifte"},
            {"title": "IT-Wartung", "category": "verwaltung", "amount": 95.00, "date": (now - timedelta(days=50)).isoformat(), "reference": "IT-2026-01", "notes": "Monatliche Pauschale"},
        ]
        for exp in faction_expenses:
            exp["organization"] = org_name
            exp["type"] = "fraction"
            exp["created_date"] = now.isoformat()
            db.expenses.insert_one(exp)
    
    return {"success": True, "message": "Demo data seeded"}


@app.post("/api/seed-full-demo")
async def seed_full_demo():
    """Seed comprehensive demo data with members, donors, mandate levies, finances, etc."""
    from datetime import timedelta
    import random
    
    org_name = "demo-verband"
    now = datetime.now(timezone.utc)
    
    # Clear existing demo data
    collections_to_clear = [
        "contacts", "member_groups", "mandate_levies", "levy_rules",
        "incomes", "expenses", "meetings", "motions", "tasks",
        "campaigns", "communications", "documents", "fraction_meetings"
    ]
    for col in collections_to_clear:
        db[col].delete_many({"organization": org_name})
    
    # Delete existing demo user and org
    db.users.delete_many({"organization": org_name})
    db.organizations.delete_many({"name": org_name})
    
    # ========== CREATE DEMO USER ==========
    demo_user = {
        "email": "demo-verband@kommunalcrm.de",
        "password": hash_password("demo123"),
        "full_name": "Maria Schmidt",
        "city": "Neustadt",
        "organization": org_name,
        "org_type": "verband",  # Verband mode for full features
        "role": "admin",
        "created_date": now.isoformat()
    }
    db.users.insert_one(demo_user)
    
    # ========== CREATE ORGANIZATION ==========
    demo_org = {
        "name": org_name,
        "display_name": "SPD Ortsverband Neustadt",
        "type": "verband",
        "city": "Neustadt",
        "state": "Nordrhein-Westfalen",
        "address": "Rathausplatz 1, 12345 Neustadt",
        "phone": "02345 / 123456",
        "email": "info@spd-neustadt.de",
        "website": "www.spd-neustadt.de",
        "founded_year": 1969,
        "bank_name": "Sparkasse Neustadt",
        "iban": "DE89 3704 0044 0532 0130 00",
        "bic": "COBADEFFXXX",
        "tax_number": "123/456/78901",
        "created_date": now.isoformat()
    }
    db.organizations.insert_one(demo_org)
    
    # ========== CREATE MEMBER GROUPS ==========
    groups = [
        {"name": "Vorstand", "description": "Vorstandsmitglieder des Ortsvereins", "color": "#dc2626"},
        {"name": "Mandatsträger", "description": "Gewählte Vertreter in Rat und Kreistag", "color": "#2563eb"},
        {"name": "Aktive Mitglieder", "description": "Regelmäßig aktive Parteimitglieder", "color": "#16a34a"},
        {"name": "Jusos", "description": "Jungsozialist*innen unter 35", "color": "#ea580c"},
        {"name": "AG 60+", "description": "Arbeitsgemeinschaft der Senior*innen", "color": "#7c3aed"},
        {"name": "Ehrenmitglieder", "description": "Ehrenmitglieder des Ortsvereins", "color": "#ca8a04"},
    ]
    group_ids = {}
    for g in groups:
        g["organization"] = org_name
        g["created_date"] = now.isoformat()
        g["member_ids"] = []
        result = db.member_groups.insert_one(g)
        group_ids[g["name"]] = str(result.inserted_id)
    
    # ========== CREATE MEMBERS (CONTACTS) ==========
    members_data = [
        # Vorstand
        {"first_name": "Maria", "last_name": "Schmidt", "email": "m.schmidt@spd-neustadt.de", "phone": "0171-1234567", "role": "Vorsitzende", "groups": ["Vorstand", "Aktive Mitglieder"], "fee_paid": True, "member_since": "2010-03-15", "address": "Hauptstr. 12, 12345 Neustadt", "birthday": "1975-06-20", "member_number": "M-001"},
        {"first_name": "Thomas", "last_name": "Müller", "email": "t.mueller@spd-neustadt.de", "phone": "0172-2345678", "role": "Stellv. Vorsitzender", "groups": ["Vorstand", "Mandatsträger"], "fee_paid": True, "member_since": "2005-01-10", "address": "Bergweg 5, 12345 Neustadt", "birthday": "1968-11-03", "member_number": "M-002", "mandate": "Ratsmitglied"},
        {"first_name": "Sabine", "last_name": "Weber", "email": "s.weber@spd-neustadt.de", "phone": "0173-3456789", "role": "Kassierer*in", "groups": ["Vorstand"], "fee_paid": True, "member_since": "2012-09-01", "address": "Lindenallee 8, 12345 Neustadt", "birthday": "1980-02-14", "member_number": "M-003"},
        {"first_name": "Klaus", "last_name": "Fischer", "email": "k.fischer@spd-neustadt.de", "phone": "0174-4567890", "role": "Schriftführer", "groups": ["Vorstand", "AG 60+"], "fee_paid": True, "member_since": "1998-04-20", "address": "Parkstr. 22, 12345 Neustadt", "birthday": "1958-07-30", "member_number": "M-004"},
        
        # Mandatsträger
        {"first_name": "Andrea", "last_name": "Becker", "email": "a.becker@rat-neustadt.de", "phone": "0175-5678901", "role": "Fraktionsvorsitzende", "groups": ["Mandatsträger", "Aktive Mitglieder"], "fee_paid": True, "member_since": "2002-06-15", "address": "Rathausweg 3, 12345 Neustadt", "birthday": "1972-09-18", "member_number": "M-005", "mandate": "Ratsmitglied", "mandate_income": 1850.00},
        {"first_name": "Michael", "last_name": "Hoffmann", "email": "m.hoffmann@rat-neustadt.de", "phone": "0176-6789012", "groups": ["Mandatsträger"], "fee_paid": True, "member_since": "2008-11-20", "address": "Schulstr. 15, 12345 Neustadt", "birthday": "1965-04-25", "member_number": "M-006", "mandate": "Kreistagsmitglied", "mandate_income": 2200.00},
        {"first_name": "Petra", "last_name": "Schneider", "email": "p.schneider@rat-neustadt.de", "phone": "0177-7890123", "groups": ["Mandatsträger", "Aktive Mitglieder"], "fee_paid": True, "member_since": "2015-03-01", "address": "Am Markt 7, 12345 Neustadt", "birthday": "1978-12-05", "member_number": "M-007", "mandate": "Ratsmitglied", "mandate_income": 1850.00},
        {"first_name": "Hans", "last_name": "Meyer", "email": "h.meyer@rat-neustadt.de", "phone": "0178-8901234", "groups": ["Mandatsträger", "AG 60+"], "fee_paid": True, "member_since": "1995-08-10", "address": "Gartenweg 11, 12345 Neustadt", "birthday": "1955-01-15", "member_number": "M-008", "mandate": "Bürgermeister", "mandate_income": 6500.00},
        
        # Jusos
        {"first_name": "Lisa", "last_name": "Wagner", "email": "l.wagner@jusos-neustadt.de", "phone": "0179-9012345", "role": "Juso-Vorsitzende", "groups": ["Jusos", "Aktive Mitglieder"], "fee_paid": True, "member_since": "2020-01-15", "address": "Studentenweg 4, 12345 Neustadt", "birthday": "1998-05-22", "member_number": "M-009"},
        {"first_name": "Maximilian", "last_name": "Koch", "email": "m.koch@jusos-neustadt.de", "phone": "0160-0123456", "groups": ["Jusos"], "fee_paid": True, "member_since": "2021-09-01", "address": "Unistr. 18, 12345 Neustadt", "birthday": "2000-08-12", "member_number": "M-010"},
        {"first_name": "Sophie", "last_name": "Braun", "email": "s.braun@email.de", "phone": "0161-1234567", "groups": ["Jusos"], "fee_paid": False, "member_since": "2023-03-20", "address": "Nordstr. 9, 12345 Neustadt", "birthday": "2001-11-30", "member_number": "M-011"},
        
        # AG 60+
        {"first_name": "Gerhard", "last_name": "Richter", "email": "g.richter@email.de", "phone": "02345-111222", "role": "AG 60+ Sprecher", "groups": ["AG 60+"], "fee_paid": True, "member_since": "1985-02-28", "address": "Seniorenring 1, 12345 Neustadt", "birthday": "1948-06-10", "member_number": "M-012"},
        {"first_name": "Helga", "last_name": "Krause", "email": "h.krause@email.de", "phone": "02345-222333", "groups": ["AG 60+"], "fee_paid": True, "member_since": "1990-07-15", "address": "Rentnerweg 5, 12345 Neustadt", "birthday": "1950-03-25", "member_number": "M-013"},
        {"first_name": "Werner", "last_name": "Schulz", "email": "w.schulz@email.de", "phone": "02345-333444", "groups": ["AG 60+", "Ehrenmitglieder"], "fee_paid": True, "member_since": "1975-11-01", "address": "Alte Gasse 3, 12345 Neustadt", "birthday": "1945-09-08", "member_number": "M-014"},
        
        # Aktive Mitglieder
        {"first_name": "Julia", "last_name": "Hartmann", "email": "j.hartmann@email.de", "phone": "0162-2345678", "groups": ["Aktive Mitglieder"], "fee_paid": True, "member_since": "2018-04-10", "address": "Waldstr. 20, 12345 Neustadt", "birthday": "1988-07-14", "member_number": "M-015"},
        {"first_name": "Stefan", "last_name": "Wolf", "email": "s.wolf@email.de", "phone": "0163-3456789", "groups": ["Aktive Mitglieder"], "fee_paid": True, "member_since": "2016-12-05", "address": "Bachweg 12, 12345 Neustadt", "birthday": "1982-10-22", "member_number": "M-016"},
        {"first_name": "Martina", "last_name": "Neumann", "email": "m.neumann@email.de", "phone": "0164-4567890", "groups": ["Aktive Mitglieder"], "fee_paid": False, "member_since": "2022-08-01", "address": "Friedensplatz 6, 12345 Neustadt", "birthday": "1991-04-03", "member_number": "M-017"},
        {"first_name": "Frank", "last_name": "Schwarz", "email": "f.schwarz@email.de", "phone": "0165-5678901", "groups": ["Aktive Mitglieder"], "fee_paid": True, "member_since": "2014-05-20", "address": "Industriestr. 45, 12345 Neustadt", "birthday": "1976-01-28", "member_number": "M-018"},
        
        # Weitere Mitglieder (weniger aktiv)
        {"first_name": "Ursula", "last_name": "König", "email": "u.koenig@email.de", "phone": "02345-444555", "groups": [], "fee_paid": True, "member_since": "2000-10-10", "address": "Seitenstr. 8, 12345 Neustadt", "birthday": "1960-12-18", "member_number": "M-019"},
        {"first_name": "Dieter", "last_name": "Lang", "email": "d.lang@email.de", "phone": "02345-555666", "groups": [], "fee_paid": False, "member_since": "2019-02-14", "address": "Neuweg 22, 12345 Neustadt", "birthday": "1973-08-05", "member_number": "M-020"},
        {"first_name": "Birgit", "last_name": "Peters", "email": "b.peters@email.de", "phone": "0166-6789012", "groups": [], "fee_paid": True, "member_since": "2017-06-30", "address": "Feldstr. 14, 12345 Neustadt", "birthday": "1985-02-10", "member_number": "M-021"},
        {"first_name": "Rolf", "last_name": "Zimmermann", "email": "r.zimmermann@email.de", "phone": "02345-666777", "groups": [], "fee_paid": True, "member_since": "2011-09-25", "address": "Wiesengrund 3, 12345 Neustadt", "birthday": "1970-05-15", "member_number": "M-022"},
    ]
    
    member_ids = []
    for m in members_data:
        member_groups = m.pop("groups", [])
        m["organization"] = org_name
        m["status"] = "aktiv"
        m["type"] = "mitglied"
        m["created_date"] = now.isoformat()
        result = db.contacts.insert_one(m)
        mid = str(result.inserted_id)
        member_ids.append(mid)
        
        # Add member to groups
        for gname in member_groups:
            if gname in group_ids:
                db.member_groups.update_one(
                    {"_id": ObjectId(group_ids[gname])},
                    {"$push": {"member_ids": mid}}
                )
    
    # ========== CREATE DONORS (SPENDER) ==========
    donors_data = [
        {"first_name": "Heinrich", "last_name": "Großmann", "email": "h.grossmann@firma.de", "phone": "02345-888999", "company": "Großmann GmbH", "donation_total": 5000.00, "last_donation": "2025-12-01", "address": "Industriepark 10, 12345 Neustadt"},
        {"first_name": "Erika", "last_name": "Spendefroh", "email": "e.spendefroh@email.de", "phone": "0167-7890123", "donation_total": 2500.00, "last_donation": "2025-11-15", "address": "Großbürgerweg 5, 12345 Neustadt"},
        {"first_name": "Gewerkschaft", "last_name": "ver.di Bezirk", "email": "bezirk@verdi.de", "phone": "02345-999000", "company": "ver.di", "donation_total": 3000.00, "last_donation": "2025-10-20", "address": "Gewerkschaftshaus, 12345 Neustadt"},
    ]
    
    for d in donors_data:
        d["organization"] = org_name
        d["status"] = "aktiv"
        d["type"] = "spender"
        d["created_date"] = now.isoformat()
        db.contacts.insert_one(d)
    
    # ========== CREATE LEVY RULES (ABGABENREGELN) ==========
    levy_rules = [
        {"name": "Standard-Mandatsabgabe", "description": "20% der Aufwandsentschädigung", "percentage": 20.0, "mandate_type": "Ratsmitglied", "min_amount": 50.0, "active": True},
        {"name": "Kreistag-Abgabe", "description": "18% der Aufwandsentschädigung", "percentage": 18.0, "mandate_type": "Kreistagsmitglied", "min_amount": 75.0, "active": True},
        {"name": "Bürgermeister-Abgabe", "description": "15% des Gehalts", "percentage": 15.0, "mandate_type": "Bürgermeister", "min_amount": 500.0, "active": True},
    ]
    
    for lr in levy_rules:
        lr["organization"] = org_name
        lr["created_date"] = now.isoformat()
        db.levy_rules.insert_one(lr)
    
    # ========== CREATE MANDATE LEVIES (MANDATSTRÄGERABGABEN) ==========
    # Get mandatsträger from members
    mandatstraeger = [m for m in members_data if m.get("mandate")]
    
    for month_offset in range(12):  # Last 12 months
        levy_date = now - timedelta(days=30 * month_offset)
        for mt in mandatstraeger:
            if mt.get("mandate_income"):
                income = mt["mandate_income"]
                if mt["mandate"] == "Bürgermeister":
                    rate = 15.0
                elif mt["mandate"] == "Kreistagsmitglied":
                    rate = 18.0
                else:
                    rate = 20.0
                
                amount = round(income * rate / 100, 2)
                paid = random.random() > 0.15  # 85% are paid
                
                levy = {
                    "organization": org_name,
                    "contact_name": f"{mt['first_name']} {mt['last_name']}",
                    "member_number": mt["member_number"],
                    "mandate_type": mt["mandate"].lower().replace(" ", ""),  # e.g., "ratsmitglied"
                    "mandate_body": "Stadt Neustadt" if mt["mandate"] != "Kreistagsmitglied" else "Kreis Neustadt",
                    "period_month": levy_date.strftime("%Y-%m"),
                    "gross_income": income,
                    "levy_rate": rate,
                    "deductions": 0,
                    "final_levy": amount,
                    "status": "bezahlt" if paid else "offen",
                    "payment_date": levy_date.strftime("%Y-%m-%d") if paid else None,
                    "created_date": levy_date.isoformat()
                }
                db.mandate_levies.insert_one(levy)
    
    # ========== CREATE INCOMES (EINNAHMEN) ==========
    
    incomes_data = []
    for month_offset in range(12):
        income_date = now - timedelta(days=30 * month_offset)
        
        # Mitgliedsbeiträge (monatlich)
        incomes_data.append({
            "title": f"Mitgliedsbeiträge {income_date.strftime('%B %Y')}",
            "category": "Mitgliedsbeiträge",
            "account_number": "4100",
            "amount": round(random.uniform(800, 1200), 2),
            "date": income_date.isoformat(),
            "payer": "Sammelüberweisung Mitglieder",
            "reference": f"MB-{income_date.strftime('%Y%m')}",
            "tax_rate": 0,
        })
        
        # Mandatsträgerabgaben (monatlich)
        incomes_data.append({
            "title": f"Mandatsträgerabgaben {income_date.strftime('%B %Y')}",
            "category": "Mandatsträgerabgaben",
            "account_number": "4120",
            "amount": round(random.uniform(2500, 3500), 2),
            "date": income_date.isoformat(),
            "payer": "Mandatsträger",
            "reference": f"MTA-{income_date.strftime('%Y%m')}",
            "tax_rate": 0,
        })
    
    # Einzelspenden
    incomes_data.extend([
        {"title": "Spende Heinrich Großmann", "category": "Spenden juristische Personen", "account_number": "4111", "amount": 5000.00, "date": (now - timedelta(days=45)).isoformat(), "payer": "Großmann GmbH", "reference": "SP-2025-001", "tax_rate": 0},
        {"title": "Spende Erika Spendefroh", "category": "Spenden natürliche Personen", "account_number": "4110", "amount": 2500.00, "date": (now - timedelta(days=60)).isoformat(), "payer": "Erika Spendefroh", "reference": "SP-2025-002", "tax_rate": 0},
        {"title": "Spende ver.di Bezirk", "category": "Spenden juristische Personen", "account_number": "4111", "amount": 3000.00, "date": (now - timedelta(days=90)).isoformat(), "payer": "ver.di Bezirk", "reference": "SP-2025-003", "tax_rate": 0},
        {"title": "Erlös Sommerfest 2025", "category": "Veranstaltungserlöse", "account_number": "4130", "amount": 1850.00, "date": (now - timedelta(days=180)).isoformat(), "payer": "Barzahlung", "reference": "VER-2025-001", "tax_rate": 0},
        {"title": "Staatlicher Zuschuss Q4", "category": "Staatliche Zuschüsse", "account_number": "4140", "amount": 8500.00, "date": (now - timedelta(days=30)).isoformat(), "payer": "Land NRW", "reference": "STZ-2025-Q4", "tax_rate": 0},
    ])
    
    for inc in incomes_data:
        inc["organization"] = org_name
        inc["status"] = "gebucht"
        inc["created_date"] = now.isoformat()
        db.incomes.insert_one(inc)
    
    # ========== CREATE EXPENSES (AUSGABEN) ==========
    expenses_data = [
        {"title": "Miete Geschäftsstelle Januar", "category": "Raumkosten", "account_number": "6310", "amount": 450.00, "net_amount": 378.15, "tax_amount": 71.85, "tax_rate": 19, "date": (now - timedelta(days=30)).isoformat(), "vendor": "Hausverwaltung Neustadt", "reference": "M-2025-01"},
        {"title": "Miete Geschäftsstelle Dezember", "category": "Raumkosten", "account_number": "6310", "amount": 450.00, "net_amount": 378.15, "tax_amount": 71.85, "tax_rate": 19, "date": (now - timedelta(days=60)).isoformat(), "vendor": "Hausverwaltung Neustadt", "reference": "M-2024-12"},
        {"title": "Druck Wahlkampfflyer", "category": "Werbekosten", "account_number": "6600", "amount": 1250.00, "net_amount": 1050.42, "tax_amount": 199.58, "tax_rate": 19, "date": (now - timedelta(days=45)).isoformat(), "vendor": "Druckerei Schmidt", "reference": "DR-2025-001"},
        {"title": "Catering Mitgliederversammlung", "category": "Veranstaltungskosten", "account_number": "6820", "amount": 385.00, "net_amount": 359.81, "tax_amount": 25.19, "tax_rate": 7, "date": (now - timedelta(days=20)).isoformat(), "vendor": "Partyservice Lecker", "reference": "CA-2025-001"},
        {"title": "Büromaterial", "category": "Bürobedarf", "account_number": "6815", "amount": 125.50, "net_amount": 105.46, "tax_amount": 20.04, "tax_rate": 19, "date": (now - timedelta(days=15)).isoformat(), "vendor": "Büro-Fuchs GmbH", "reference": "BM-2025-001"},
        {"title": "Website Hosting Jahresgebühr", "category": "EDV-Kosten", "account_number": "6580", "amount": 180.00, "net_amount": 151.26, "tax_amount": 28.74, "tax_rate": 19, "date": (now - timedelta(days=10)).isoformat(), "vendor": "Webhosting24", "reference": "WEB-2025"},
        {"title": "Telefonkosten Dezember", "category": "Kommunikationskosten", "account_number": "6805", "amount": 45.90, "net_amount": 38.57, "tax_amount": 7.33, "tax_rate": 19, "date": (now - timedelta(days=35)).isoformat(), "vendor": "Telekom", "reference": "TEL-2024-12"},
        {"title": "Fahrtkosten Delegiertenkonferenz", "category": "Reisekosten", "account_number": "6670", "amount": 312.50, "net_amount": 262.61, "tax_amount": 49.89, "tax_rate": 19, "date": (now - timedelta(days=50)).isoformat(), "vendor": "Deutsche Bahn", "reference": "FK-2025-001"},
        {"title": "Veranstaltungstechnik Sommerfest", "category": "Veranstaltungskosten", "account_number": "6820", "amount": 580.00, "net_amount": 487.39, "tax_amount": 92.61, "tax_rate": 19, "date": (now - timedelta(days=180)).isoformat(), "vendor": "Event-Technik Müller", "reference": "VT-2025-001"},
        {"title": "Versicherung Vereinshaftpflicht", "category": "Versicherungen", "account_number": "6400", "amount": 285.00, "net_amount": 285.00, "tax_amount": 0, "tax_rate": 0, "date": (now - timedelta(days=100)).isoformat(), "vendor": "Allianz Versicherung", "reference": "VERS-2025"},
    ]
    
    for exp in expenses_data:
        exp["organization"] = org_name
        exp["status"] = "bezahlt"
        exp["created_date"] = now.isoformat()
        db.expenses.insert_one(exp)
    
    # ========== CREATE MEETINGS (SITZUNGEN) ==========
    meetings_data = [
        {"title": "Vorstandssitzung", "date": (now + timedelta(days=7)).isoformat(), "end_date": (now + timedelta(days=7, hours=2)).isoformat(), "location": "Geschäftsstelle", "type": "vorstand", "status": "geplant", "description": "Monatliche Vorstandssitzung"},
        {"title": "Mitgliederversammlung", "date": (now + timedelta(days=30)).isoformat(), "end_date": (now + timedelta(days=30, hours=3)).isoformat(), "location": "Bürgerhaus Neustadt", "type": "mitgliederversammlung", "status": "geplant", "description": "Ordentliche Jahreshauptversammlung mit Vorstandswahlen"},
        {"title": "AG 60+ Treffen", "date": (now + timedelta(days=14)).isoformat(), "end_date": (now + timedelta(days=14, hours=2)).isoformat(), "location": "Seniorentreff", "type": "arbeitsgruppe", "status": "geplant", "description": "Monatliches Treffen der AG 60+"},
        {"title": "Juso-Plenum", "date": (now + timedelta(days=10)).isoformat(), "end_date": (now + timedelta(days=10, hours=2)).isoformat(), "location": "Jugendhaus", "type": "arbeitsgruppe", "status": "geplant", "description": "Offenes Plenum der Jusos"},
        {"title": "Wahlkampfplanung", "date": (now + timedelta(days=21)).isoformat(), "end_date": (now + timedelta(days=21, hours=3)).isoformat(), "location": "Geschäftsstelle", "type": "sonstiges", "status": "geplant", "description": "Strategieplanung für Kommunalwahl 2026"},
    ]
    
    for meet in meetings_data:
        meet["organization"] = org_name
        meet["created_date"] = now.isoformat()
        db.meetings.insert_one(meet)
    
    # ========== CREATE TASKS (AUFGABEN) ==========
    tasks_data = [
        {"title": "Jahresabschluss vorbereiten", "description": "Alle Belege für Steuerberater zusammenstellen", "status": "in_bearbeitung", "priority": "hoch", "due_date": (now + timedelta(days=14)).isoformat(), "assigned_to": "Sabine Weber"},
        {"title": "Mitgliedsbeiträge einziehen", "description": "Mahnungen für ausstehende Beiträge versenden", "status": "offen", "priority": "mittel", "due_date": (now + timedelta(days=7)).isoformat(), "assigned_to": "Sabine Weber"},
        {"title": "Einladung MV versenden", "description": "Einladungen zur Mitgliederversammlung per Post und E-Mail", "status": "offen", "priority": "hoch", "due_date": (now + timedelta(days=5)).isoformat(), "assigned_to": "Klaus Fischer"},
        {"title": "Wahlkampfmaterial bestellen", "description": "Flyer, Plakate und Kugelschreiber für Kommunalwahl", "status": "offen", "priority": "mittel", "due_date": (now + timedelta(days=30)).isoformat(), "assigned_to": "Maria Schmidt"},
        {"title": "Homepage aktualisieren", "description": "Termine und Pressemitteilungen aktualisieren", "status": "in_bearbeitung", "priority": "niedrig", "due_date": (now + timedelta(days=3)).isoformat(), "assigned_to": "Lisa Wagner"},
        {"title": "Raumreservierung Sommerfest", "description": "Stadtpark für Sommerfest 2026 reservieren", "status": "erledigt", "priority": "mittel", "due_date": (now - timedelta(days=10)).isoformat(), "assigned_to": "Thomas Müller"},
    ]
    
    for task in tasks_data:
        task["organization"] = org_name
        task["created_date"] = now.isoformat()
        db.tasks.insert_one(task)
    
    # ========== CREATE CAMPAIGNS (KAMPAGNEN) ==========
    campaigns_data = [
        {"name": "Kommunalwahl 2026", "description": "Wahlkampagne für die Kommunalwahl im September 2026", "start_date": (now + timedelta(days=60)).isoformat(), "end_date": (now + timedelta(days=240)).isoformat(), "budget": 15000.00, "status": "planung"},
        {"name": "Sommerfest 2026", "description": "Jährliches Sommerfest des Ortsvereins", "start_date": (now + timedelta(days=150)).isoformat(), "end_date": (now + timedelta(days=151)).isoformat(), "budget": 2500.00, "status": "planung"},
        {"name": "Mitgliederwerbung Q1", "description": "Kampagne zur Gewinnung neuer Mitglieder", "start_date": now.isoformat(), "end_date": (now + timedelta(days=90)).isoformat(), "budget": 1000.00, "status": "aktiv"},
    ]
    
    for camp in campaigns_data:
        camp["organization"] = org_name
        camp["created_date"] = now.isoformat()
        db.campaigns.insert_one(camp)
    
    # ========== CREATE DOCUMENTS (DOKUMENTE) ==========
    documents_data = [
        {"title": "Satzung SPD Ortsverband Neustadt", "type": "satzung", "content": "Satzung des SPD Ortsvereins Neustadt, beschlossen auf der MV am 15.03.2020"},
        {"title": "Geschäftsordnung Vorstand", "type": "geschaeftsordnung", "content": "Geschäftsordnung für die Arbeit des Vorstands"},
        {"title": "Protokoll MV 2024", "type": "protokoll", "content": "Protokoll der Mitgliederversammlung vom 18.11.2024"},
        {"title": "Haushaltsplan 2025", "type": "finanzen", "content": "Beschlossener Haushaltsplan für das Jahr 2025"},
        {"title": "Datenschutzkonzept", "type": "datenschutz", "content": "Datenschutzkonzept gemäß DSGVO"},
    ]
    
    for doc in documents_data:
        doc["organization"] = org_name
        doc["created_date"] = now.isoformat()
        db.documents.insert_one(doc)
    
    # ========== SUMMARY ==========
    summary = {
        "organization": org_name,
        "display_name": "SPD Ortsverband Neustadt",
        "members_created": len(members_data),
        "donors_created": len(donors_data),
        "mandate_levies_created": len(mandatstraeger) * 12,
        "incomes_created": len(incomes_data),
        "expenses_created": len(expenses_data),
        "meetings_created": len(meetings_data),
        "tasks_created": len(tasks_data),
        "campaigns_created": len(campaigns_data),
        "documents_created": len(documents_data),
        "login_email": "demo-verband@kommunalcrm.de",
        "login_password": "demo123"
    }
    
    return {"success": True, "message": "Umfangreiche Demo-Daten erstellt", "summary": summary}

# ============ FILE UPLOADS ============

@app.post("/api/files/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    content = await file.read()
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    return {
        "file_url": f"/api/uploads/{filename}",
        "file_name": file.filename,
        "content_type": file.content_type,
        "size": len(content),
    }

# ============ AI ENDPOINTS ============

class AIGenerateRequest(BaseModel):
    prompt: str
    context: Optional[str] = None

class AIEmailGenerateRequest(BaseModel):
    topic: str
    template_type: Optional[str] = None
    organization_name: Optional[str] = None

@app.post("/api/ai/generate-email")
async def generate_email(request: AIEmailGenerateRequest):
    """Generate bulk email content using AI"""
    from dotenv import load_dotenv
    load_dotenv()
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
        
        org_name = request.organization_name or "Ortsverband"
        
        system_message = f"""Du bist ein Assistent für eine deutsche politische Organisation ({org_name}).
Du erstellst professionelle E-Mails auf Deutsch.
Die E-Mails sollen:
- Einen passenden, prägnanten Betreff haben
- Einen freundlichen, professionellen Ton haben
- Ca. 150-250 Wörter im Body haben
- Mit "Mit freundlichen Grüßen,\nDer Vorstand" enden

WICHTIG: Gib die Antwort IMMER als valides JSON zurück mit exakt diesen Feldern:
{{"subject": "Betreff hier", "body": "E-Mail Text hier"}}"""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"email-{datetime.now().timestamp()}",
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=f"Erstelle eine E-Mail zum Thema: {request.topic}")
        response = await chat.send_message(user_message)
        
        # Try to parse JSON from response
        import json
        try:
            # Clean response - remove markdown code blocks if present
            clean_response = response.strip()
            if clean_response.startswith("```json"):
                clean_response = clean_response[7:]
            if clean_response.startswith("```"):
                clean_response = clean_response[3:]
            if clean_response.endswith("```"):
                clean_response = clean_response[:-3]
            clean_response = clean_response.strip()
            
            result = json.loads(clean_response)
            return {"subject": result.get("subject", ""), "body": result.get("body", ""), "success": True}
        except json.JSONDecodeError:
            # If JSON parsing fails, try to extract subject and body from text
            lines = response.strip().split("\n")
            subject = ""
            body = response
            for i, line in enumerate(lines):
                if line.lower().startswith("betreff:"):
                    subject = line.replace("Betreff:", "").replace("betreff:", "").strip()
                    body = "\n".join(lines[i+1:]).strip()
                    break
            return {"subject": subject, "body": body, "success": True}
            
    except ImportError:
        raise HTTPException(status_code=500, detail="emergentintegrations not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AITextGenerateRequest(BaseModel):
    prompt: str
    system_message: Optional[str] = None
    task_type: Optional[str] = "general"  # motion, meeting, document, etc.

@app.post("/api/ai/generate-text")
async def generate_text(request: AITextGenerateRequest):
    """Generic AI text generation endpoint"""
    from dotenv import load_dotenv
    load_dotenv()
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
        
        # Default system messages for different tasks
        default_systems = {
            "motion": "Du bist ein erfahrener Kommunalpolitiker einer deutschen Fraktion. Du erstellst professionelle Anträge, Anfragen und Resolutionen für kommunale Gremien. Verwende eine sachliche, professionelle Sprache.",
            "meeting": "Du bist ein erfahrener Fraktionsgeschäftsführer. Du erstellst professionelle Tagesordnungen und Protokolle für Fraktionssitzungen.",
            "document": "Du bist ein professioneller Dokumentenanalyst. Du analysierst und fasst Dokumente zusammen.",
            "general": "Du bist ein hilfreicher Assistent für eine deutsche politische Organisation."
        }
        
        system_msg = request.system_message or default_systems.get(request.task_type, default_systems["general"])
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"text-{datetime.now().timestamp()}",
            system_message=system_msg
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=request.prompt)
        response = await chat.send_message(user_message)
        
        return {"content": response, "success": True}
    except ImportError:
        raise HTTPException(status_code=500, detail="emergentintegrations not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AINoticeGenerateRequest(BaseModel):
    prompt: str
    levy_data: Optional[dict] = None
    organization_data: Optional[dict] = None

@app.post("/api/ai/generate-notice")
async def generate_notice(request: AINoticeGenerateRequest):
    """Generate levy notice/Gebührenbescheid using AI"""
    from dotenv import load_dotenv
    load_dotenv()
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
        
        system_message = """Du bist ein erfahrener Verwaltungsangestellter einer deutschen politischen Partei.
Du erstellst professionelle, formelle Gebührenbescheide für Mandatsträgerabgaben.
Der Bescheid soll:
- Als formeller Geschäftsbrief formatiert sein
- Absender oben links, Datum oben rechts, Empfänger darunter
- Alle relevanten Abrechnungsdaten übersichtlich darstellen
- Höflich aber bestimmt formuliert sein
- Eine klare Zahlungsaufforderung mit Frist enthalten
- Mit einer Grußformel enden"""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"notice-{datetime.now().timestamp()}",
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=request.prompt)
        response = await chat.send_message(user_message)
        
        return {"content": response, "success": True}
    except ImportError:
        raise HTTPException(status_code=500, detail="emergentintegrations not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/generate-protocol")
async def generate_protocol(request: AIGenerateRequest):
    """Generate meeting protocol using AI"""
    from dotenv import load_dotenv
    load_dotenv()
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
        
        system_message = """Du bist ein erfahrener Protokollführer für politische Gremien in Deutschland. 
Du erstellst professionelle, formelle Sitzungsprotokolle im deutschen Stil.
Verwende die korrekte Protokollstruktur mit:
- Kopfdaten (Datum, Zeit, Ort, Anwesende)
- Tagesordnungspunkte
- Beschlüsse und Abstimmungsergebnisse
- Unterschriftszeilen"""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"protocol-{datetime.now().timestamp()}",
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=request.prompt)
        response = await chat.send_message(user_message)
        
        return {"content": response, "success": True}
    except ImportError:
        raise HTTPException(status_code=500, detail="emergentintegrations not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/generate-invitation")
async def generate_invitation(request: AIGenerateRequest):
    """Generate meeting invitation using AI"""
    from dotenv import load_dotenv
    load_dotenv()
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
        
        system_message = """Du bist ein erfahrener Geschäftsführer einer politischen Fraktion in Deutschland.
Du erstellst professionelle, förmliche Einladungen zu Fraktionssitzungen.
Die Einladungen sollen:
- Höflich und professionell sein
- Alle relevanten Informationen enthalten (Datum, Zeit, Ort, Tagesordnung)
- Eine klare Struktur haben
- Mit einer passenden Anrede beginnen und einer Grußformel enden"""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"invitation-{datetime.now().timestamp()}",
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=request.prompt)
        response = await chat.send_message(user_message)
        
        return {"content": response, "success": True}
    except ImportError:
        raise HTTPException(status_code=500, detail="emergentintegrations not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ EMAIL ENDPOINTS ============

class SendEmailRequest(BaseModel):
    to: List[str]
    subject: str
    body: str
    attachment_base64: Optional[str] = None
    attachment_filename: Optional[str] = None

@app.post("/api/email/send-invitation")
async def send_invitation_email(request: SendEmailRequest):
    """Send invitation email (simulated - in production use SendGrid/SES)"""
    # In production, integrate with SendGrid, AWS SES, or similar
    # For now, we'll simulate successful sending and log the email
    
    email_log = {
        "to": request.to,
        "subject": request.subject,
        "body_preview": request.body[:200] if request.body else "",
        "has_attachment": bool(request.attachment_base64),
        "attachment_filename": request.attachment_filename,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "status": "simulated"  # In production: "sent" or "failed"
    }
    
    # Store email log
    db.email_logs.insert_one(email_log)
    
    return {
        "success": True, 
        "message": f"Einladung an {len(request.to)} Empfänger gesendet (Simulation)",
        "recipients": request.to
    }

# ============ PDF GENERATION ============

@app.post("/api/pdf/generate-invitation")
async def generate_invitation_pdf(data: dict):
    """Generate PDF invitation (returns HTML for client-side PDF generation)"""
    # Return structured data for client-side PDF generation with jspdf
    html_content = f"""
    <div style="font-family: Arial, sans-serif; padding: 40px;">
        <div style="text-align: right; margin-bottom: 30px;">
            <p>{data.get('organization_name', 'Organisation')}</p>
            <p>{data.get('organization_address', '')}</p>
            <p>{datetime.now().strftime('%d.%m.%Y')}</p>
        </div>
        
        <h1 style="font-size: 18px; margin-bottom: 20px;">
            Einladung zur {data.get('title', 'Fraktionssitzung')}
        </h1>
        
        <p><strong>Datum:</strong> {data.get('date', '')}</p>
        <p><strong>Ort:</strong> {data.get('location', '')}</p>
        
        <h2 style="font-size: 14px; margin-top: 20px;">Tagesordnung:</h2>
        <pre style="white-space: pre-wrap;">{data.get('agenda', '')}</pre>
        
        <div style="margin-top: 30px;">
            {data.get('invitation_text', '')}
        </div>
        
        <div style="margin-top: 40px;">
            <p>Mit freundlichen Grüßen</p>
            <p>{data.get('sender_name', '')}</p>
        </div>
    </div>
    """
    
    return {
        "html": html_content,
        "title": data.get('title', 'Einladung'),
        "filename": f"Einladung_{data.get('title', 'Sitzung').replace(' ', '_')}.pdf"
    }

@app.post("/api/pdf/generate-protocol")
async def generate_protocol_pdf(data: dict):
    """Generate PDF protocol (returns HTML for client-side PDF generation)"""
    html_content = f"""
    <div style="font-family: Arial, sans-serif; padding: 40px;">
        <h1 style="font-size: 20px; text-align: center; margin-bottom: 30px;">
            PROTOKOLL
        </h1>
        
        <h2 style="font-size: 16px;">{data.get('title', 'Fraktionssitzung')}</h2>
        
        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; width: 30%;"><strong>Datum:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{data.get('date', '')}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Ort:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{data.get('location', '')}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Anwesend:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{', '.join(data.get('attendees', []))}</td>
            </tr>
        </table>
        
        <h3 style="font-size: 14px;">Tagesordnung:</h3>
        <pre style="white-space: pre-wrap; background: #f5f5f5; padding: 15px;">{data.get('agenda', '')}</pre>
        
        <h3 style="font-size: 14px; margin-top: 20px;">Protokoll:</h3>
        <div style="white-space: pre-wrap;">{data.get('protocol', '')}</div>
        
        <div style="margin-top: 50px; display: flex; justify-content: space-between;">
            <div style="width: 45%;">
                <p>_________________________</p>
                <p>Protokollführer/in</p>
            </div>
            <div style="width: 45%;">
                <p>_________________________</p>
                <p>Sitzungsleiter/in</p>
            </div>
        </div>
    </div>
    """
    
    return {
        "html": html_content,
        "title": data.get('title', 'Protokoll'),
        "filename": f"Protokoll_{data.get('title', 'Sitzung').replace(' ', '_')}.pdf"
    }

