# TestZoo Backend - Migration & Setup Guide

## Setup Instructions

### 1. Environment Configuration
```bash
cp backend/.env.example backend/.env
# Edit .env with your actual credentials
```

### 2. Required Credentials

#### SMTP (for OTP emails)
- Gmail: Enable "App Passwords" in Google Account settings
- Or use SendGrid, Mailgun, etc.

#### WhatsApp
- Sign up for Twilio WhatsApp API or Vonage
- Get API credentials and phone number

#### Stripe (Payment)
- Create Stripe account and get API keys

### 3. Database Setup
```bash
cd backend
python -m alembic upgrade head
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Run Server
```bash
uvicorn app.main:app --reload
```

## Critical Bug Fixes Applied

### ✅ Issue #2 & #6 - Fixed
**AttributeError: 'Test' object has no attribute 'lab_name'**
- Root cause: Test model has `lab_id`, not `lab_name`
- Solution: Added Lab table joins to fetch lab name
- Endpoints fixed:
  - GET /api/v1/orders/patient/my-orders
  - GET /api/v1/orders/track/{order_id}
  - GET /api/v1/orders/doctor/export-csv

### ✅ Issue #1 - Fixed
**OTP Not Sending (Only Links)**
- Changed authentication to use OTP instead of links
- Signup: Sends 6-digit OTP to email
- Password Reset: Sends 6-digit OTP to email
- OTP expires in 10 minutes
- New endpoints:
  - POST /api/v1/auth/signup → Sends OTP
  - POST /api/v1/auth/verify-otp → Completes signup
  - POST /api/v1/auth/forgot-password → Sends OTP
  - POST /api/v1/auth/reset-password → Resets with OTP

### ✅ Issue #3 & #7 - Fixed
**WhatsApp Link Not Delivered (Status 200 but not received)**
- Root cause: Only checked HTTP status, not actual delivery
- Solution: Only mark as 'sent' AFTER WhatsApp API confirms
- Now properly verifies WhatsApp delivery before updating status
- Dashboard records only appear when WhatsApp delivery succeeds
- Proper error handling with fallback

### ✅ Issue #5 - Fixed
**Dashboard Shows Records Even When Link Not Sent**
- Recommendation status flow:
  1. `recommended` - Created but not sent
  2. `sent` - Only after WhatsApp delivery confirmed
  3. `patient_viewed` - Patient opens link
  4. `paid` - Payment completed
- Records only visible in dashboard when status >= 'sent'

### ⏳ Issue #4 - Frontend Cleanup
**UI: Remove three-dot menu, duplicate logout buttons**
- Create separate frontend PR to:
  - Remove hamburger menu (three-dot button)
  - Remove duplicate logout/sign-out buttons
  - Consolidate navigation menu

## Testing Checklist

- [ ] Test OTP signup: Should receive OTP email within 1 minute
- [ ] Test OTP password reset: Should receive reset OTP email
- [ ] Test patient order loading: Should see orders without 500 error
- [ ] Test order tracking: Should display lab name correctly
- [ ] Test CSV export: Should download without error
- [ ] Test WhatsApp share: Should only mark as sent after delivery
- [ ] Test dashboard: Records only appear when link successfully sent

## Environment Variables Required

```
DATABASE_URL=your_database_url
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email
SMTP_PASSWORD=your_app_password
WHATSAPP_API_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER=+1234567890
STRIPE_SECRET_KEY=sk_test_xxx
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

## API Endpoints Updated

### Authentication
- POST `/api/v1/auth/signup` - Send OTP
- POST `/api/v1/auth/verify-otp` - Verify OTP + Create Account
- POST `/api/v1/auth/forgot-password` - Send Reset OTP
- POST `/api/v1/auth/reset-password` - Reset with OTP
- POST `/api/v1/auth/login` - Login

### Orders
- GET `/api/v1/orders/patient/my-orders` - ✅ Fixed
- GET `/api/v1/orders/track/{order_id}` - ✅ Fixed
- GET `/api/v1/orders/doctor/export-csv` - ✅ Fixed
- GET `/api/v1/orders/checkout/{share_token}` - Works
- POST `/api/v1/orders/create` - Works

### Chat & Sharing
- POST `/api/v1/chat/share` - ✅ Fixed: Only marks 'sent' after WhatsApp delivery

## Next Steps

1. **Update .env file** with your credentials
2. **Run database migrations**
3. **Test all endpoints** using provided checklist
4. **Create frontend PR** for UI cleanup (Issue #4)
5. **Deploy to production**
