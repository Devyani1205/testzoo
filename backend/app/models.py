from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime,
    ForeignKey, Text, JSON, Enum as SAEnum, DECIMAL, ARRAY
)
from sqlalchemy.orm import DeclarativeBase, relationship
from datetime import datetime
import uuid


class Base(DeclarativeBase):
    pass


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    user_type = Column(SAEnum("doctor", "patient", "admin", name="user_type_enum"), index=True)
    phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    doctor_profile = relationship("DoctorProfile", back_populates="user", uselist=False)
    patient_profile = relationship("PatientProfile", back_populates="user", uselist=False)
    wallet = relationship("Wallet", back_populates="user", uselist=False)
    referral = relationship("Referral", back_populates="user", uselist=False)


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    license_number = Column(String, unique=True)
    specialty = Column(String)
    hospital_name = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    total_recommendations = Column(Integer, default=0)
    conversion_rate = Column(Float, default=0.0)
    total_commission = Column(DECIMAL(10, 2), default=0)

    user = relationship("User", back_populates="doctor_profile")
    recommendations = relationship("Recommendation", back_populates="doctor")
    chat_histories = relationship("ChatHistory", back_populates="doctor")


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    date_of_birth = Column(DateTime, nullable=True)
    gender = Column(String, nullable=True)
    medical_history = Column(Text, nullable=True)

    user = relationship("User", back_populates="patient_profile")
    orders = relationship("Order", back_populates="patient")


class Lab(Base):
    __tablename__ = "labs"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, unique=True, index=True)
    logo_url = Column(String, nullable=True)
    description = Column(Text)
    city = Column(String)
    accreditation = Column(String)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    tests = relationship("Test", back_populates="lab")


class Test(Base):
    __tablename__ = "tests"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, index=True, nullable=False)
    description = Column(Text)
    category = Column(String, index=True)
    biomarkers = Column(JSON, default=list)
    test_type = Column(String)
    turnaround_days = Column(Integer, default=5)
    sample_type = Column(String, default="Blood")
    home_collection = Column(Boolean, default=True)

    mrp_cents = Column(Integer, nullable=False)
    b2b_price_cents = Column(Integer, nullable=False)
    lab_commission_percent = Column(Float, default=10.0)
    patient_discount_percent = Column(Float, default=15.0)

    lab_id = Column(String, ForeignKey("labs.id"))
    is_sponsored = Column(Boolean, default=False)
    sponsored_bid_priority = Column(Integer, default=0)
    sponsored_keywords = Column(JSON, default=list)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    lab = relationship("Lab", back_populates="tests")
    recommendations = relationship("Recommendation", back_populates="test")
    orders = relationship("Order", back_populates="test")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String, primary_key=True, default=gen_uuid)
    doctor_id = Column(String, ForeignKey("doctor_profiles.id"))
    test_id = Column(String, ForeignKey("tests.id"))
    patient_name = Column(String, nullable=True)
    patient_phone = Column(String, nullable=True)
    case_description = Column(Text)
    clinical_reasoning = Column(Text, nullable=True)
    status = Column(
        SAEnum("recommended", "sent", "patient_viewed", "paid", "completed", "cancelled", name="rec_status_enum"),
        default="recommended"
    )
    share_link = Column(String, unique=True, nullable=True)
    share_token = Column(String, unique=True, nullable=True)
    whatsapp_status = Column(String, default="pending")
    expires_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    doctor = relationship("DoctorProfile", back_populates="recommendations")
    test = relationship("Test", back_populates="recommendations")
    orders = relationship("Order", back_populates="recommendation")


class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, default=gen_uuid)
    recommendation_id = Column(String, ForeignKey("recommendations.id"), nullable=True)
    doctor_id = Column(String, ForeignKey("doctor_profiles.id"), nullable=True)
    patient_id = Column(String, ForeignKey("patient_profiles.id"), nullable=True)
    test_id = Column(String, ForeignKey("tests.id"), nullable=False)

    mrp_cents = Column(Integer, nullable=False)
    b2b_price_cents = Column(Integer, nullable=False)
    patient_discount_percent = Column(Float, default=15.0)
    patient_price_cents = Column(Integer, nullable=False)
    promo_discount_cents = Column(Integer, default=0)
    wallet_used_cents = Column(Integer, default=0)
    final_amount_cents = Column(Integer, nullable=False)

    payment_method = Column(String, default="card")
    payment_status = Column(
        SAEnum("pending", "paid", "failed", "refunded", name="payment_status_enum"),
        default="pending"
    )
    order_status = Column(
        SAEnum("pending", "paid", "sample_collected", "processing", "report_ready", "completed", "cancelled", name="order_status_enum"),
        default="pending"
    )

    stripe_payment_intent_id = Column(String, nullable=True)
    razorpay_order_id = Column(String, nullable=True)
    promo_code_used = Column(String, nullable=True)

    doctor_commission_cents = Column(Integer, default=0)
    cod_paid_at_collection = Column(Boolean, default=False)

    report_url = Column(String, nullable=True)
    collection_address = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    recommendation = relationship("Recommendation", back_populates="orders")
    patient = relationship("PatientProfile", back_populates="orders")
    test = relationship("Test", back_populates="orders")


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    balance_cents = Column(Integer, default=0)
    currency = Column(String, default="INR")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="wallet")
    transactions = relationship("WalletTransaction", back_populates="wallet")


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(String, primary_key=True, default=gen_uuid)
    wallet_id = Column(String, ForeignKey("wallets.id"))
    transaction_type = Column(SAEnum("CREDIT", "DEBIT", "CASHBACK", "REFERRAL", "PROMO", "REFUND", name="wallet_tx_enum"))
    amount_cents = Column(Integer, nullable=False)
    balance_before_cents = Column(Integer, nullable=False)
    balance_after_cents = Column(Integer, nullable=False)
    reference_type = Column(String, nullable=True)
    reference_id = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    wallet = relationship("Wallet", back_populates="transactions")


class Referral(Base):
    __tablename__ = "referrals"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    referral_code = Column(String, unique=True, nullable=False)
    total_reward_cents = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    successful_conversions = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="referral")


class PromoCode(Base):
    __tablename__ = "promo_codes"

    id = Column(String, primary_key=True, default=gen_uuid)
    code = Column(String, unique=True, nullable=False)
    discount_type = Column(SAEnum("PERCENTAGE", "FIXED", name="discount_type_enum"))
    discount_value = Column(Integer, nullable=False)
    minimum_order_cents = Column(Integer, default=0)
    maximum_discount_cents = Column(Integer, nullable=True)
    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime, nullable=True)
    usage_limit = Column(Integer, nullable=True)
    used_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(String, primary_key=True, default=gen_uuid)
    doctor_id = Column(String, ForeignKey("doctor_profiles.id"), index=True)
    session_id = Column(String, index=True)
    user_message = Column(Text)
    assistant_response = Column(JSON)
    pipeline_state = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    doctor = relationship("DoctorProfile", back_populates="chat_histories")
