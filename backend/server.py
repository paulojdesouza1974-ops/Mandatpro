from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime, timezone
from bson import ObjectId
import os
from pymongo import MongoClient
import secrets
import hashlib

# MongoDB setup
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "kommunalcrm")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="KommunalCRM API", version="1.0.0")

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
    
    user_doc = {
        "email": user.email,
        "password": hash_password(user.password),
        "full_name": user.full_name,
        "city": user.city,
        "organization": user.organization,
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
async def get_me(authorization: str = None):
    from fastapi import Header
    # Get token from query or header
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if "password" in user:
        del user["password"]
    return user

@app.post("/api/auth/logout")
async def logout(authorization: str = None):
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
        del data["_id"] if "_id" in data else None
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
    """Seed demo data for testing"""
    # Create demo user if not exists
    if not db.users.find_one({"email": "demo@kommunalcrm.de"}):
        demo_user = {
            "email": "demo@kommunalcrm.de",
            "password": hash_password("demo123"),
            "full_name": "Max Mustermann",
            "city": "Musterstadt",
            "organization": "demo-org",
            "org_type": "fraktion",
            "role": "admin",
            "created_date": datetime.now(timezone.utc).isoformat()
        }
        db.users.insert_one(demo_user)
    
    # Create demo organization if not exists
    if not db.organizations.find_one({"name": "demo-org"}):
        demo_org = {
            "name": "demo-org",
            "display_name": "SPD Fraktion Musterstadt",
            "type": "fraktion",
            "city": "Musterstadt",
            "state": "Bayern",
            "created_date": datetime.now(timezone.utc).isoformat()
        }
        db.organizations.insert_one(demo_org)
    
    return {"success": True, "message": "Demo data seeded"}
