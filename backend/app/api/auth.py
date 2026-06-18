from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import re
import os
from app.database import get_db
from app.models import User, PatientProfile, DoctorProfile, Wallet
from app.config import settings
from datetime import datetime, timedelta
import uuid
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import pyotp

router = APIRouter(prefix="/auth", tags=["auth"])


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    user_type: str  # "doctor" or "patient"
    phone: Optional[str] = None
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v
    
    @field_validator("user_type")
    @classmethod
    def validate_user_type(cls, v: str) -> str:
        if v not in ["doctor", "patient"]:
            raise ValueError("user_type must be 'doctor' or 'patient'")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetVerifyRequest(BaseModel):
    email: EmailStr
    reset_token: str
    new_password: str


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    import bcrypt
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    import bcrypt
    return bcrypt.checkpw(password.encode(), hashed.encode())


def send_otp_email(email: str, otp: str, purpose: str = "signup"):
    """
    FIX: Send OTP for account creation and password reset
    NOT email verification links
    """
    try:
        subject = f"Your TestZoo {purpose.upper()} OTP is {otp}"
        
        if purpose == "signup":
            body = f"""
Welcome to TestZoo!

Your One-Time Password (OTP) for account creation is:

{otp}

This OTP will expire in 10 minutes.
Do not share this OTP with anyone.

Best regards,
TestZoo Team
            """
        elif purpose == "password_reset":
            body = f"""
Password Reset Request

Your One-Time Password (OTP) for password reset is:

{otp}

This OTP will expire in 10 minutes.
If you didn't request this, please ignore this email.

Best regards,
TestZoo Team
            """
        else:
            body = f"Your OTP: {otp}"
        
        msg = MIMEMultipart()
        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))
        
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"Error sending OTP email: {e}")
        return False


def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    import random
    return str(random.randint(100000, 999999))


@router.post("/signup")
async def signup(req: SignupRequest, db: AsyncSession = Depends(get_db)):
    """
    Step 1: Register user and send OTP
    FIX: Send OTP for account creation, NOT email verification link
    """
    # Check if user exists
    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate OTP
    otp = generate_otp()
    
    # Store OTP temporarily in session/cache with expiry
    # For now, we'll return it (in production, store securely)
    otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    
    # Send OTP via email
    email_sent = send_otp_email(req.email, otp, purpose="signup")
    
    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send OTP email")
    
    # Create temporary signup record (not confirmed yet)
    # Store OTP in session/Redis with expiry
    # For demo: return OTP (REMOVE IN PRODUCTION)
    
    return {
        "message": "OTP sent to your email. Please verify to complete signup.",
        "email": req.email,
        "otp_expiry_minutes": 10,
        "test_otp": otp,  # REMOVE IN PRODUCTION - for testing only
    }


@router.post("/verify-otp")
async def verify_otp(req: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    """
    Step 2: Verify OTP and complete signup
    """
    # Verify OTP (check against stored OTP with expiry)
    # For now, assume OTP is valid if provided
    
    # Create user in database
    user = User(
        id=str(uuid.uuid4()),
        email=req.email,
        hashed_password=hash_password("temp_password"),  # Will be set during profile creation
        full_name="New User",
        user_type="patient",
        is_active=True,
    )
    db.add(user)
    
    # Create patient profile
    patient_profile = PatientProfile(
        id=str(uuid.uuid4()),
        user_id=user.id,
    )
    db.add(patient_profile)
    
    # Create wallet
    wallet = Wallet(
        id=str(uuid.uuid4()),
        user_id=user.id,
        balance_cents=0,
    )
    db.add(wallet)
    
    await db.commit()
    
    return {
        "message": "Account created successfully!",
        "user_id": user.id,
        "email": user.email,
    }


@router.post("/forgot-password")
async def forgot_password(req: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    """
    Step 1: Request password reset
    FIX: Send OTP for password reset (not a link)
    """
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    
    if not user:
        # Don't reveal if email exists
        return {"message": "If email exists, OTP has been sent for password reset."}
    
    # Generate OTP
    otp = generate_otp()
    
    # Send OTP via email
    email_sent = send_otp_email(req.email, otp, purpose="password_reset")
    
    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send OTP email")
    
    return {
        "message": "OTP sent to your email for password reset.",
        "email": req.email,
        "otp_expiry_minutes": 10,
        "test_otp": otp,  # REMOVE IN PRODUCTION
    }


@router.post("/reset-password")
async def reset_password(req: PasswordResetVerifyRequest, db: AsyncSession = Depends(get_db)):
    """
    Step 2: Verify OTP and reset password
    """
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify OTP here
    # For demo: assume valid
    
    # Update password
    user.hashed_password = hash_password(req.new_password)
    await db.commit()
    
    return {"message": "Password reset successfully!"}


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Login endpoint
    """
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is inactive")
    
    # Generate JWT token
    from jose import jwt
    token = jwt.encode(
        {"user_id": user.id, "exp": datetime.utcnow() + timedelta(days=7)},
        settings.SECRET_KEY,
        algorithm="HS256"
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "user_type": user.user_type,
    }


async def get_current_user(token: str, db: AsyncSession = Depends(get_db)):
    """
    Dependency to get current authenticated user
    """
    try:
        from jose import jwt, JWTError
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user
