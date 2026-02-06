from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
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

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

security = HTTPBearer()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ===== Models =====

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str

class PageCreate(BaseModel):
    username: str
    name: str
    bio: Optional[str] = ""
    avatar: Optional[str] = None
    cover: Optional[str] = None

class PageUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    cover: Optional[str] = None

class PageResponse(BaseModel):
    id: str
    user_id: str
    username: str
    name: str
    bio: str
    avatar: Optional[str] = None
    cover: Optional[str] = None
    created_at: str

class BlockCreate(BaseModel):
    page_id: str
    block_type: str  # "link", "text", "music"
    content: Dict[str, Any]
    order: int = 0

class BlockUpdate(BaseModel):
    content: Optional[Dict[str, Any]] = None
    order: Optional[int] = None

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
    button_text: Optional[str] = "Подробнее"
    button_url: Optional[str] = ""

class EventUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    description: Optional[str] = None
    button_text: Optional[str] = None
    button_url: Optional[str] = None

class EventResponse(BaseModel):
    id: str
    page_id: str
    title: str
    date: str
    description: str
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

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

# ===== Helper Functions =====

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

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

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email уже используется")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    if user_data.username:
        existing_username = await db.pages.find_one({"username": user_data.username}, {"_id": 0})
        if not existing_username:
            page = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "username": user_data.username,
                "name": user_data.username,
                "bio": "",
                "avatar": None,
                "cover": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.pages.insert_one(page)
    
    token = create_access_token({"sub": user_id})
    return TokenResponse(access_token=token, user_id=user_id, email=user_data.email)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    
    token = create_access_token({"sub": user["id"]})
    return TokenResponse(access_token=token, user_id=user["id"], email=user["email"])

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

# ===== Pages Routes =====

@api_router.get("/pages", response_model=List[PageResponse])
async def get_user_pages(current_user = Depends(get_current_user)):
    pages = await db.pages.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return pages

@api_router.post("/pages", response_model=PageResponse)
async def create_page(page_data: PageCreate, current_user = Depends(get_current_user)):
    existing = await db.pages.find_one({"username": page_data.username}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Username уже занят")
    
    page = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "username": page_data.username,
        "name": page_data.name,
        "bio": page_data.bio or "",
        "avatar": page_data.avatar,
        "cover": page_data.cover,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.pages.insert_one(page)
    return PageResponse(**page)

@api_router.get("/pages/{username}", response_model=Dict[str, Any])
async def get_page_by_username(username: str):
    page = await db.pages.find_one({"username": username}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Страница не найдена")
    
    blocks = await db.blocks.find({"page_id": page["id"]}, {"_id": 0}).sort("order", 1).to_list(100)
    events = await db.events.find({"page_id": page["id"]}, {"_id": 0}).to_list(100)
    showcases = await db.showcases.find({"page_id": page["id"]}, {"_id": 0}).to_list(100)
    
    return {
        "page": page,
        "blocks": blocks,
        "events": events,
        "showcases": showcases
    }

@api_router.patch("/pages/{page_id}", response_model=PageResponse)
async def update_page(page_id: str, updates: PageUpdate, current_user = Depends(get_current_user)):
    page = await db.pages.find_one({"id": page_id, "user_id": current_user["id"]}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Страница не найдена")
    
    update_data = {k: v for k, v in updates.dict(exclude_unset=True).items() if v is not None}
    if update_data:
        await db.pages.update_one({"id": page_id}, {"$set": update_data})
    
    updated_page = await db.pages.find_one({"id": page_id}, {"_id": 0})
    return PageResponse(**updated_page)

@api_router.delete("/pages/{page_id}")
async def delete_page(page_id: str, current_user = Depends(get_current_user)):
    page = await db.pages.find_one({"id": page_id, "user_id": current_user["id"]}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Страница не найдена")
    
    await db.pages.delete_one({"id": page_id})
    await db.blocks.delete_many({"page_id": page_id})
    await db.events.delete_many({"page_id": page_id})
    await db.showcases.delete_many({"page_id": page_id})
    
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
    return BlockResponse(**block)

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
        "button_text": event_data.button_text or "Подробнее",
        "button_url": event_data.button_url or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.events.insert_one(event)
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
    return {"message": "Витрина удалена"}

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
                        
                        entity_id = result.get("entityUniqueId", "")
                        entities = result.get("entitiesByUniqueId", {})
                        links = result.get("linksByPlatform", {})
                        
                        entity = entities.get(entity_id, {})
                        
                        platforms = []
                        for platform, link in links.items():
                            platforms.append({
                                "platform": platform,
                                "url": link
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
        return {"success": False, "error": str(e)}

# ===== Upload Routes =====

@api_router.post("/upload")
async def upload_image(file: UploadFile = File(...), current_user = Depends(get_current_user)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Файл должен быть изображением")
    
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="Файл слишком большой (макс. 10MB)")
    
    base64_image = await optimize_image(contents)
    return {"url": base64_image}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()