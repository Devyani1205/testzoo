# 🔬 TestZoo — AI-Powered Diagnostic Test Marketplace

> A full-stack B2B2C marketplace connecting oncologists with companion diagnostic labs via AI search, WhatsApp sharing, and flexible multi-payment checkout.

---

## ✨ Feature Overview

| Category | Features |
|---|---|
| **AI Chat** | Groq (Llama 3) primary · OpenRouter Qwen fallback · Clinical intent extraction · Generative TestCard UI |
| **Test Catalog** | 12 real oncology tests · EGFR, ALK, BRCA, HER2, PDL1, MSI, ctDNA · Sponsored search with bid priority |
| **Doctor Flow** | Natural-language search → TestCard grid → WhatsApp share → Commission tracking |
| **Patient Flow** | WhatsApp link → Checkout page → Promo code → Multi-payment → Order tracking |
| **Payments** | Card (Stripe) · UPI · Net Banking · Cash on Delivery · In-app Wallet |
| **Wallet** | Auto 5% cashback · Referral rewards (₹500 each) · Transaction history |
| **Promo Codes** | SAVE20, FLAT500, NEWUSER, TESTZOO10, CANCER25 · Percentage & fixed discounts |
| **WhatsApp** | Twilio sandbox · Share link · Status updates · Patient reminders |
| **Dashboard** | KPI cards · Recharts trend lines · Top tests · CSV export · Remind patients |
| **FastMCP** | 5 MCP servers exposed as tools on ports 8001–8005 |

---

## 🏗️ Architecture

```
testzoo/
├── backend/                  # Python 3.11 FastAPI + FastMCP
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── config.py         # Pydantic settings (reads .env / testzoo.env)
│   │   ├── models.py         # SQLAlchemy ORM models
│   │   ├── database.py       # Async engine + session factory
│   │   ├── seed_data.py      # Demo data: 12 tests, 3 labs, promo codes
│   │   ├── api/
│   │   │   ├── auth.py       # Register / Login / JWT
│   │   │   ├── chat.py       # AI search + WhatsApp share endpoint
│   │   │   ├── orders.py     # Checkout, payment confirmation, tracking
│   │   │   ├── wallet.py     # Balance, referral, apply-referral
│   │   │   └── dashboard.py  # Doctor stats, CSV export, remind
│   │   ├── services/
│   │   │   ├── llm_service.py       # Groq → OpenRouter fallback
│   │   │   └── whatsapp_service.py  # Twilio WhatsApp send
│   │   └── mcp/
│   │       ├── mcp_catalog_server.py       # Port 8001 — Catalog & sponsored search
│   │       ├── mcp_orders_whatsapp_server.py # Port 8002 — Orders & WhatsApp
│   │       ├── mcp_payment_wallet_server.py  # Port 8003 — Payments, wallet, promos
│   │       ├── mcp_doctor_dashboard_server.py # Port 8004 — Doctor analytics
│   │       └── mcp_patient_server.py         # Port 8005 — Patient portal
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                 # Next.js 14 App Router + Tailwind
│   ├── app/
│   │   ├── page.tsx          # Landing page
│   │   ├── layout.tsx        # Root layout with Toaster
│   │   ├── globals.css       # Tailwind + CSS variables
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── doctor/
│   │   │   ├── layout.tsx    # Doctor sidebar nav
│   │   │   ├── chat/page.tsx     # AI search + TestCard grid + WhatsApp modal
│   │   │   ├── dashboard/page.tsx # KPIs + Recharts + recommendations table
│   │   │   └── wallet/page.tsx   # Balance + referral + transactions
│   │   └── patient/
│   │       ├── checkout/[token]/page.tsx  # Patient checkout with payment
│   │       ├── orders/page.tsx            # Order history
│   │       └── track/[orderId]/page.tsx   # Order timeline tracker
│   ├── lib/api.ts            # Axios client with auth interceptors
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   └── Dockerfile
│
├── testzoo.env               # All environment variables (copy to .env)
├── docker-compose.yml        # Full stack: Postgres + Redis + API + 5 MCP + Frontend
├── start.sh                  # One-command start (macOS/Linux)
├── start_windows.bat         # One-command start (Windows)
└── README.md
```

---

## 🚀 Quick Start

### Option A: Docker Compose (recommended)

```bash
# 1. Clone / unzip the project
cd testzoo

# 2. Edit testzoo.env with your API keys (Groq, Twilio are optional — mock mode works)

# 3. Start everything
docker-compose up --build

# 4. Seed the database
docker-compose exec api python -m app.seed_data
```

Access:
- **Frontend:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs
- **MCP Catalog:** http://localhost:8001

---

### Option B: Local Development (no Docker)

#### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+ (or use the Docker Compose just for the DB)
- Git

#### 1. Database Setup

```bash
# Start just the DB and Redis with Docker Compose
docker-compose up postgres redis -d

# OR install PostgreSQL locally and create the DB:
psql -U postgres
CREATE DATABASE sonu;
CREATE USER workspace_user WITH PASSWORD 'Suni@123';
GRANT ALL PRIVILEGES ON DATABASE sonu TO workspace_user;
\q
```

#### 2. Backend Setup

```bash
cd testzoo/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate       # Linux/Mac
# OR: venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt

# Copy env file
cp ../testzoo.env .env

# Initialize DB and seed demo data
python -m app.seed_data

# Start the FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 3. Start MCP Servers (optional — separate terminals)

```bash
# Each runs as its own HTTP MCP server
python -m app.mcp.mcp_catalog_server        # Port 8001
python -m app.mcp.mcp_orders_whatsapp_server  # Port 8002
python -m app.mcp.mcp_payment_wallet_server   # Port 8003
python -m app.mcp.mcp_doctor_dashboard_server # Port 8004
python -m app.mcp.mcp_patient_server          # Port 8005
```

#### 4. Frontend Setup

```bash
cd testzoo/frontend

# Install dependencies
npm install

# Copy env file
cp ../testzoo.env .env.local

# Start development server
npm run dev
```

#### 5. All-in-one script (Linux/Mac)

```bash
chmod +x start.sh
./start.sh
```

---

## 🔑 Environment Variables

Copy `testzoo.env` to:
- `backend/.env` for the FastAPI server
- `frontend/.env.local` for Next.js

| Variable | Required | Description |
|---|---|---|
| `DB_USER`, `DB_PASS`, `DB_NAME`, `DB_HOST` | ✅ | PostgreSQL connection |
| `SECRET_KEY` | ✅ | JWT signing secret (generate with `python -c "import secrets; print(secrets.token_hex(32))"`) |
| `GROQ_API_KEY` | ⚡ | Primary LLM (fast, free tier). Get at [console.groq.com](https://console.groq.com) |
| `OPENROUTER_API_KEY` | ⚡ | Fallback LLM (Qwen). Get at [openrouter.ai](https://openrouter.ai) |
| `TWILIO_ACCOUNT_SID` | 📱 | WhatsApp via sandbox. Get at [twilio.com](https://twilio.com). **Mock mode works without this.** |
| `TWILIO_AUTH_TOKEN` | 📱 | Twilio auth token |
| `STRIPE_SECRET_KEY` | 💳 | Stripe payments (test mode). **Mock checkout works without this.** |
| `STRIPE_PUBLISHABLE_KEY` | 💳 | Stripe frontend key |

> ⚡ = Highly recommended · 📱 = Needed for real WhatsApp sends · 💳 = Needed for real card payments

---

## 👤 Demo Accounts

| Role | Email | Password |
|---|---|---|
| Doctor | `dr.mehta@testzoo.demo` | `Doctor@123` |
| Doctor | `dr.sharma@testzoo.demo` | `Doctor@123` |
| Patient | `patient.ravi@testzoo.demo` | `Patient@123` |

---

## 🎟️ Demo Promo Codes

| Code | Discount | Min Order | Max Discount |
|---|---|---|---|
| `SAVE20` | 20% off | ₹1,000 | ₹500 |
| `FLAT500` | ₹500 flat | ₹2,000 | — |
| `NEWUSER` | 15% off | None | — |
| `TESTZOO10` | 10% off | None | — |
| `CANCER25` | 25% off | ₹5,000 | ₹1,000 |

---

## 🧬 Diagnostic Tests Catalog

| Test | Category | MRP | Patient Price |
|---|---|---|---|
| EGFR Mutation Analysis (NGS Panel) | Molecular Oncology | ₹25,000 | ₹14,760 |
| ALK/ROS1 Fusion Detection (IHC + FISH) | Molecular Oncology | ₹32,000 | ₹20,400 |
| BRCA1/BRCA2 Germline Sequencing | Hereditary Cancer | ₹45,000 | ₹28,160 |
| HER2 Amplification (FISH + IHC) | Breast Oncology | ₹28,000 | ₹16,150 |
| Comprehensive 500 Gene Panel (NGS) | Comprehensive Genomics | ₹85,000 | ₹54,000 |
| KRAS/NRAS/BRAF Codon Mutation Test | Colorectal Oncology | ₹18,000 | ₹10,200 |
| PDL1 Expression (22C3 PharmDx) | Immunotherapy Biomarkers | ₹15,000 | ₹9,350 |
| Liquid Biopsy ctDNA Panel (70 Genes) | Liquid Biopsy | ₹35,000 | ₹22,880 |
| Chromosomal Microarray (CMA) | Cytogenomics | ₹38,000 | ₹23,760 |
| Oncotype DX Breast (21-Gene Score) | Breast Oncology | ₹55,000 | ₹36,800 |
| BCR-ABL Quantitative PCR (IS Scale) | Hematology Oncology | ₹12,000 | ₹7,200 |
| MSI / MMR Deficiency (IHC Panel) | Immunotherapy Biomarkers | ₹16,000 | ₹9,350 |

---

## 🔌 FastMCP Servers

All 5 MCP servers expose structured **tools**, **resources**, and **prompts** via the FastMCP HTTP transport. They can be connected to Claude, GPT-4, or any MCP-compatible AI agent.

### MCP Server 1 — Catalog (Port 8001)
**`search_diagnostic_tests`** — ranked test search with sponsored boosting  
**`get_test_detail`** — full pricing, lab info, and clinical metadata  
**Resource:** `testzoo://catalog/stats` — catalog statistics  
**Prompt:** `clinical_case_to_test_query` — case → structured search params

### MCP Server 2 — Orders & WhatsApp (Port 8002)
**`create_whatsapp_share_link`** — generate token + send WhatsApp → returns `ShareConfirmationCard`  
**`get_order_status`** — live timeline with step completion status  
**`add_test_to_order`** — on-the-spot add-on during sample collection  
**`remind_patient`** — resend WhatsApp reminder

### MCP Server 3 — Payment & Wallet (Port 8003)
**`initiate_payment`** — multi-method: Stripe card / UPI / wallet / COD  
**`apply_promo_code`** — validate + deduct → returns updated `PriceBreakdownCard`  
**`get_wallet_balance`** — balance + transaction history  
**`create_referral_code`** — generate or fetch referral + WhatsApp share URL

### MCP Server 4 — Doctor Dashboard (Port 8004)
**`get_doctor_kpis`** — total recs, conversions, commission, pending follow-ups  
**`get_recommendation_history`** — paginated table with status, pricing, share links  
**`get_conversion_trends`** — monthly chart data (recommendations vs. conversions)  
**`export_recommendations_csv`** — full CSV string for download

### MCP Server 5 — Patient Portal (Port 8005)
**`get_checkout_details`** — load checkout via share token (marks as viewed)  
**`get_patient_orders`** — order history with lab info  
**`get_order_tracking`** — full timeline (7-step status)

---

## 💊 Doctor Flow (Step by Step)

1. **Login** → `dr.mehta@testzoo.demo / Doctor@123`
2. **AI Search** → Type a case: *"70M lung mass, EGFR mutation, smoker, stage IIIB"*
3. **Review TestCards** → See ranked cards with B2B vs patient pricing, lab, biomarkers
4. **Share** → Click "Share via WhatsApp" → Enter patient phone → AI generates clinical reasoning → Twilio sends the link
5. **Dashboard** → Track conversion status, commission, monthly trends
6. **Remind** → One-click WhatsApp reminder for pending patients
7. **Export** → Download full recommendation history as CSV

---

## 🛒 Patient Flow (Step by Step)

1. Receive WhatsApp message from doctor
2. Click the link → Opens `/patient/checkout/[token]`
3. Read test details, doctor's clinical note, and pricing
4. Apply promo code (optional) — try `SAVE20`
5. Select payment method (Card / UPI / COD / Wallet)
6. Pay → Order confirmed → Track at `/patient/track/[orderId]`
7. Phlebotomist schedules home collection
8. Report delivered digitally
9. 5% cashback credited to TestZoo wallet

---

## 💳 Payment Architecture

```
Patient selects payment method
        │
        ├── Card/UPI/Netbanking → Stripe PaymentIntent (live if STRIPE_SECRET_KEY set)
        │                         → Mock checkout UI (if key not configured)
        │
        ├── Wallet → Deduct from wallet balance → remainder via other method
        │
        └── COD → Order confirmed immediately → pay phlebotomist on collection
```

**Promo + Wallet stacking:**
```
MRP ₹25,000
  - 18% B2B discount     = ₹4,500
  - SAVE20 promo (20%)   = ₹4,152
  - Wallet ₹500          = ₹500
  ──────────────────────────────
  Final amount           ₹15,848
```

---

## 🤖 AI Pipeline

```
Doctor types case description
        ↓
extract_clinical_intent()
  → Groq (llama-3.1-8b-instant) primary
  → OpenRouter (qwen/qwen3.7-plus) fallback
  → Returns: { query, cancer_type, biomarkers[], urgency, clinical_summary }
        ↓
Sponsored search (bid priority + keyword match)
  + Organic search (semantic match)
        ↓
Scored + ranked TestCard list
        ↓
generate_recommendation_reasoning()
  → Per-test clinical justification for WhatsApp message
        ↓
Generative UI: RecommendationGrid component
```

---

## 🗃️ Database Schema

| Table | Purpose |
|---|---|
| `users` | Doctors and patients (user_type enum) |
| `doctor_profiles` | License, specialty, hospital, commission stats |
| `patient_profiles` | Demographics, medical history |
| `labs` | Partner labs with accreditation |
| `tests` | Test catalog with pricing tiers and sponsored metadata |
| `recommendations` | Doctor → patient test sharing records |
| `orders` | Full order lifecycle with payment details |
| `wallets` | Per-user wallet balance |
| `wallet_transactions` | Ledger: credit, debit, cashback, referral |
| `promo_codes` | Discount codes with usage limits |
| `referrals` | Referral code tracking with conversion stats |
| `chat_history` | AI conversation sessions per doctor |

---

## 📡 API Endpoints

### Authentication
```
POST /api/v1/auth/register     — Create doctor or patient account
POST /api/v1/auth/login        — Login → JWT token
```

### Doctor Chat
```
POST /api/v1/chat/query        — AI search: returns TestCard grid
POST /api/v1/chat/share        — Send WhatsApp link to patient
GET  /api/v1/chat/history      — Chat session history
```

### Patient Orders
```
GET  /api/v1/orders/checkout/{token}      — Load checkout page details
POST /api/v1/orders/create                — Create order
POST /api/v1/orders/{id}/confirm-payment  — Confirm payment + credit cashback
GET  /api/v1/orders/{id}/track            — Order tracking timeline
```

### Wallet
```
GET  /api/v1/wallet/balance           — Balance + transaction history
GET  /api/v1/wallet/referral          — Referral code + stats + WhatsApp link
POST /api/v1/wallet/apply-referral    — Apply referral code → credit both users
```

### Doctor Dashboard
```
GET  /api/v1/dashboard/doctor/stats          — KPIs + recent recommendations
POST /api/v1/dashboard/doctor/remind/{id}    — Resend WhatsApp reminder
GET  /api/v1/dashboard/doctor/export-csv     — Download recommendations CSV
```

---

## 🔧 Troubleshooting

### Database connection refused
```bash
# Make sure PostgreSQL is running
docker-compose up postgres -d
# OR check your DB_HOST / DB_PORT in .env
```

### "Module not found" errors
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### WhatsApp messages not sending
- Add your phone number to Twilio WhatsApp sandbox at [twilio.com/console](https://console.twilio.com)
- Text "join [sandbox-word]" to `+1 415 523 8886`
- Without Twilio credentials, the system runs in **mock mode** (logs to console)

### LLM not responding
- Without GROQ_API_KEY, the system uses a **built-in mock fallback** that still returns test recommendations
- Get a free Groq key at [console.groq.com](https://console.groq.com)

### Frontend not connecting to backend
- Ensure `NEXT_PUBLIC_API_URL=http://localhost:8000` is set in `frontend/.env.local`
- Check that the backend is running on port 8000

---

## 🛡️ Security Notes

- JWT tokens expire after 7 days
- Promo codes have usage limits and expiry dates
- Share links expire after 7 days
- Wallet operations are atomic with before/after balance tracking
- No credentials are hardcoded in source code — all from environment variables

---

## 📄 License

MIT License — See LICENSE file for details.

---

## 🙏 Built With

- [FastAPI](https://fastapi.tiangolo.com/) — Backend framework
- [FastMCP](https://github.com/jlowin/fastmcp) — MCP server framework
- [Next.js 14](https://nextjs.org/) — Frontend framework
- [Tailwind CSS](https://tailwindcss.com/) — Styling
- [Recharts](https://recharts.org/) — Charts
- [Groq](https://groq.com/) — LLM inference
- [Twilio](https://twilio.com/) — WhatsApp messaging
- [Stripe](https://stripe.com/) — Payments
- [Framer Motion](https://www.framer.com/motion/) — Animations
