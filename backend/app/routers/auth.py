from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from bson import ObjectId
from app.models import CompanyCreate, CompanyLogin, CompanyOut, Token
from app.auth import hash_password, verify_password, create_access_token, get_current_company
from app.database import get_db

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _serialize_company(doc: dict) -> CompanyOut:
    return CompanyOut(
        id=str(doc["_id"]),
        name=doc["name"],
        email=doc["email"],
        industry=doc.get("industry"),
        website=doc.get("website"),
        logo_url=doc.get("logo_url"),
        created_at=doc["created_at"],
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_company(payload: CompanyCreate):
    db = get_db()

    # Check email uniqueness
    existing = await db.companies.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    doc = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "industry": payload.industry,
        "website": payload.website,
        "logo_url": payload.logo_url,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.companies.insert_one(doc)
    doc["_id"] = result.inserted_id

    token = create_access_token({"sub": str(result.inserted_id)})
    return Token(access_token=token, company=_serialize_company(doc))


@router.post("/login", response_model=Token)
async def login_company(payload: CompanyLogin):
    db = get_db()
    company = await db.companies.find_one({"email": payload.email})
    if not company or not verify_password(payload.password, company["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(company["_id"])})
    return Token(access_token=token, company=_serialize_company(company))


@router.get("/me", response_model=CompanyOut)
async def get_me(current_company: dict = Depends(get_current_company)):
    return _serialize_company(current_company)
