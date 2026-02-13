from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Query, Request, WebSocket, WebSocketDisconnect # Final Reload 4
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
try:
    from .mock_db import AsyncMockClient
except ImportError:
    from mock_db import AsyncMockClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
from jose import JWTError, jwt
import aiohttp
import base64
from io import BytesIO
from PIL import Image

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

UPLOAD_DIR = ROOT_DIR / "uploads"
AVATARS_DIR = UPLOAD_DIR / "avatars"
COVERS_DIR = UPLOAD_DIR / "covers"
LOGO_DIR = UPLOAD_DIR / "logo"
FAVS_DIR = UPLOAD_DIR / "favs"
OG_PREVIEW_DIR = UPLOAD_DIR / "files" / "og-preview"

# Ensure directories exist
for directory in [UPLOAD_DIR, AVATARS_DIR, COVERS_DIR, LOGO_DIR, FAVS_DIR, OG_PREVIEW_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
USE_MOCK_DB = os.getenv('USE_MOCK_DB', 'true').lower() == 'true'
DB_FILE_PATH = os.getenv('DB_FILE_PATH', 'local_db.json')

client = None
db = None

if USE_MOCK_DB:
    print(f"WARNING: Using Mock DB ({DB_FILE_PATH})")
    client = AsyncMockClient(DB_FILE_PATH)
    db = client[os.getenv('DB_NAME', 'my_local_db')]
else:
    try:
        # Try to connect to real Mongo
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=2000)
        # Force connection check
        client.server_info()
        print("Connected to MongoDB")
        db = client[os.getenv('DB_NAME', 'my_local_db')]
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        print(f"Falling back to Mock DB ({DB_FILE_PATH})")
        client = AsyncMockClient(DB_FILE_PATH)
        db = client[os.getenv('DB_NAME', 'my_local_db')]

app = FastAPI()
api_router = APIRouter(prefix="/api")

@app.websocket("/ws/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str):
    await manager.connect(websocket, username)
    try:
        while True:
            # Keep connection alive and wait for data (though we only send for now)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, username)
    except Exception as e:
        logger.error(f"WebSocket error for {username}: {e}")
        manager.disconnect(websocket, username)

@app.on_event("startup")
async def startup_db_check():
    # Ensure current developer has admin rights
    # We do it after db is initialized (line 69) and app is created (line 71)
    dev_email = "thedrumepic@gmail.com"
    try:
        await db.users.update_one(
            {"email": dev_email},
            {"$set": {"role": "admin"}}
        )
        print(f"Verified admin role for {dev_email}")
    except Exception as e:
        print(f"Startup check failed (DB might be empty yet): {e}")

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

security = HTTPBearer(auto_error=False)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("server.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ===== WebSocket Manager =====

class ConnectionManager:
    def __init__(self):
        # active_connections: Dict[username, List[WebSocket]]
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        if username not in self.active_connections:
            self.active_connections[username] = []
        self.active_connections[username].append(websocket)
        logger.info(f"WebSocket connected for username: {username}")

    def disconnect(self, websocket: WebSocket, username: str):
        if username in self.active_connections:
            if websocket in self.active_connections[username]:
                self.active_connections[username].remove(websocket)
            if not self.active_connections[username]:
                del self.active_connections[username]
        logger.info(f"WebSocket disconnected for username: {username}")

    async def notify_page_update(self, username: str, data: Optional[Dict[str, Any]] = None):
        if username in self.active_connections:
            for connection in self.active_connections[username]:
                try:
                    payload = {"type": "page_update"}
                    if data:
                        payload["data"] = data
                    await connection.send_json(payload)
                except Exception as e:
                    logger.error(f"Error sending WebSocket message to {username}: {e}")

manager = ConnectionManager()

# Helper to fetch full data (internal)
async def get_full_page_data_internal(username: str):
    page = await db.pages.find_one({"username": username}, {"_id": 0})
    if not page:
        return None
    
    blocks = await db.blocks.find({"page_id": page["id"]}, {"_id": 0}).sort("order", 1).to_list(100)
    events = await db.events.find({"page_id": page["id"]}, {"_id": 0}).to_list(100)
    showcases = await db.showcases.find({"page_id": page["id"]}, {"_id": 0}).to_list(100)
    
    # Inject user's global analytics IDs
    user = await db.users.find_one({"id": page["user_id"]})
    analytics = {}
    if user:
        if user.get("ga_pixel_id"):
             analytics["ga_pixel_id"] = user.get("ga_pixel_id")
        if user.get("fb_pixel_id"):
             analytics["fb_pixel_id"] = user.get("fb_pixel_id")

    return {
        "page": page,
        "blocks": blocks,
        "events": events,
        "showcases": showcases,
        "analytics": analytics
    }

# Helpers to broadcast fresh data to connected clients
async def broadcast_page_update(username: str):
    data = await get_full_page_data_internal(username)
    if data:
        await manager.notify_page_update(username, data)

async def broadcast_by_page_id(page_id: str):
    page = await db.pages.find_one({"id": page_id}, {"username": 1})
    if page and "username" in page:
        await broadcast_page_update(page["username"])

# ===== Models =====

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None
    role: str = "user"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    username: Optional[str] = None
    role: str = "user"

class GlobalSettings(BaseModel):
    welcome_modal_duration: int = 10  # in seconds (1-60)


class PageCreate(BaseModel):
    username: str
    name: str
    bio: Optional[str] = ""
    avatar: Optional[str] = None
    cover: Optional[str] = None
    theme: str = "dark"

class PageUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    cover: Optional[str] = None
    theme: Optional[str] = None
    seoSettings: Optional[Dict[str, Any]] = None

class VerificationRequestCreate(BaseModel):
    user_id: Optional[str] = None
    full_name: str
    document_type: Optional[str] = "profile"
    contact_info: Optional[str] = None
    bio: Optional[str] = None
    comment: Optional[str] = None
    social_links: Optional[List[Dict[str, str]]] = None # [{"platform": "instagram", "url": "..."}]
    # Brand specific
    req_type: str = "personal" # personal, brand
    page_id: Optional[str] = None
    category: Optional[str] = None
    website: Optional[str] = None
    social_link: Optional[str] = None

class RejectionRequest(BaseModel):
    reason: Optional[str] = None

class NotificationRequest(BaseModel):
    message: str
    user_ids: Optional[List[str]] = None
    emails: Optional[List[str]] = None
    all_users: bool = False

class VerificationRequestResponse(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    full_name: Optional[str] = None
    document_type: Optional[str] = None
    status: Optional[str] = "pending"
    created_at: Optional[str] = None
    contact_info: Optional[str] = None
    bio: Optional[str] = None
    comment: Optional[str] = None
    social_links: Optional[List[Dict[str, str]]] = None
    # Brand specific
    req_type: str = "personal" # personal, brand
    page_id: Optional[str] = None
    category: Optional[str] = None
    website: Optional[str] = None
    social_link: Optional[str] = None
    # Current status for UI
    page_is_verified: Optional[bool] = None
    user_is_verified: Optional[bool] = None

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str  # info, success, warning, error
    message: str
    read: bool = False
    created_at: str

class PageResponse(BaseModel):
    id: str
    user_id: str
    username: str
    name: str
    bio: str
    avatar: Optional[str] = None
    cover: Optional[str] = None
    is_verified: bool = False
    is_main_page: bool = False # Flag for cascading revoke
    is_brand: bool = False
    brand_status: str = "none"  # none, pending, verified, rejected
    theme: str = "auto"
    seoSettings: Optional[Dict[str, Any]] = None
    created_at: str

class BlockCreate(BaseModel):
    page_id: str
    block_type: str  # "link", "text", "music"
    content: Dict[str, Any]
    order: int = 0

class BlockUpdate(BaseModel):
    content: Optional[Dict[str, Any]] = None
    order: Optional[int] = None

class BlockReorder(BaseModel):
    block_ids: List[str]

class BlockResponse(BaseModel):
    id: str
    page_id: str
    block_type: str
    content: Dict[str, Any]
    order: int
    created_at: str

class EventCreate(BaseModel):
    page_id: str
    title: str
    date: str
    description: Optional[str] = ""
    cover: Optional[str] = None
    button_text: Optional[str] = "Подробнее"
    button_url: Optional[str] = ""

class EventUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    description: Optional[str] = None
    cover: Optional[str] = None
    button_text: Optional[str] = None
    button_url: Optional[str] = None

class EventResponse(BaseModel):
    id: str
    page_id: str
    title: str
    date: str
    description: str
    cover: Optional[str]
    button_text: str
    button_url: str
    created_at: str

class ShowcaseCreate(BaseModel):
    page_id: str
    title: str
    cover: Optional[str] = None
    price: Optional[str] = ""
    button_text: Optional[str] = "Купить"
    button_url: Optional[str] = ""

class ShowcaseUpdate(BaseModel):
    title: Optional[str] = None
    cover: Optional[str] = None
    price: Optional[str] = None
    button_text: Optional[str] = None
    button_url: Optional[str] = None

class ShowcaseResponse(BaseModel):
    id: str
    page_id: str
    title: str
    cover: Optional[str]
    price: str
    button_text: str
    button_url: str
    created_at: str

class MusicResolveRequest(BaseModel):
    url: Optional[str] = None
    upc: Optional[str] = None
    isrc: Optional[str] = None
    mode: str = "auto"  # auto or manual

class UsernameCheckRequest(BaseModel):
    username: str

class UsernameUpdate(BaseModel):
    username: str

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class UserUpdate(BaseModel):
    fb_pixel_id: Optional[str] = None

class Lead(BaseModel):
    id: str
    page_id: str
    page_name: str
    form_id: Optional[str] = None
    name: Optional[str] = ""
    contact: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    message: Optional[str] = ""
    status: str = "new" # new, working, completed
    created_at: str

class LeadCreate(BaseModel):
    page_id: str
    form_id: Optional[str] = None
    name: Optional[str] = ""
    contact: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    message: Optional[str] = ""

# ===== Helper Functions =====

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    # Add role to payload for better identification if available
    if "role" not in to_encode and "user_id" in data:
         # This is handle in auth routes, but adding here as well if needed
         pass
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def send_reset_email(email: str, token: str):
    """
    Отправка email со ссылкой для сброса пароля.
    MVP: логирование в консоль. Позже можно интегрировать Sender API.
    """
    base_url = os.getenv("BASE_URL", "http://localhost:3000")
    reset_link = f"{base_url}/reset-password?token={token}"
    
    # MVP: просто логируем ссылку
    print("\n" + "="*80)
    print(f"📧 СБРОС ПАРОЛЯ для {email}")
    print(f"🔗 Ссылка: {reset_link}")
    print("="*80 + "\n")
    
    # TODO: Интеграция с Sender API
    # html_content = f"""
    # <html>
    #   <body>
    #     <h2>Сброс пароля</h2>
    #     <p>Для сброса пароля перейдите по ссылке:</p>
    #     <a href="{reset_link}">Сбросить пароль</a>
    #     <p>Ссылка действительна 1 час.</p>
    #   </body>
    # </html>
    # """

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "secretboost1")  # Change in production!

security = HTTPBearer(auto_error=False)

# ... (get_current_user remains similar but handles None credential)

async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not credentials:
        return None
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        # Enforce roles
        current_role = user.get("role", "user")
        
        if user.get("email") == "thedrumepic@gmail.com":
            if current_role != "owner":
                 user["role"] = "owner"
                 await db.users.update_one({"id": user_id}, {"$set": {"role": "owner"}})
        else:
            if current_role != "user":
                 user["role"] = "user"
                 await db.users.update_one({"id": user_id}, {"$set": {"role": "user"}})
                 
        return user
    except JWTError:
        return None

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    # This keeps the original strict behavior for normal routes
    if not credentials:
         raise HTTPException(status_code=401, detail="Не авторизован")
    user = await get_current_user_optional(credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token or user not found")
    return user

async def get_current_admin(
    request: Request,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    if not current_user:
         raise HTTPException(status_code=401, detail="Не авторизован")

    role = current_user.get("role", "user")
    if role != "owner":
        raise HTTPException(
            status_code=403, 
            detail=f"Доступ запрещен: требуются права владельца."
        )
    return current_user

async def get_current_owner(
    current_user: Optional[dict] = Depends(get_current_user)
):
    role = current_user.get("role", "user")
    if role != "owner":
        raise HTTPException(
            status_code=403, 
            detail="Доступ запрещен: ЭТО СЕКРЕТНАЯ КОМНАТА ТОЛЬКО ДЛЯ ВЛАДЕЛЬЦА"
        )
    return current_user

async def optimize_image(image_data: bytes, max_size: tuple = (800, 800)) -> str:
    """Optimize and convert image to base64"""
    try:
        img = Image.open(BytesIO(image_data))
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        output = BytesIO()
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGB')
        img.save(output, format='JPEG', quality=85, optimize=True)
        
        base64_str = base64.b64encode(output.getvalue()).decode('utf-8')
        return f"data:image/jpeg;base64,{base64_str}"
    except Exception as e:
        logger.error(f"Image optimization error: {e}")
        raise HTTPException(status_code=400, detail="Invalid image")

# ===== Auth Routes =====

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

class GoogleAuthRequest(BaseModel):
    token: str
    username: Optional[str] = None

class GoogleAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    username: str
    is_new_user: bool
    role: str = "user"

class UserMeResponse(BaseModel):
    id: str
    email: str
    username: Optional[str] = None
    role: str
    google_auth: bool = False
    is_verified: bool = False
    verification_status: Optional[str] = "none"
    ga_pixel_id: Optional[str] = None
    fb_pixel_id: Optional[str] = None
    leads: Optional[List[Lead]] = []

@api_router.post("/auth/google", response_model=GoogleAuthResponse)
async def google_auth(data: GoogleAuthRequest):
    email = None
    id_info = None
    logger.info(f"Google Auth request received")
    
    # Try verifying as ID Token first
    try:
        id_info = id_token.verify_oauth2_token(
            data.token, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        email = id_info['email']
    except ValueError:
        # Not a valid ID token, try as Access Token
        try:
            import requests
            userinfo_response = requests.get(
                f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={data.token}"
            )
            if userinfo_response.status_code == 200:
                 id_info = userinfo_response.json()
                 email = id_info.get('email')
                 if not email:
                     raise HTTPException(status_code=400, detail="Google User Info missing email")
            else:
                 raise HTTPException(status_code=400, detail="Invalid Google Token")
        except Exception as e:
            logger.error(f"Google Auth Error: {e}")
            raise HTTPException(status_code=400, detail="Invalid Google Token")

    # Find existing user by email
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    is_new = False
    
    if not user:
        is_new = True
        user_id = str(uuid.uuid4())
        
        # Determine username
        username = data.username
        
        # Check if provided username is available
        if username:
            existing_page = await db.pages.find_one({"username": username}, {"_id": 0})
            if existing_page:
                username = None # Fallback to generation if taken
        
        # Generate username if not provided or taken
        if not username:
             base_name = email.split('@')[0]
             username = base_name
             # Ensure unique
             counter = 1
             while await db.pages.find_one({"username": username}):
                 username = f"{base_name}{counter}"
                 counter += 1

        # Create User
        role = "owner" if email == "thedrumepic@gmail.com" else "user"
        user = {
            "id": user_id,
            "email": email,
            "password": hash_password(str(uuid.uuid4())), # Random password
            "created_at": datetime.now(timezone.utc).isoformat(),
            "google_auth": True,
            "role": role
        }
        await db.users.insert_one(user)

        # Create Page
        page = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "username": username,
            "name": id_info.get('name', username),
            "bio": "",
            "avatar": id_info.get('picture'),
            "cover": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_main_page": True
        }
        await db.pages.insert_one(page)
    else:
        # Existing user
        page = await db.pages.find_one({"user_id": user["id"]}, {"_id": 0})
        username = page["username"] if page else "unknown"
        
        # Ensure role is updated if it's the owner email
        if email == "thedrumepic@gmail.com" and user.get("role") != "owner":
            user["role"] = "owner"
            await db.users.update_one({"id": user["id"]}, {"$set": {"role": "owner"}})

    role = user.get("role", "user")
    token = create_access_token({"sub": user["id"], "role": role})
    
    return GoogleAuthResponse(
        access_token=token, 
        user_id=user["id"], 
        email=email,
        username=username,
        is_new_user=is_new,
        role=role
    )


@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    # 1. Check existing email
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email уже используется")
    
    user_id = str(uuid.uuid4())
    role = "owner" if user_data.email == "thedrumepic@gmail.com" else "user"
    
    # 2. Check username if provided
    created_username = None
    normalized_username = None
    
    if user_data.username:
        normalized_username = user_data.username.lower().strip()
        import re
        if not re.match(r"^[a-zA-Z0-9_-]+$", normalized_username):
             raise HTTPException(status_code=400, detail="Неверный формат ника")
             
        if len(normalized_username) < 4:
             raise HTTPException(status_code=400, detail="Минимальная длина ссылки - 4 символа")

        existing_username = await db.pages.find_one({"username": normalized_username}, {"_id": 0})
        if existing_username:
            raise HTTPException(status_code=400, detail="Username уже занят")
        
        created_username = normalized_username

    # 3. Create User
    user = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "role": role
    }
    
    await db.users.insert_one(user)
    
    # 4. Create Page if username valid
    if created_username:
        page = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "username": created_username,
            "name": created_username,
            "bio": "",
            "avatar": None,
            "cover": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_main_page": True
        }
        await db.pages.insert_one(page)

    
    token = create_access_token({"sub": user_id, "role": role})
    
    return TokenResponse(
        access_token=token,
        user_id=user_id,
        email=user_data.email,
        username=created_username,
        role=role
    )

@api_router.post("/submissions", status_code=201)
async def create_lead(lead_data: LeadCreate):
    page = await db.pages.find_one({"id": lead_data.page_id})
    if not page:
        raise HTTPException(status_code=404, detail="Страница не найдена")

    user_id = page["user_id"]
    
    new_lead = {
        "id": str(uuid.uuid4()),
        "page_id": lead_data.page_id,
        "page_name": page["name"],
        "form_id": lead_data.form_id,
        "name": lead_data.name,
        "contact": lead_data.contact,
        "email": lead_data.email,
        "phone": lead_data.phone,
        "message": lead_data.message,
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    result = await db.users.update_one(
        {"id": user_id},
        {"$push": {"leads": new_lead}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Владелец страницы не найден")

    # Create notification
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "info",
        "message": f"Кто-то заполнил форму на странице {page['name']}, проверьте в настройках.",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)

    return {"message": "Заявка успешно отправлена"}

@api_router.delete("/submissions/{lead_id}")
async def delete_lead(
    lead_id: str,
    current_user: dict = Depends(get_current_user)
):
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
        
    leads = user.get("leads", [])
    new_leads = [l for l in leads if l.get("id") != lead_id]
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"leads": new_leads}}
    )

    return {"message": "Заявка удалена"}

class LeadStatusUpdate(BaseModel):
    status: str

@api_router.patch("/submissions/{lead_id}/status")
async def update_lead_status(
    lead_id: str,
    status_data: LeadStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    valid_statuses = ["new", "working", "completed"]
    if status_data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Неверный статус")

    # Find user first to ensure lead exists and update it manually
    # This is more compatible with simple mock DBs and ensures matched_count/modified_count logic is clear
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
        
    leads = user.get("leads", [])
    lead_idx = -1
    for i, lead in enumerate(leads):
        if lead.get("id") == lead_id:
            lead_idx = i
            break
            
    if lead_idx == -1:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    # Update status
    leads[lead_idx]["status"] = status_data.status
    
    # Save back
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"leads": leads}}
    )

    return {"message": "Статус обновлен", "status": status_data.status}

@api_router.delete("/auth/me")
async def delete_my_account(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    # 1. Delete blocks from all user pages
    user_pages = await db.pages.find({"user_id": user_id}, {"_id": 0, "id": 1}).to_list(100)
    for page in user_pages:
        await db.blocks.delete_many({"page_id": page["id"]})
        await db.events.delete_many({"page_id": page["id"]})
        await db.showcases.delete_many({"page_id": page["id"]})
    
    # 2. Delete all pages
    await db.pages.delete_many({"user_id": user_id})
    
    # 3. Delete user
    await db.users.delete_one({"id": user_id})
    
    logger.info(f"User {user_id} deleted their account and all associated data.")
    return {"message": "Аккаунт успешно удален"}

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    
    page = await db.pages.find_one({"user_id": user["id"]}, {"_id": 0, "username": 1})
    token = create_access_token({"sub": user["id"], "role": user.get("role", "user")})
    return TokenResponse(
        access_token=token, 
        user_id=user["id"], 
        email=user["email"],
        username=page["username"] if page else None,
        role=user.get("role", "user")
    )

@api_router.post("/auth/check-username")
async def check_username(data: UsernameCheckRequest):
    existing = await db.pages.find_one({"username": data.username}, {"_id": 0})
    return {"available": existing is None}

@api_router.post("/auth/change-password")
async def change_password(data: PasswordChangeRequest, current_user = Depends(get_current_user)):
    if not verify_password(data.current_password, current_user["password"]):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")
    
    new_hash = hash_password(data.new_password)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password": new_hash}}
    )
    return {"message": "Пароль успешно изменён"}

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """
    Инициация сброса пароля: генерация токена и отправка email
    """
    # Проверяем существование пользователя
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    
    # Всегда возвращаем успех (защита от перебора email)
    if not user:
        return {"message": "Если email существует, инструкции отправлены"}
    
    # Генерируем токен
    reset_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Сохраняем в коллекцию password_resets
    reset_record = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "email": data.email,
        "token": reset_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Удаляем старые токены этого пользователя
    await db.password_resets.delete_many({"user_id": user["id"]})
    
    # Создаём новый
    await db.password_resets.insert_one(reset_record)
    
    # Отправляем email (MVP: логирование)
    send_reset_email(data.email, reset_token)
    
    return {"message": "Если email существует, инструкции отправлены"}

@api_router.post("/auth/reset-password-confirm")
async def reset_password_confirm(data: ResetPasswordRequest):
    """
    Подтверждение сброса пароля: валидация токена и смена пароля
    """
    # Ищем токен
    reset_record = await db.password_resets.find_one({"token": data.token}, {"_id": 0})
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Неверный или истёкший токен")
    
    # Проверяем срок действия
    expires_at = datetime.fromisoformat(reset_record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        # Удаляем истёкший токен
        await db.password_resets.delete_one({"token": data.token})
        raise HTTPException(status_code=400, detail="Токен истёк. Запросите новый")
    
    # Валидация пароля
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Пароль должен быть не менее 6 символов")
    
    # Обновляем пароль
    new_hash = hash_password(data.new_password)
    await db.users.update_one(
        {"id": reset_record["user_id"]},
        {"$set": {"password": new_hash}}
    )
    
    # Удаляем использованный токен
    await db.password_resets.delete_one({"token": data.token})
    
    logger.info(f"Password reset successful for user {reset_record['user_id']}")
    
    return {"message": "Пароль успешно изменён"}

@api_router.get("/tools/resolve-url")
async def resolve_url(url: str):
    """
    Разрешает сокращенные ссылки (например, pin.it) в полные URL.
    """
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
        
    try:
        # Простая проверка безопасности
        target_url = url
        if not target_url.startswith(('http://', 'https://')):
            target_url = 'https://' + target_url
            
        async with aiohttp.ClientSession() as session:
            # Используем GET вместо HEAD для надежности с некоторыми сокращателями
            async with session.get(target_url, allow_redirects=True) as response:
                return {"url": str(response.url)}
    except Exception as e:
        logger.error(f"Error resolving URL {url}: {e}")
        # В случае ошибки возвращаем исходный URL
        return {"url": url}

@api_router.get("/auth/me", response_model=UserMeResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    page = await db.pages.find_one({"user_id": current_user["id"]}, {"_id": 0, "username": 1})
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "username": page["username"] if page else None,
        "role": current_user.get("role", "user"),
        "google_auth": current_user.get("google_auth", False),
        "is_verified": current_user.get("is_verified", False),
        "verification_status": current_user.get("verificationStatus", "none"),
        "ga_pixel_id": current_user.get("ga_pixel_id"),
        "fb_pixel_id": current_user.get("fb_pixel_id"),
        "leads": current_user.get("leads", [])
    }

@api_router.patch("/auth/me")
async def update_me(updates: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in updates.dict(exclude_unset=True).items() if v is not None}
    
    if not update_data:
        return {"message": "Нет данных для обновления"}

    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": update_data}
    )
    
    return {"message": "Данные обновлены", "updates": update_data}
    
# ===== Admin Routes =====

@api_router.get("/admin/stats")
async def get_admin_stats(current_admin = Depends(get_current_admin)):
    total_users = await db.users.count_documents({})
    total_pages = await db.pages.count_documents({})
    google_users = await db.users.count_documents({"google_auth": True})
    email_users = total_users - google_users
    
    return {
        "total_users": total_users,
        "total_pages": total_pages,
        "registrations": {
            "google": google_users,
            "email": email_users
        }
    }

@api_router.get("/admin/users")
async def get_all_users(current_admin = Depends(get_current_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    # Join with pages to get usernames
    for user in users:
        page = await db.pages.find_one({"user_id": user["id"]}, {"_id": 0, "username": 1})
        user["username"] = page["username"] if page else "N/A"
    return users

@api_router.delete("/admin/user/{user_id}")
async def admin_delete_user(user_id: str, current_admin = Depends(get_current_admin)):
    if user_id == current_admin["id"]:
        raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")
        
    # Cascade delete
    await db.users.delete_one({"id": user_id})
    await db.pages.delete_many({"user_id": user_id})
    # Optional: delete blocks if page IDs are known, but pages usually enough if we reference by user_id
    # To be thorough:
    page = await db.pages.find_one({"user_id": user_id})
    if page:
        await db.blocks.delete_many({"page_id": page["id"]})
        
    return {"message": "Пользователь и его данные удалены"}

@api_router.post("/admin/user/{user_id}/make-admin")
async def make_admin(user_id: str, current_admin = Depends(get_current_admin)):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": "admin"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return {"message": "Права администратора выданы"}

# ===== Pages Routes =====

@api_router.get("/pages", response_model=List[PageResponse])
async def get_user_pages(current_user = Depends(get_current_user)):
    try:
        # Get all pages sorted by creation time
        pages = await db.pages.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", 1).to_list(100)
        
        if not pages:
            return []

        # Check if any page is marked as main
        has_main = any(p.get("is_main_page", False) for p in pages)
        
        if not has_main:
            # Mark the first page (oldest) as main
            first_page = pages[0]
            first_page["is_main_page"] = True
            await db.pages.update_one({"id": first_page["id"]}, {"$set": {"is_main_page": True}})
            # Set for others strictly to False if missing (optional but cleaner)
            for p in pages[1:]:
                 if "is_main_page" not in p:
                     p["is_main_page"] = False

        # Sort: Main page first, then others by created_at
        pages.sort(key=lambda x: (not x.get("is_main_page", False), x.get("created_at", "")))
        
        return pages
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error(f"Error in get_user_pages: {e}")
        logger.error(tb)
        raise HTTPException(status_code=500, detail=f"{str(e)}\n{tb}")

class AnalyticsEvent(BaseModel):
    page_id: str
    event_type: str  # "view", "click"
    target_id: Optional[str] = None # e.g. track_id or block_id for clicks
    metadata: Optional[Dict[str, Any]] = None

@api_router.post("/analytics/track")
async def track_event(event: AnalyticsEvent):
    # Public endpoint, no auth required to record views/clicks
    # But we check if page exists to avoid spam
    page = await db.pages.find_one({"id": event.page_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
        
    doc = {
        "id": str(uuid.uuid4()),
        "page_id": event.page_id,
        "event_type": event.event_type,
        "target_id": event.target_id,
        "metadata": event.metadata,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.analytics_v2.insert_one(doc)
    return {"status": "ok"}

@api_router.get("/pages/{username}/stats")
async def get_page_stats(username: str, current_user = Depends(get_current_user)):
    page = await db.pages.find_one({"username": username})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Check ownership
    if page["user_id"] != current_user["id"]:
         raise HTTPException(status_code=403, detail="Доступ запрещен")

    # Aggregate stats
    # 1. Total Views
    total_views = await db.analytics_v2.count_documents({"page_id": page["id"], "event_type": "view"})
    # 2. Total Clicks
    total_clicks = await db.analytics_v2.count_documents({"page_id": page["id"], "event_type": "click"})
    
    # 3. Chart Data (Last 7 days)
    chart_data = []
    now = datetime.now(timezone.utc)
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        # In a real Mongo we'd use aggregation. Here we do simple count for each day.
        # This is fine for Mock DB and small scale.
        # Format: timestamp starts with YYYY-MM-DD
        day_views = 0
        day_clicks = 0
        
        # We need a way to filter by day prefix in our mock matches or just get all and filter
        # Since mock_db doesn't support $regex, we just fetch events related to this page
        # Note: In production we'd use better indexing and aggregation.
        all_day_events = await db.analytics_v2.find({"page_id": page["id"]}).to_list(10000)
        for e in all_day_events:
            if e["timestamp"].startswith(day):
                if e["event_type"] == "view": day_views += 1
                elif e["event_type"] == "click": day_clicks += 1
        
        chart_data.append({
            "name": day,
            "views": day_views,
            "clicks": day_clicks
        })

    # 4. Top Links
    # Get all clicks for this page
    all_clicks = [e for e in all_day_events if e["event_type"] == "click" and e["target_id"]]
    click_counts = {}
    for c in all_clicks:
        tid = c["target_id"]
        click_counts[tid] = click_counts.get(tid, 0) + 1
        
    top_links = []
    # Sort by count
    sorted_clicks = sorted(click_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    
    for tid, count in sorted_clicks:
        block = await db.blocks.find_one({"id": tid})
        if block:
            top_links.append({
                "title": block["content"].get("title", "Unknown"),
                "clicks": count
            })

    return {
        "total_views": total_views,
        "total_clicks": total_clicks,
        "ctr": round((total_clicks / total_views * 100), 1) if total_views > 0 else 0,
        "chart_data": chart_data,
        "top_links": top_links
    }

@api_router.post("/pages", response_model=PageResponse)
async def create_page(page_data: PageCreate, current_user = Depends(get_current_user)):
    normalized_username = page_data.username.lower().strip()
    
    import re
    if not re.match(r"^[a-zA-Z0-9_-]+$", normalized_username):
        raise HTTPException(status_code=400, detail="Неверный формат ника. Используйте буквы, цифры, _ и -")
        
    if len(normalized_username) < 4:
        raise HTTPException(status_code=400, detail="Минимальная длина ссылки - 4 символа")

    existing = await db.pages.find_one({"username": normalized_username}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Username уже занят")
    
    # Determine if this is the first page
    is_main = False
    existing_count = await db.pages.count_documents({"user_id": current_user["id"]})
    if existing_count == 0:
        is_main = True

    page = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "username": normalized_username,
        "name": page_data.name,
        "bio": page_data.bio or "",
        "avatar": page_data.avatar,
        "cover": page_data.cover,
        "theme": page_data.theme,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_main_page": is_main
    }
    
    await db.pages.insert_one(page)
    return PageResponse(**page)

@api_router.get("/pages/{username}", response_model=Dict[str, Any])
async def get_page_by_username(username: str):
    data = await get_full_page_data_internal(username)
    if not data:
        raise HTTPException(status_code=404, detail="Страница не найдена")
    
    # Actually loadPage in frontend does tracking, so we can just return data
    return data

@api_router.patch("/pages/{page_id}", response_model=PageResponse)
async def update_page(page_id: str, updates: PageUpdate, current_user = Depends(get_current_user)):
    page = await db.pages.find_one({"id": page_id, "user_id": current_user["id"]}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Страница не найдена")
    
    update_data = {k: v for k, v in updates.dict(exclude_unset=True).items() if v is not None}
    if update_data:
        await db.pages.update_one({"id": page_id}, {"$set": update_data})
        await broadcast_page_update(page["username"])
    
    updated_page = await db.pages.find_one({"id": page_id}, {"_id": 0})
    return PageResponse(**updated_page)

@api_router.patch("/pages/{page_id}/update-username")
async def update_page_username(page_id: str, data: UsernameUpdate, current_user = Depends(get_current_user)):
    # 1. Найти страницу и проверить владельца
    page = await db.pages.find_one({"id": page_id, "user_id": current_user["id"]})
    if not page:
        raise HTTPException(status_code=404, detail="Страница не найдена")
    
    new_username = data.username.lower().strip()
    old_username = page["username"]
    
    if new_username == old_username:
        return {"message": "Имя пользователя не изменилось"}
    
    # 2. Валидация формата
    import re
    if not re.match(r"^[a-zA-Z0-9_-]+$", new_username):
        raise HTTPException(status_code=400, detail="Неверный формат ника. Используйте буквы, цифры, _ и -")
        
    if len(new_username) < 4:
        raise HTTPException(status_code=400, detail="Минимальная длина ссылки - 4 символа")

    # 3. Финальная проверка на уникальность
    existing = await db.pages.find_one({"username": new_username})
    if existing:
        raise HTTPException(status_code=400, detail="Это имя пользователя уже занято")
    
    # 4. Обновление в коллекции pages
    await db.pages.update_one({"id": page_id}, {"$set": {"username": new_username}})
    
    # 5. Обновление в коллекции users (если там был этот username)
    # Ищем пользователя, у которого в поле username (если оно есть) старый ник
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"username": new_username}}
    )
    
    await manager.notify_page_update(old_username) # Notify old subscribers (might show 404/redirect)
    await broadcast_page_update(new_username)
    
    logger.info(f"User {current_user['id']} changed username from {old_username} to {new_username}")
    return {"message": "Ссылка успешно обновлена", "username": new_username}

@api_router.delete("/pages/{page_id}")
async def delete_page(page_id: str, current_user = Depends(get_current_user)):
    page = await db.pages.find_one({"id": page_id, "user_id": current_user["id"]}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Страница не найдена")
    
    # Check if main page
    if page.get("is_main_page", False):
         raise HTTPException(status_code=400, detail="Нельзя удалить основную страницу")

    await db.pages.delete_one({"id": page_id})
    await db.blocks.delete_many({"page_id": page_id})
    await db.events.delete_many({"page_id": page_id})
    await db.showcases.delete_many({"page_id": page_id})
    
    await manager.notify_page_update(page["username"])
    
    return {"message": "Страница удалена"}

# ===== Blocks Routes =====

@api_router.post("/blocks", response_model=BlockResponse)
async def create_block(block_data: BlockCreate, current_user = Depends(get_current_user)):
    page = await db.pages.find_one({"id": block_data.page_id, "user_id": current_user["id"]}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Страница не найдена")
    
    block = {
        "id": str(uuid.uuid4()),
        "page_id": block_data.page_id,
        "block_type": block_data.block_type,
        "content": block_data.content,
        "order": block_data.order,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.blocks.insert_one(block)
    await broadcast_by_page_id(block_data.page_id)
    return BlockResponse(**block)

@api_router.patch("/blocks/reorder")
async def reorder_blocks(data: BlockReorder, current_user = Depends(get_current_user)):
    logger.info(f"Reorder request for blocks: {data.block_ids}")
    if not data.block_ids:
        return {"message": "Список пуст"}
    
    # Находим хоть один существующий блок из списка, чтобы проверить владельца страницы
    sample_block = None
    for bid in data.block_ids:
        sample_block = await db.blocks.find_one({"id": bid}, {"_id": 0})
        if sample_block:
            break
    
    if not sample_block:
        logger.warning(f"None of the blocks {data.block_ids} found for user {current_user['id']}")
        raise HTTPException(status_code=404, detail="Блоки не найдены")
    
    page = await db.pages.find_one({"id": sample_block["page_id"], "user_id": current_user["id"]}, {"_id": 0})
    if not page:
        logger.warning(f"Access denied for blocks {data.block_ids} by user {current_user['id']}")
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    # Update orders in bulk
    for index, block_id in enumerate(data.block_ids):
        logger.info(f"Updating block {block_id} to order {index}")
        await db.blocks.update_one(
            {"id": block_id},
            {"$set": {"order": index}}
        )
    
    await manager.notify_page_update(page["username"])
    return {"message": "Порядок обновлён"}

@api_router.patch("/blocks/{block_id}", response_model=BlockResponse)
async def update_block(block_id: str, updates: BlockUpdate, current_user = Depends(get_current_user)):
    block = await db.blocks.find_one({"id": block_id}, {"_id": 0})
    if not block:
        raise HTTPException(status_code=404, detail="Блок не найден")
    
    page = await db.pages.find_one({"id": block["page_id"], "user_id": current_user["id"]}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    update_data = {k: v for k, v in updates.dict(exclude_unset=True).items() if v is not None}
    if update_data:
        await db.blocks.update_one({"id": block_id}, {"$set": update_data})
        await broadcast_by_page_id(block["page_id"])
    
    updated_block = await db.blocks.find_one({"id": block_id}, {"_id": 0})
    return BlockResponse(**updated_block)

@api_router.delete("/blocks/{block_id}")
async def delete_block(block_id: str, current_user = Depends(get_current_user)):
    block = await db.blocks.find_one({"id": block_id}, {"_id": 0})
    if not block:
        raise HTTPException(status_code=404, detail="Блок не найден")
    
    page = await db.pages.find_one({"id": block["page_id"], "user_id": current_user["id"]}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    await db.blocks.delete_one({"id": block_id})
    await broadcast_by_page_id(block["page_id"])
    return {"message": "Блок удалён"}

# ===== Events Routes =====

@api_router.post("/events", response_model=EventResponse)
async def create_event(event_data: EventCreate, current_user = Depends(get_current_user)):
    page = await db.pages.find_one({"id": event_data.page_id, "user_id": current_user["id"]}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Страница не найдена")
    
    event = {
        "id": str(uuid.uuid4()),
        "page_id": event_data.page_id,
        "title": event_data.title,
        "date": event_data.date,
        "description": event_data.description or "",
        "cover": event_data.cover,
        "button_text": event_data.button_text or "Подробнее",
        "button_url": event_data.button_url or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.events.insert_one(event)
    await broadcast_by_page_id(event_data.page_id)
    return EventResponse(**event)

@api_router.patch("/events/{event_id}", response_model=EventResponse)
async def update_event(event_id: str, updates: EventUpdate, current_user = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    
    page = await db.pages.find_one({"id": event["page_id"], "user_id": current_user["id"]}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    update_data = {k: v for k, v in updates.dict(exclude_unset=True).items() if v is not None}
    if update_data:
        await db.events.update_one({"id": event_id}, {"$set": update_data})
        await broadcast_by_page_id(event["page_id"])
    
    updated_event = await db.events.find_one({"id": event_id}, {"_id": 0})
    return EventResponse(**updated_event)

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    
    page = await db.pages.find_one({"id": event["page_id"], "user_id": current_user["id"]}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    await db.events.delete_one({"id": event_id})
    await broadcast_by_page_id(event["page_id"])
    return {"message": "Событие удалено"}

# ===== Showcases Routes =====

@api_router.post("/showcases", response_model=ShowcaseResponse)
async def create_showcase(showcase_data: ShowcaseCreate, current_user = Depends(get_current_user)):
    page = await db.pages.find_one({"id": showcase_data.page_id, "user_id": current_user["id"]}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Страница не найдена")
    
    showcase = {
        "id": str(uuid.uuid4()),
        "page_id": showcase_data.page_id,
        "title": showcase_data.title,
        "cover": showcase_data.cover,
        "price": showcase_data.price or "",
        "button_text": showcase_data.button_text or "Купить",
        "button_url": showcase_data.button_url or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.showcases.insert_one(showcase)
    await broadcast_by_page_id(showcase_data.page_id)
    return ShowcaseResponse(**showcase)

@api_router.patch("/showcases/{showcase_id}", response_model=ShowcaseResponse)
async def update_showcase(showcase_id: str, updates: ShowcaseUpdate, current_user = Depends(get_current_user)):
    showcase = await db.showcases.find_one({"id": showcase_id}, {"_id": 0})
    if not showcase:
        raise HTTPException(status_code=404, detail="Витрина не найдена")
    
    page = await db.pages.find_one({"id": showcase["page_id"], "user_id": current_user["id"]}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    update_data = {k: v for k, v in updates.dict(exclude_unset=True).items() if v is not None}
    if update_data:
        await db.showcases.update_one({"id": showcase_id}, {"$set": update_data})
        await broadcast_by_page_id(showcase["page_id"])
    
    updated_showcase = await db.showcases.find_one({"id": showcase_id}, {"_id": 0})
    return ShowcaseResponse(**updated_showcase)

@api_router.delete("/showcases/{showcase_id}")
async def delete_showcase(showcase_id: str, current_user = Depends(get_current_user)):
    showcase = await db.showcases.find_one({"id": showcase_id}, {"_id": 0})
    if not showcase:
        raise HTTPException(status_code=404, detail="Витрина не найдена")
    
    page = await db.pages.find_one({"id": showcase["page_id"], "user_id": current_user["id"]}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=403, detail="Нет доступа")
    
    await db.showcases.delete_one({"id": showcase_id})
    await broadcast_by_page_id(showcase["page_id"])
    return {"message": "Витрина удалена"}

# ===== Tool Routes =====

@api_router.get("/tools/resolve-url")
async def resolve_url(url: str):
    if not url:
        return {"url": ""}
        
    # Basic validation
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
        
    # Whitelist of allowed domains for resolution
    allowed_hosts = [
        'pin.it', 
        'pinterest.com', 
        'www.pinterest.com',
        'ru.pinterest.com',
        'maps.app.goo.gl', 
        'goo.gl', 
        'yandex.ru', 
        'yandex.kz', 
        'ya.ru',
        'clck.ru'
    ]
    
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        if domain.startswith('www.'):
            domain = domain[4:]
            
        # Check if domain is allowed OR if it's a google maps domain
        is_allowed = any(domain == host or domain.endswith('.' + host) for host in allowed_hosts)
        
        if not is_allowed and 'google.com' in domain and '/maps' in parsed.path:
             is_allowed = True

        if not is_allowed:
             # For safety, we only resolve known shorteners or target domains
             # But if it's just a resolution, maybe we can be more lenient?
             # Let's return original URL if not allowed, effectively "skipping" resolution
             return {"url": url}

        async with aiohttp.ClientSession() as session:
            async with session.head(url, allow_redirects=True, timeout=10) as resp:
                return {"url": str(resp.url)}
    except Exception as e:
        # Fallback: return original url
        return {"url": url}


# ===== Music/Odesli Routes =====

@api_router.post("/music/resolve")
async def resolve_music_link(data: MusicResolveRequest):
    try:
        if data.mode == "auto" and data.url:
            timeout = aiohttp.ClientTimeout(total=15)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                params = {"url": data.url}
                async with session.get("https://api.song.link/v1-alpha.1/links", params=params) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        
                        entities = result.get("entitiesByUniqueId", {})
                        entity_id = result.get("entityUniqueId", "")
                        
                        # Preference order for metadata (which entity to use for title/artist/cover)
                        # Odesli providers are usually simple strings like 'spotify', 'itunes', 'youtube', etc.
                        pref_providers = ["spotify", "itunes", "apple", "deezer", "tidal"]
                        best_entity_id = entity_id
                        
                        # If current is youtube or unknown, try to find a better one from available entities
                        current_provider = entities.get(entity_id, {}).get("apiProvider", "").lower()
                        if "youtube" in current_provider or not any(p in current_provider for p in pref_providers):
                            for eid, e_data in entities.items():
                                provider = e_data.get("apiProvider", "").lower()
                                if any(p in provider for p in pref_providers):
                                    best_entity_id = eid
                                    break
                        
                        entity = entities.get(best_entity_id, {})
                        links = result.get("linksByPlatform", {})

                        # Platform mapping for frontend compatibility
                        # Frontend expects: spotify, appleMusic, itunes, youtubeMusic, youtube, yandex, vk, ...
                        PLATFORM_MAP = {
                            "appleMusic": "appleMusic",
                            "itunes": "itunes",
                            "spotify": "spotify",
                            "youtube": "youtube",
                            "youtubeMusic": "youtubeMusic",
                            "yandex": "yandex",
                            "yandexMusic": "yandex",
                            "vk": "vk",
                            "deezer": "deezer",
                            "tidal": "tidal",
                            "amazonMusic": "amazonMusic",
                            "amazonStore": "amazonStore",
                            "amazon": "amazonMusic",
                            "pandora": "pandora",
                            "bandcamp": "bandcamp",
                            "soundcloud": "soundcloud",
                            "napster": "napster",
                            "anghami": "anghami",
                            "boomplay": "boomplay",
                            "audiomack": "audiomack",
                            "audius": "audius",
                            "tiktok": "tiktok"
                        }

                        platforms = []
                        for platform, link_data in links.items():
                            url = None
                            if isinstance(link_data, dict):
                                url = link_data.get("url")
                            elif isinstance(link_data, str):
                                url = link_data
                            
                            if url:
                                # Normalize platform ID using our map
                                target_platform = PLATFORM_MAP.get(platform, platform)
                                platforms.append({
                                    "platform": target_platform,
                                    "url": str(url)
                                })
                        
                        return {
                            "success": True,
                            "data": {
                                "title": entity.get("title", "Unknown"),
                                "artist": entity.get("artistName", "Unknown"),
                                "cover": entity.get("thumbnailUrl"),
                                "platforms": platforms
                            }
                        }
                    else:
                        return {"success": False, "error": "Не удалось найти трек"}
        
        return {"success": False, "error": "Необходимо указать URL"}
    except Exception as e:
        logger.error(f"Music resolve error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {"success": False, "error": str(e)}

# ===== Upload Routes =====

@api_router.post("/upload")
async def upload_image(
    file: UploadFile = File(...), 
    category: str = Query("others", enum=["avatars", "covers", "files", "others", "favs"]),
    current_user = Depends(get_current_user)
):
    # Determine allowed types and size limit based on category
    if category == "files":
        allowed_types = [
            "application/pdf", "application/zip", "application/x-zip-compressed",
            "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain", "application/octet-stream"
        ]
        size_limit = 100 * 1024 * 1024  # 100MB
    elif category == "favs":
        allowed_types = ["image/x-icon", "image/vnd.microsoft.icon", "image/png", "image/jpeg"]
        size_limit = 2 * 1024 * 1024 # 2MB
    else:
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
        size_limit = 10 * 1024 * 1024  # 10MB limit

    # Extension check for favicons if content_type is unreliable
    is_icon = category == "favs" and (file.filename.lower().endswith('.ico') or file.filename.lower().endswith('.png'))

    if not file.content_type or (file.content_type not in allowed_types and not is_icon):
        if category != "files" and not is_icon:
            raise HTTPException(status_code=400, detail="Файл должен быть изображением (JPEG, PNG, GIF, WEBP, ICO)")
    
    contents = await file.read()
    if len(contents) > size_limit:
        limit_mb = size_limit // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Файл слишком большой (макс. {limit_mb}MB)")
    
    try:
        # Generate unique filename
        ext = Path(file.filename).suffix or ".jpg"
        filename = f"{uuid.uuid4()}{ext}"
        
        # Determine target directory
        target_dir = UPLOAD_DIR / category
        target_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = target_dir / filename
        
        # Save file to disk
        with open(file_path, "wb") as f:
            f.write(contents)
            
        # Return relative URL
        return {"url": f"/uploads/{category}/{filename}"}
    except Exception as e:
        logger.error(f"Image processing error: {e}")
        raise HTTPException(status_code=400, detail="Не удалось обработать изображение")

# ===== Verification Routes =====

@api_router.post("/verification/request", response_model=VerificationRequestResponse)
async def create_verification_request(
    request: VerificationRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    # Check if request already exists
    # Check if request already exists
    query = {"user_id": current_user["id"], "status": "pending"}
    if request.req_type == 'brand':
        query["page_id"] = request.page_id
        
    existing = await db.verification_requests.find_one(query)
    
    if existing:
        raise HTTPException(status_code=400, detail="Заявка уже находится на рассмотрении")

    if request.req_type == 'brand':
        # Check if user is verified (or at least has one verified page which implies user verification)
        # In this system, user verification seems tied to the main page 'is_verified' flag
        # Let's check if the user has a verified page
        verified_page = await db.pages.find_one({"user_id": current_user["id"], "is_verified": True})
        if not verified_page:
             raise HTTPException(status_code=400, detail="Только верифицированные пользователи могут создавать бренды")
        
        # Check if target page exists and belongs to user
        if not request.page_id:
             raise HTTPException(status_code=400, detail="Не указана страница для бренда")
        
        target_page = await db.pages.find_one({"id": request.page_id, "user_id": current_user["id"]})
        if not target_page:
             raise HTTPException(status_code=404, detail="Страница не найдена")

        # Update page brand status
        await db.pages.update_one({"id": request.page_id}, {"$set": {"brand_status": "pending"}})

    new_request = request.dict()
    new_request["id"] = str(uuid.uuid4())
    new_request["user_id"] = current_user["id"]
    new_request["user_email"] = current_user["email"]
    new_request["status"] = "pending"
    new_request["created_at"] = datetime.now().isoformat()

    await db.verification_requests.insert_one(new_request)

    # If it's a personal verification request, update the user status to pending
    if request.req_type == 'personal':
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"verificationStatus": "pending"}}
        )
    
    # Create notification for admin (optional, effectively just logging here or could be a real notification if admins had a unified inbox)
    print(f"New verification request from {current_user['email']}")

    return new_request

@api_router.get("/admin/verification/requests")
async def get_verification_requests(current_admin: dict = Depends(get_current_admin)):
    requests = await db.verification_requests.find({}, {"_id": 0}).sort("created_at", 1).to_list(100)
    # Ensure email and page username/link is present
    for req in requests:
        user = await db.users.find_one({"id": req["user_id"]})
        if user:
            req["user_email"] = user.get("email")
            req["user_is_verified"] = user.get("is_verified", False)
        
        if req.get("req_type") == "brand" and req.get("page_id"):
            page = await db.pages.find_one({"id": req["page_id"]})
            if page:
                req["page_username"] = page.get("username")
                req["page_is_verified"] = page.get("is_verified", False)
        else:
            # Personal: Find the main page or the first page
            page = await db.pages.find_one({"user_id": req["user_id"], "is_main_page": True})
            if not page:
                pages = await db.pages.find({"user_id": req["user_id"]}).sort("created_at", 1).to_list(1)
                if pages:
                    page = pages[0]
            if page:
                req["page_username"] = page.get("username")
                req["page_is_verified"] = page.get("is_verified", False)
    return requests

@api_router.post("/admin/verification/{request_id}/approve")
async def approve_verification_request(request_id: str, current_admin: dict = Depends(get_current_admin)):
    req = await db.verification_requests.find_one({"id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    await db.verification_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "approved"}}
    )
    
    if req.get('req_type') == 'brand':
        # Approve specific Brand Page
        target_page = await db.pages.find_one({"id": req["page_id"]})
        page_display_name = target_page.get("name", req.get("full_name", "N/A")) if target_page else req.get("full_name", "N/A")
        
        await db.pages.update_one(
            {"id": req["page_id"]},
            {"$set": {"is_verified": True, "is_brand": True, "brand_status": "verified"}}
        )
        message = f"Ваша заявка на статус бренда для страницы {page_display_name} одобрена!"
    else:
        # Personal: Approve Main Page ONLY
        main_page = await db.pages.find_one({"user_id": req["user_id"], "is_main_page": True})
        if not main_page:
            # Fallback to the first page if none marked as main
            pages = await db.pages.find({"user_id": req["user_id"]}).sort("created_at", 1).to_list(1)
            if pages:
                main_page = pages[0]
                # Mark it as main page for future
                await db.pages.update_one({"id": main_page["id"]}, {"$set": {"is_main_page": True}})
        
        if main_page:
            await db.pages.update_one(
                {"id": main_page["id"]},
                {"$set": {"is_verified": True}}
            )
            # Update user status
            await db.users.update_one(
                {"id": req["user_id"]},
                {"$set": {"is_verified": True, "verificationStatus": "approved"}}
            )
            message = "Ваша заявка на верификацию одобрена! Галочка появится на вашей главной странице."
        else:
            await db.users.update_one({"id": req["user_id"]}, {"$set": {"is_verified": True, "verificationStatus": "approved"}})
            message = "Ваш аккаунт верифицирован."

    notification = {
        "id": str(uuid.uuid4()),
        "user_id": req["user_id"],
        "type": "verification",
        "message": message,
        "read": False,
        "created_at": datetime.now().isoformat()
    }
    await db.notifications.insert_one(notification)
    
    # Notify by page_id for live tick update
    await broadcast_by_page_id(req.get("page_id")) if req.get("page_id") else None
    
    return {"status": "approved"}

@api_router.post("/admin/verification/{request_id}/reject")
async def reject_verification_request(request_id: str, rejection: RejectionRequest, current_admin: dict = Depends(get_current_admin)):
    req = await db.verification_requests.find_one({"id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    await db.verification_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "rejected", "rejection_reason": rejection.reason}}
    )

    if req.get('req_type') == 'brand':
        await db.pages.update_one(
            {"id": req["page_id"]},
            {"$set": {"brand_status": "rejected"}}
        )
        message = f"Ваша заявка на статус бренда отклонена. Причина: {rejection.reason}"
    else:
        await db.users.update_one(
            {"id": req["user_id"]},
            {"$set": {"verificationStatus": "rejected"}}
        )
        message = f"Ваша заявка на верификацию отклонена. Причина: {rejection.reason}"

    notification = {
        "id": str(uuid.uuid4()),
        "user_id": req["user_id"],
        "type": "verification",
        "message": message,
        "read": False,
        "created_at": datetime.now().isoformat()
    }
    await db.notifications.insert_one(notification)
    
    # Notify by page_id for rejection
    await broadcast_by_page_id(req.get("page_id")) if req.get("page_id") else None

    return {"status": "rejected"}

@api_router.post("/admin/verification/{request_id}/cancel")
async def cancel_verification_request(request_id: str, rejection: RejectionRequest, current_admin: dict = Depends(get_current_admin)):
    req = await db.verification_requests.find_one({"id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Determine if it's a main page revoke or brand revoke
    target_page = None
    if req.get('req_type') == 'brand':
        target_page = await db.pages.find_one({"id": req["page_id"]})
    else:
        # For personal, it's typically the main page
        target_page = await db.pages.find_one({"user_id": req["user_id"], "is_main_page": True})
        if not target_page:
            # Fallback
            pages = await db.pages.find({"user_id": req["user_id"]}).sort("created_at", 1).to_list(1)
            if pages: target_page = pages[0]

    # Мягкая проверка — не блокируем отзыв, просто логируем
    is_actually_verified = target_page.get("is_verified", False) if target_page else False
    if not is_actually_verified:
        user = await db.users.find_one({"id": req["user_id"]})
        if user and not user.get("is_verified", False):
            # Не блокируем — разрешаем обновить статус записи для синхронизации
            pass

    await db.verification_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "cancelled", "rejection_reason": rejection.reason}}
    )

    # If it's a personal verification revocation, also cancel all approved brand requests of the same user
    if req.get('req_type') == 'personal':
        await db.verification_requests.update_many(
            {"user_id": req["user_id"], "req_type": "brand", "status": "approved"},
            {"$set": {"status": "cancelled", "rejection_reason": "Автоматическая отмена при отзыве основной верификации"}}
        )

    base_message = "Ваша верификация была отозвана."
    if req.get('req_type') == 'brand' and target_page:
        page_name = target_page.get("name", "N/A")
        base_message = f"Ваша верификация страницы {page_name} была отозвана."

    reason_text = f"\nПричина: {rejection.reason}" if rejection.reason and rejection.reason.strip() else ""
    message = base_message + reason_text

    if req.get('req_type') == 'brand' and req.get('page_id'):
        # Brand: Revoke specific page ONLY
        await db.pages.update_one(
            {"id": req["page_id"]},
            {"$set": {"is_verified": False, "brand_status": "rejected"}}
        )
    else:
        # Personal/Main: CASCADING REVOKE
        # 1. Update USER object
        await db.users.update_one(
            {"id": req["user_id"]},
            {"$set": {"is_verified": False, "verificationStatus": "cancelled"}}
        )
        # 2. Update ALL pages of the user (including brand pages)
        await db.pages.update_many(
            {"user_id": req["user_id"]},
            {"$set": {"is_verified": False, "is_brand": False, "brand_status": "rejected"}}
        )

    notification = {
        "id": str(uuid.uuid4()),
        "user_id": req["user_id"],
        "type": "verification",
        "message": message,
        "read": False,
        "created_at": datetime.now().isoformat()
    }
    await db.notifications.insert_one(notification)
    
    # Notify on ALL user pages (cascading revoke)
    user_pages = await db.pages.find({"user_id": req["user_id"]}, {"username": 1}).to_list(100)
    for p in user_pages:
        await manager.notify_page_update(p["username"])
        
    return {"status": "revoked"}

@api_router.post("/admin/verification/{request_id}/resume")
async def resume_verification_request(request_id: str, current_admin: dict = Depends(get_current_admin)):
    req = await db.verification_requests.find_one({"id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    await db.verification_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "pending",
            "rejection_reason": None
        }}
    )
    
    return {"status": "success", "message": "Заявка возобновлена"}

@api_router.delete("/admin/verification/{request_id}")
async def delete_verification_request(request_id: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.verification_requests.delete_one({"id": request_id})
    # Compatibility with both mock_db (returns bool) and Motor (returns DeleteResult)
    deleted = result if isinstance(result, bool) else (getattr(result, 'deleted_count', 0) > 0)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return {"status": "deleted"}

@api_router.post("/admin/users/{user_id}/verify")
async def grant_direct_verification(user_id: str, current_admin: dict = Depends(get_current_admin)):
    # 1. Update user collection
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
        
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_verified": True}}
    )

    # 2. Update the Main Page of the user
    main_page = await db.pages.find_one({"user_id": user_id, "is_main_page": True})
    if not main_page:
        # Fallback to the first page
        pages = await db.pages.find({"user_id": user_id}).sort("created_at", 1).to_list(1)
        if pages:
            main_page = pages[0]
            await db.pages.update_one({"id": main_page["id"]}, {"$set": {"is_main_page": True}})
    
    page_username = "N/A"
    if main_page:
        await db.pages.update_one(
            {"id": main_page["id"]},
            {"$set": {"is_verified": True}}
        )
        page_username = main_page.get("username", "N/A")
    
    # 3. Handle verification_requests (for sync with dashboard)
    existing_req = await db.verification_requests.find_one({"user_id": user_id, "status": "pending", "req_type": "personal"})
    if existing_req:
        await db.verification_requests.update_one(
            {"id": existing_req["id"]},
            {"$set": {"status": "approved"}}
        )
    else:
        # Create a proxy request record so it can be revoked later
        new_request = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_email": user.get("email"),
            "page_username": page_username,
            "req_type": "personal",
            "status": "approved",
            "created_at": datetime.now().isoformat()
        }
        await db.verification_requests.insert_one(new_request)

    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "verification",
        "message": "Ваш аккаунт верифицирован администратором.",
        "read": False,
        "created_at": datetime.now().isoformat()
    }
    await db.notifications.insert_one(notification)
    
    # Notify on main page for direct verification
    if main_page:
        await manager.notify_page_update(main_page["username"])
        
    return {"status": "verified"}

class NotificationCampaign(BaseModel):
    id: str
    message: str
    target_type: str  # all, selected, single
    created_at: str
    total_recipients: int
    read_count: int = 0
    
@api_router.post("/admin/notifications/send")
async def send_admin_notification(notification_req: NotificationRequest, current_admin: dict = Depends(get_current_admin)):
    users_to_notify = []
    
    # 1. Select Users
    if notification_req.all_users:
        # Fetch ALL users
        all_users = await db.users.find({}).to_list(None)
        users_to_notify = [u["id"] for u in all_users]
        target_type = "all"
    elif notification_req.user_ids:
        users_to_notify = notification_req.user_ids
        target_type = "selected"
    elif notification_req.emails:
        # Resolving emails to IDs
        found_users = await db.users.find({"email": {"$in": notification_req.emails}}).to_list(None)
        users_to_notify = [u["id"] for u in found_users]
        target_type = "single"

    if not users_to_notify:
        return {"status": "error", "message": "No users found"}

    timestamp = datetime.now().isoformat()
    campaign_id = str(uuid.uuid4())
    
    # 2. Create Campaign Record
    campaign = {
        "id": campaign_id,
        "message": notification_req.message,
        "target_type": target_type,
        "recipient_ids": users_to_notify, # Store who was targeted
        "created_at": timestamp,
        "total_recipients": len(users_to_notify)
    }
    await db.notification_campaigns.insert_one(campaign)

    # 3. Create Individual Notifications linked to Campaign
    notifications = [{
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "campaign_id": campaign_id, # Link to campaign
        "type": "info",
        "message": notification_req.message,
        "read": False,
        "created_at": timestamp
    } for uid in users_to_notify]
    
    await db.notifications.insert_many(notifications)
    return {"status": "sent", "count": len(notifications), "campaign_id": campaign_id}

@api_router.get("/admin/campaigns")
async def get_campaigns(current_admin: dict = Depends(get_current_admin)):
    campaigns = await db.notification_campaigns.find({}).sort("created_at", -1).to_list(50)
    
    # Enrich with read counts dynamically
    results = []
    for camp in campaigns:
        # Count read notifications for this campaign
        read_count = await db.notifications.count_documents({"campaign_id": camp["id"], "read": True})
        camp["read_count"] = read_count
        results.append(camp)
        
    return results

@api_router.get("/admin/campaigns/{campaign_id}")
async def get_campaign_details(campaign_id: str, current_admin: dict = Depends(get_current_admin)):
    campaign = await db.notification_campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Рассылка не найдена")
        
    # Get all notifications for this campaign to see status
    notifications = await db.notifications.find({"campaign_id": campaign_id}).to_list(None)
    
    # Map status by user_id
    status_map = {n["user_id"]: n["read"] for n in notifications}
    
    # Get user details for recipients
    recipients = []
    if "recipient_ids" in campaign:
        users = await db.users.find({"id": {"$in": campaign["recipient_ids"]}}).to_list(None)
        for u in users:
            recipients.append({
                "id": u["id"],
                "email": u["email"],
                "username": u.get("username"),
                "read": status_map.get(u["id"], False)
            })
            
    return {
        "campaign": campaign,
        "recipients": recipients
    }


# ===== Notification Routes =====

@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(50)
    return notifications

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"read": True}}
    )
    return {"status": "ok"}
    
@api_router.delete("/notifications")
async def delete_all_notifications(current_user: dict = Depends(get_current_user)):
    await db.notifications.delete_many({"user_id": current_user["id"]})
    return {"status": "ok"}


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    try:
        response = await call_next(request)
        logger.info(f"Response: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"Request Error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173", # Standard Vite port if used
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-Admin-Password"],
)

@api_router.get("/admin/settings", response_model=GlobalSettings)
async def get_admin_settings(current_user: dict = Depends(get_current_owner)):
    settings_doc = await db.settings.find_one({"_id": "global_config"})
    if not settings_doc:
        return GlobalSettings()
    return GlobalSettings(**settings_doc)

@api_router.patch("/admin/settings", response_model=GlobalSettings)
async def update_admin_settings(
    settings: GlobalSettings, 
    current_user: dict = Depends(get_current_owner)
):
    if settings.welcome_modal_duration < 1 or settings.welcome_modal_duration > 60:
         raise HTTPException(status_code=400, detail="Длительность должна быть от 1 до 60 секунд")
         
    await db.settings.update_one(
        {"_id": "global_config"},
        {"$set": settings.dict()},
        upsert=True
    )
    return settings

@api_router.get("/settings/public", response_model=GlobalSettings)
async def get_public_settings():
    settings_doc = await db.settings.find_one({"_id": "global_config"})
    if not settings_doc:
        return GlobalSettings() # Default
    # We can filter sensitive settings here if needed later
    return GlobalSettings(**settings_doc)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "db": "mock" if USE_MOCK_DB else "mongo"}

app.include_router(api_router)

# Mount static files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()