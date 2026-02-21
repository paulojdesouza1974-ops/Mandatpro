from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from dotenv import load_dotenv
import os
import uuid
import base64
import mimetypes
import logging
import threading
import time
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path
from pymongo import MongoClient
import secrets
import hashlib

# SendGrid import
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False

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
    role: Optional[str] = "member"

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

def extract_token(authorization_header: Optional[str] = None, authorization_query: Optional[str] = None):
    raw = authorization_header or authorization_query
    if not raw:
        return None
    return raw.replace("Bearer ", "") if raw.startswith("Bearer ") else raw

def store_token(token: str, user_id: str):
    tokens[token] = user_id
    db.auth_tokens.update_one(
        {"token": token},
        {
            "$set": {
                "token": token,
                "user_id": user_id,
                "created_date": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
    )

def get_user_id_from_token(token: str | None):
    if not token:
        return None
    user_id = tokens.get(token)
    if user_id:
        return user_id
    doc = db.auth_tokens.find_one({"token": token})
    if doc:
        tokens[token] = doc.get("user_id")
        return doc.get("user_id")
    return None

def create_token(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    store_token(token, user_id)
    return token

def revoke_token(token: str | None):
    if not token:
        return
    tokens.pop(token, None)
    db.auth_tokens.delete_one({"token": token})

def get_current_user(token: str | None = None):
    if not token:
        return None
    user_id = get_user_id_from_token(token)
    if not user_id:
        return None
    user = db.users.find_one({"_id": ObjectId(user_id)})
    return serialize_doc(user) if user else None

logger = logging.getLogger("kommunalcrm")
reminder_scheduler_started = False

def get_openai_key():
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
    return api_key


def raise_llm_error(error: Exception):
    detail = str(error)
    if "quota" in detail.lower() or "ratelimit" in detail.lower():
        raise HTTPException(
            status_code=429,
            detail="LLM-Kontingent überschritten. Bitte Guthaben/Plan prüfen.",
        )
    raise HTTPException(status_code=500, detail=detail)

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

    email_domain = None
    if user.email and "@" in user.email:
        email_domain = user.email.split("@")[-1].lower()

    existing_org_by_domain = db.organizations.find_one({"email_domain": email_domain}) if email_domain else None

    if existing_org_by_domain:
        org_slug = existing_org_by_domain.get("name")
        org_type = existing_org_by_domain.get("type") or user.org_type
        display_name = existing_org_by_domain.get("display_name") or user.organization
    else:
        org_slug = user.organization.lower().replace(" ", "-").replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss") if user.organization else f"org-{datetime.now().timestamp()}"
        display_name = user.organization
        org_type = user.org_type

    existing_org = db.organizations.find_one({"name": org_slug})
    if not existing_org:
        org_doc = {
            "name": org_slug,
            "display_name": display_name,
            "type": org_type,
            "city": user.city,
            "email_domain": email_domain,
            "created_date": datetime.now(timezone.utc).isoformat()
        }
        db.organizations.insert_one(org_doc)

    user_doc = {
        "email": user.email,
        "password": hash_password(user.password),
        "full_name": user.full_name,
        "city": user.city,
        "organization": org_slug,
        "org_type": org_type,
        "role": user.role or "member",
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
async def get_me(
    authorization: str = Header(None),
    authorization_query: Optional[str] = Query(None, alias="authorization"),
):
    token = extract_token(authorization, authorization_query)
    user = get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if "password" in user:
        del user["password"]
    return user

@app.put("/api/auth/me")
async def update_me(
    data: dict,
    authorization: str = Header(None),
    authorization_query: Optional[str] = Query(None, alias="authorization"),
):
    token = extract_token(authorization, authorization_query)
    user_id = get_user_id_from_token(token)
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
async def logout(
    authorization: str = Header(None),
    authorization_query: Optional[str] = Query(None, alias="authorization"),
):
    token = extract_token(authorization, authorization_query)
    revoke_token(token)
    return {"success": True}

# ============ GENERIC CRUD ENDPOINTS ============

def create_crud_routes(collection_name: str, entity_name: str):
    """Create CRUD routes for an entity"""
    
    @app.get(f"/api/{collection_name}")
    async def list_items(organization: Optional[str] = None, name: Optional[str] = None, sort: Optional[str] = "-created_date", limit: Optional[int] = 100):
        query = {}
        if organization:
            query["organization"] = organization
        if name:
            query["name"] = name
        
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


# ============ Organization Members Management ============
@app.get("/api/organizations/{org_name}/members")
async def get_organization_members(org_name: str):
    """Get all members (users) of an organization"""
    docs = list(db.users.find({"organization": org_name}))
    result = serialize_docs(docs)
    for doc in result:
        if "password" in doc:
            del doc["password"]
    return result


class RoleUpdateRequest(BaseModel):
    org_role: str


@app.put("/api/users/{user_id}/role")
async def update_user_role(user_id: str, request: RoleUpdateRequest):
    """Update the org_role of a specific user"""
    result = db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"org_role": request.org_role, "updated_date": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    doc = db.users.find_one({"_id": ObjectId(user_id)})
    serialized = serialize_doc(doc)
    if "password" in serialized:
        del serialized["password"]
    return serialized

# Health check
@app.get("/api/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Seed endpoints disabled - production mode
# Original seed-demo and seed-full-demo endpoints are no longer needed
# Users should register directly with their organizations

@app.post("/api/seed-demo")
async def seed_demo():
    """DEPRECATED - Demo functionality removed"""
    return {"success": False, "message": "Demo-Modus deaktiviert. Bitte registrieren Sie sich."}


@app.post("/api/seed-full-demo")
async def seed_full_demo():
    """DEPRECATED - Demo functionality removed"""
    return {"success": False, "message": "Demo-Modus deaktiviert. Bitte registrieren Sie sich."}


# ============ GLOBAL SEARCH ============

@app.get("/api/search")
async def global_search(q: str, organization: str):
    if not q:
        return {"results": []}

    regex = {"$regex": q, "$options": "i"}
    results = []

    def add_results(collection, type_label, fields, title_field, subtitle_field=None):
        query = {"organization": organization, "$or": [{field: regex} for field in fields]}
        docs = list(db[collection].find(query).limit(10))
        for doc in docs:
            title = str(doc.get(title_field, "")) if title_field else ""
            subtitle = str(doc.get(subtitle_field, "")) if subtitle_field else ""
            results.append({
                "type": type_label,
                "id": str(doc.get("_id")),
                "title": title,
                "subtitle": subtitle,
            })

    add_results("contacts", "contact", ["first_name", "last_name", "email", "phone"], "first_name", "last_name")
    add_results("users", "member", ["full_name", "email", "city"], "full_name", "email")
    add_results("motions", "motion", ["title", "body", "summary"], "title", "status")
    add_results("meetings", "meeting", ["title", "location"], "title", "date")
    add_results("fraction_meetings", "fraction_meeting", ["title", "agenda"], "title", "date")
    add_results("documents", "document", ["title", "description", "tags"], "title", "category")
    add_results("incomes", "income", ["description", "source", "notes"], "description", "category")
    add_results("expenses", "expense", ["description", "vendor", "notes"], "description", "category")
    add_results("mandate_levies", "mandate_levy", ["contact_name", "mandate_type"], "contact_name", "period_month")
    add_results("print_templates", "template", ["name", "description"], "name", "document_type")
    add_results("tasks", "task", ["title", "description"], "title", "status")

    return {"results": results}

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


# ============ FILE HELPERS ============

def resolve_upload_path(file_url: str) -> str:
    if not file_url:
        raise HTTPException(status_code=400, detail="file_url is required")
    if "/api/uploads/" in file_url:
        filename = file_url.split("/api/uploads/")[1]
    else:
        raise HTTPException(status_code=400, detail="Invalid file_url")
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return file_path


def load_file_images(file_url: str, max_pages: int = 2):
    file_path = resolve_upload_path(file_url)
    mime_type, _ = mimetypes.guess_type(file_path)

    if mime_type == "application/pdf":
        try:
            import fitz  # PyMuPDF
        except ImportError as exc:
            raise HTTPException(status_code=500, detail="PyMuPDF not installed for PDF processing") from exc
        images = []
        doc = fitz.open(file_path)
        for page_index in range(min(len(doc), max_pages)):
            page = doc.load_page(page_index)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img_bytes = pix.tobytes("png")
            images.append(("image/png", base64.b64encode(img_bytes).decode()))
        doc.close()
        if not images:
            raise HTTPException(status_code=400, detail="PDF contains no renderable pages")
        return images

    with open(file_path, "rb") as file:
        data = file.read()

    if mime_type not in {"image/png", "image/jpeg", "image/webp"}:
        try:
            from PIL import Image
        except ImportError as exc:
            raise HTTPException(status_code=500, detail="Pillow not installed for image conversion") from exc
        image = Image.open(file_path)
        from io import BytesIO
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        data = buffer.getvalue()
        mime_type = "image/png"

    return [(mime_type, base64.b64encode(data).decode())]


def parse_json_response(response_text: str):
    import json
    if not response_text:
        return None
    clean = response_text.strip()
    if clean.startswith("```json"):
        clean = clean[7:]
    if clean.startswith("```"):
        clean = clean[3:]
    if clean.endswith("```"):
        clean = clean[:-3]
    clean = clean.strip()
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        return {"raw": response_text}


async def run_vision_chat(prompt: str, system_message: str, images):
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

    api_key = get_openai_key()
    chat = LlmChat(
        api_key=api_key,
        session_id=f"vision-{datetime.now().timestamp()}",
        system_message=system_message,
    ).with_model("openai", "gpt-4o")

    file_contents = [ImageContent(image_base64=b64) for _, b64 in images]
    try:
        response = await chat.send_message(UserMessage(text=prompt, file_contents=file_contents))
    except Exception as exc:
        raise_llm_error(exc)
    return response


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
        
        api_key = get_openai_key()
        
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
        ).with_model("openai", "gpt-4o")
        
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
        raise_llm_error(e)

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
        
        api_key = get_openai_key()
        
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
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=request.prompt)
        response = await chat.send_message(user_message)
        
        return {"content": response, "success": True}
    except ImportError:
        raise HTTPException(status_code=500, detail="emergentintegrations not installed")
    except Exception as e:
        raise_llm_error(e)

class AIReceiptScanRequest(BaseModel):
    file_url: str
    organization: Optional[str] = None


@app.post("/api/ai/scan-receipt")
async def scan_receipt(request: AIReceiptScanRequest):
    images = load_file_images(request.file_url)

    system_message = (
        "Du bist ein Buchhaltungsassistent. Extrahiere die wichtigsten Daten aus einem Beleg. "
        "Gib NUR valides JSON zurück, ohne zusätzliche Texte."
    )

    prompt = (
        "Analysiere den Beleg und extrahiere folgende Felder als JSON:\n"
        "- description: kurze Beschreibung des Belegs\n"
        "- vendor: Name des Ausstellers/Lieferanten\n"
        "- amount: Betrag als Zahl (nur die Zahl, kein EUR-Zeichen)\n"
        "- date: Datum im Format YYYY-MM-DD\n"
        "- transaction_type: entweder \"einnahme\" oder \"ausgabe\"\n"
        "- category: passende Kategorie (einnahme: mitgliedsbeitrag, spende, veranstaltung, zuschuss, sonstiges; ausgabe: personal, raummiete, material, marketing, verwaltung, sonstiges)\n"
        "- notes: weitere relevante Informationen\n\n"
        "Antworte NUR mit JSON."
    )

    response = await run_vision_chat(prompt, system_message, images)
    data = parse_json_response(response)
    return {"success": True, "data": data}


class AIBankStatementScanRequest(BaseModel):
    file_url: str
    organization: str


@app.post("/api/ai/scan-bank-statement")
async def scan_bank_statement(request: AIBankStatementScanRequest):
    images = load_file_images(request.file_url, max_pages=3)

    contacts = list(db.contacts.find({"organization": request.organization}))
    mandate_levies = list(db.mandate_levies.find({"organization": request.organization}))

    contact_names = [f"{c.get('first_name','')} {c.get('last_name','')}".strip() for c in contacts]
    contact_names = [name for name in contact_names if name]
    mandate_names = list({m.get("contact_name") for m in mandate_levies if m.get("contact_name")})

    contact_hint = ", ".join(contact_names[:50])
    mandate_hint = ", ".join(mandate_names[:50])

    system_message = (
        "Du bist ein erfahrener Buchhalter. Du erkennst Transaktionen in deutschen Kontoauszügen. "
        "Gib NUR valides JSON zurück, ohne zusätzliche Texte."
    )

    prompt = (
        f"Analysiere den Kontoauszug und extrahiere ALLE Transaktionen.\n\n"
        f"Bekannte Kontakte der Organisation: {contact_hint or 'Keine'}\n"
        f"Bekannte Mandatsträger: {mandate_hint or 'Keine'}\n\n"
        "Für jede Transaktion liefere diese Felder:\n"
        "- description: Beschreibung/Verwendungszweck\n"
        "- sender_receiver: Name des Auftraggebers oder Empfängers\n"
        "- amount: Betrag als positive Zahl\n"
        "- date: Datum im Format YYYY-MM-DD\n"
        "- transaction_type: \"einnahme\" oder \"ausgabe\"\n"
        "- category: klassifiziere automatisch:\n"
        "  * \"mitgliedsbeitrag\" bei Mitgliedsbeitrag/Beitrag\n"
        "  * \"spende\" bei Spende/Spendeneingang\n"
        "  * \"mandatsabgabe\" bei Mandatsträgerabgabe/Fraktionsabgabe\n"
        "  * \"zuschuss\" bei Zuschuss/Förderung\n"
        "  * \"veranstaltung\" bei Veranstaltungsbezug\n"
        "  * \"personal\" bei Lohn/Gehalt/Honorar\n"
        "  * \"raummiete\" bei Miete\n"
        "  * \"material\" bei Materialeinkauf\n"
        "  * \"marketing\" bei Werbung/Drucksachen\n"
        "  * \"verwaltung\" bei Bankgebühren/Versicherung/Verwaltungskosten\n"
        "  * sonst \"sonstiges\"\n"
        "- matched_contact: Name des passenden Kontakts falls erkennbar\n"
        "- matched_mandate: Name des Mandatsträgers falls erkennbar\n"
        "- confidence: \"hoch\", \"mittel\" oder \"niedrig\"\n\n"
        "Antworte ausschließlich als JSON im Format:\n"
        "{\"transactions\": [ ... ]}"
    )

    response = await run_vision_chat(prompt, system_message, images)
    data = parse_json_response(response) or {}
    transactions = []
    if isinstance(data, dict):
        transactions = data.get("transactions") or []
    if not isinstance(transactions, list):
        transactions = []

    return {"success": True, "transactions": transactions}

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
        
        api_key = get_openai_key()
        
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
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=request.prompt)
        response = await chat.send_message(user_message)
        
        return {"content": response, "success": True}
    except ImportError:
        raise HTTPException(status_code=500, detail="emergentintegrations not installed")
    except Exception as e:
        raise_llm_error(e)

@app.post("/api/ai/generate-protocol")
async def generate_protocol(request: AIGenerateRequest):
    """Generate meeting protocol using AI"""
    from dotenv import load_dotenv
    load_dotenv()
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = get_openai_key()
        
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
        raise_llm_error(e)

@app.post("/api/ai/generate-invitation")
async def generate_invitation(request: AIGenerateRequest):
    """Generate meeting invitation using AI"""
    from dotenv import load_dotenv
    load_dotenv()
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = get_openai_key()
        
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
        raise_llm_error(e)

# ============ DATEV PLACEHOLDER ============

@app.get("/api/datev/status")
async def datev_status():
    return {
        "status": "placeholder",
        "message": "DATEVconnect online Integration ist in Vorbereitung.",
    }

# ============ SMTP HELPERS ============

def get_org_smtp_settings(organization: str):
    org = db.organizations.find_one({"name": organization})
    if not org:
        raise HTTPException(status_code=404, detail="Organisation nicht gefunden")

    smtp_fields = ["smtp_host", "smtp_port", "smtp_username", "smtp_password", "smtp_from_email"]
    missing = [field for field in smtp_fields if not org.get(field)]
    if missing:
        raise HTTPException(status_code=400, detail="SMTP-Konfiguration unvollständig")

    return {
        "host": org.get("smtp_host"),
        "port": int(org.get("smtp_port")),
        "username": org.get("smtp_username"),
        "password": org.get("smtp_password"),
        "from_email": org.get("smtp_from_email"),
        "from_name": org.get("smtp_from_name") or org.get("display_name") or "KommunalCRM",
    }


def send_smtp_email(settings: dict, to_list: List[str], subject: str, body: str, attachment_base64: Optional[str] = None, attachment_filename: Optional[str] = None):
    message = MIMEMultipart()
    message["From"] = f"{settings['from_name']} <{settings['from_email']}>"
    message["To"] = ", ".join(to_list)
    message["Subject"] = subject

    message.attach(MIMEText(body or "", "plain"))

    if attachment_base64 and attachment_filename:
        part = MIMEBase("application", "octet-stream")
        part.set_payload(base64.b64decode(attachment_base64))
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f"attachment; filename={attachment_filename}")
        message.attach(part)

    context = ssl.create_default_context()
    with smtplib.SMTP(settings["host"], settings["port"]) as server:
        server.starttls(context=context)
        server.login(settings["username"], settings["password"])
        server.sendmail(settings["from_email"], to_list, message.as_string())


# ============ EMAIL ENDPOINTS ============

class SendEmailRequest(BaseModel):
    to: List[str]
    subject: str
    body: str
    attachment_base64: Optional[str] = None
    attachment_filename: Optional[str] = None


def send_email_via_sendgrid(to_list: List[str], subject: str, body: str, from_email: str = None, from_name: str = None):
    """Send email using SendGrid API"""
    sendgrid_key = os.environ.get("SENDGRID_API_KEY")
    
    if not sendgrid_key or not SENDGRID_AVAILABLE:
        raise Exception("SendGrid nicht konfiguriert. Bitte SENDGRID_API_KEY in .env setzen.")
    
    # SendGrid requires verified sender - always use the verified sender email
    # Organization's smtp_from_email may not be verified in SendGrid
    VERIFIED_SENDER = "info@mandatpro.de"
    sender = VERIFIED_SENDER
    
    # Use from_name from organization if provided, otherwise use a default
    display_name = from_name if from_name else "KommunalCRM"
    
    for recipient in to_list:
        # Use tuple format for from_email to include display name
        message = Mail(
            from_email=(sender, display_name),
            to_emails=recipient,
            subject=subject,
            html_content=f"<pre style='font-family: Arial, sans-serif;'>{body}</pre>"
        )
        try:
            sg = SendGridAPIClient(sendgrid_key)
            response = sg.send(message)
            logger.info(f"SendGrid email sent to {recipient}: {response.status_code}")
        except Exception as e:
            logger.error(f"SendGrid error for {recipient}: {type(e).__name__}: {e}")
            raise


@app.post("/api/email/send-invitation")
async def send_invitation_email(request: SendEmailRequest, authorization: str = Header(None)):
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    organization = user.get("organization")
    if not organization:
        raise HTTPException(status_code=400, detail="Organization missing")

    try:
        # Try SendGrid first (if configured), then fall back to SMTP
        sendgrid_key = os.environ.get("SENDGRID_API_KEY")
        if sendgrid_key and SENDGRID_AVAILABLE:
            org_data = db.organizations.find_one({"name": organization})
            from_email = org_data.get("smtp_from_email") if org_data else None
            from_name = org_data.get("smtp_from_name") if org_data else None
            send_email_via_sendgrid(
                to_list=request.to,
                subject=request.subject,
                body=request.body,
                from_email=from_email,
                from_name=from_name
            )
        else:
            # Fall back to SMTP
            settings = get_org_smtp_settings(organization)
            send_smtp_email(
                settings=settings,
                to_list=request.to,
                subject=request.subject,
                body=request.body,
                attachment_base64=request.attachment_base64,
                attachment_filename=request.attachment_filename,
            )
        status = "sent"
        message = f"Einladung an {len(request.to)} Empfänger gesendet"
    except Exception as exc:
        status = "failed"
        message = f"E-Mail Versand fehlgeschlagen: {exc}"

    email_log = {
        "to": request.to,
        "subject": request.subject,
        "body_preview": request.body[:200] if request.body else "",
        "has_attachment": bool(request.attachment_base64),
        "attachment_filename": request.attachment_filename,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "organization": organization,
    }
    db.email_logs.insert_one(email_log)

    if status == "failed":
        raise HTTPException(status_code=500, detail=message)

    return {
        "success": True,
        "message": message,
        "recipients": request.to,
    }

class ReminderSendRequest(BaseModel):
    meeting_id: str
    meeting_type: Optional[str] = "meeting"


def collect_org_recipients(organization: str):
    emails = set()
    for user in db.users.find({"organization": organization}):
        if user.get("email"):
            emails.add(user["email"])
    for contact in db.contacts.find({"organization": organization}):
        if contact.get("email"):
            emails.add(contact["email"])
    return list(emails)


def build_meeting_reminder_body(meeting: dict, meeting_type: str):
    title = meeting.get("title", "Sitzung")
    date_value = meeting.get("date", "")
    location = meeting.get("location", "")
    return (
        f"Erinnerung an die bevorstehende Sitzung:\n\n"
        f"Titel: {title}\n"
        f"Datum: {date_value}\n"
        f"Ort: {location or 'n/a'}\n\n"
        "Bitte berücksichtigen Sie die aktuellen Unterlagen in KommunalCRM."
    )


def send_meeting_reminder(organization: str, meeting: dict, meeting_type: str):
    recipients = collect_org_recipients(organization)
    if not recipients:
        return 0

    settings = get_org_smtp_settings(organization)
    subject = f"Erinnerung: {meeting.get('title', 'Sitzung')}"
    body = build_meeting_reminder_body(meeting, meeting_type)
    send_smtp_email(settings, recipients, subject, body)
    return len(recipients)


@app.post("/api/reminders/send-now")
async def send_reminder_now(request: ReminderSendRequest):
    collection = "meetings" if request.meeting_type == "meeting" else "fraction_meetings"
    meeting = db[collection].find_one({"_id": ObjectId(request.meeting_id)})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    organization = meeting.get("organization")
    if not organization:
        raise HTTPException(status_code=400, detail="Organization missing")

    count = send_meeting_reminder(organization, meeting, request.meeting_type)
    db[collection].update_one({"_id": meeting["_id"]}, {"$set": {"reminder_sent": True, "reminder_sent_date": datetime.now(timezone.utc).isoformat()}})

    return {"success": True, "recipients": count}


def send_due_reminders():
    now = datetime.now(timezone.utc)
    window = now + timedelta(hours=24)
    start = now.isoformat()
    end = window.isoformat()

    for collection_name in ["meetings", "fraction_meetings"]:
        meetings = db[collection_name].find({"date": {"$gte": start, "$lte": end}, "reminder_sent": {"$ne": True}})
        for meeting in meetings:
            organization = meeting.get("organization")
            if not organization:
                continue
            try:
                send_meeting_reminder(organization, meeting, "meeting" if collection_name == "meetings" else "fraction_meeting")
                db[collection_name].update_one({"_id": meeting["_id"]}, {"$set": {"reminder_sent": True, "reminder_sent_date": datetime.now(timezone.utc).isoformat()}})
            except Exception as exc:
                logger.error("Reminder send failed: %s", exc)


def start_reminder_scheduler():
    global reminder_scheduler_started
    if reminder_scheduler_started:
        return
    reminder_scheduler_started = True

    def loop():
        while True:
            try:
                send_due_reminders()
            except Exception as exc:
                logger.error("Reminder scheduler error: %s", exc)
            time.sleep(3600)

    thread = threading.Thread(target=loop, daemon=True)
    thread.start()


@app.on_event("startup")
async def schedule_reminders_on_startup():
    start_reminder_scheduler()


class SmtpTestRequest(BaseModel):
    organization: str
    test_email: str


@app.post("/api/smtp/test")
async def test_smtp_connection(request: SmtpTestRequest):
    """Test SMTP connection by sending a test email"""
    try:
        settings = get_org_smtp_settings(request.organization)
        
        # Try to connect and send a test email
        subject = "KommunalCRM - SMTP Test"
        body = f"""Dies ist eine Test-E-Mail von KommunalCRM.
        
Wenn Sie diese Nachricht erhalten, funktioniert Ihre SMTP-Konfiguration korrekt.

Zeitstempel: {datetime.now(timezone.utc).strftime('%d.%m.%Y %H:%M:%S')} UTC
Organisation: {request.organization}

Mit freundlichen Grüßen,
KommunalCRM System"""
        
        send_smtp_email(settings, [request.test_email], subject, body)
        
        return {
            "success": True,
            "message": f"Test-E-Mail erfolgreich an {request.test_email} gesendet"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error("SMTP test failed: %s", str(e))
        raise HTTPException(status_code=500, detail=f"SMTP-Test fehlgeschlagen: {str(e)}")

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

