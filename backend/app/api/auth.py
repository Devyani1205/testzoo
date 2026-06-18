from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import re
from app.database import get_db
from app.models import User, DoctorProfile, PatientProfile, Wallet, Referral
from app.utils.auth import verify_password, get_password_hash, create_access_token, decode_token
import uuid, secrets
from app.services.email_service import send_password_reset_email, send_welcome_email

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

_reset_tokens: dict[str, str] = {}

PASSWORD_RE = re.compile(r'^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]).{8,}$')


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    user_type: str
    phone: Optional[str] = None
    license_number: Optional[str] = None
    specialty: Optional[str] = None
    hospital_name: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not PASSWORD_RE.match(v):
            raise ValueError("Password must be ≥8 chars with at least one number and one special character")
        return v

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        if not re.match(r"^[A-Za-z\s\.\-']+$", v.strip()):
            raise ValueError("Full name must contain only letters and spaces")
        return v.strip()

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        digits_only = re.sub(r'\D', '', v)
        if len(digits_only) != 10:
            raise ValueError("Phone number must be exactly 10 digits")
        return digits_only


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    user_type: str
    full_name: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not PASSWORD_RE.match(v):
            raise ValueError("Password must be ≥8 chars with at least one number and one special character")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not PASSWORD_RE.match(v):
            raise ValueError("Password must be ≥8 chars with at least one number and one special character")
        return v


@router.post("/register", response_model=TokenResponse)
async def register(
    req: RegisterRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        id=str(uuid.uuid4()),
        email=req.email,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        user_type=req.user_type,
        phone=req.phone,
    )
    db.add(user)

    wallet = Wallet(id=str(uuid.uuid4()), user_id=user.id, balance_cents=0)
    db.add(wallet)

    referral_code = f"TZ-{secrets.token_hex(3).upper()}"
    referral = Referral(id=str(uuid.uuid4()), user_id=user.id, referral_code=referral_code)
    db.add(referral)

    if req.user_type == "doctor":
        profile = DoctorProfile(
            id=str(uuid.uuid4()),
            user_id=user.id,
            license_number=req.license_number or f"LIC-{uuid.uuid4().hex[:8].upper()}",
            specialty=req.specialty or "General Medicine",
            hospital_name=req.hospital_name,
        )
        db.add(profile)
    elif req.user_type == "patient":
        profile = PatientProfile(id=str(uuid.uuid4()), user_id=user.id)
        db.add(profile)

    await db.commit()

    background_tasks.add_task(send_welcome_email, req.email, req.full_name)

    token = create_access_token({"sub": user.id, "user_type": user.user_type})
    return TokenResponse(access_token=token, user_id=user.id, user_type=user.user_type, full_name=user.full_name)


@router.post("/login", response_model=TokenResponse)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.id, "user_type": user.user_type})
    return TokenResponse(access_token=token, user_id=user.id, user_type=user.user_type, full_name=user.full_name)


@router.post("/forgot-password")
async def forgot_password(
    req: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if user:
        token = secrets.token_urlsafe(32)
        _reset_tokens[token] = user.id
        background_tasks.add_task(send_password_reset_email, user.email, user.full_name, token)
    return {"message": "If that email is registered, a password reset link has been sent."}


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    user_id = _reset_tokens.get(req.token)
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(req.new_password)
    del _reset_tokens[req.token]
    await db.commit()
    return {"message": "Password updated successfully"}


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(lambda token=Depends(oauth2_scheme), db=Depends(get_db): get_current_user(token, db)),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    current_user.hashed_password = get_password_hash(req.new_password)
    await db.commit()
    return {"message": "Password changed successfully"}


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
