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

# ============ AI ENDPOINTS ============

class AIGenerateRequest(BaseModel):
    prompt: str
    context: Optional[str] = None

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
        ).with_model("openai", "gpt-4o")
        
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
        ).with_model("openai", "gpt-4o")
        
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

