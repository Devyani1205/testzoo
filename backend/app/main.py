from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db
from app.api import auth, chat, orders, wallet, dashboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="TestZoo — Diagnostic Test Marketplace API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(orders.router, prefix=settings.API_V1_STR)
app.include_router(wallet.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "TestZoo API"}


@app.get("/")
async def root():
    return {
        "service": "TestZoo API",
        "version": "1.0.0",
        "docs": "/docs",
        "mcp_servers": {
            "catalog": f"http://localhost:{settings.MCP_CATALOG_PORT}",
            "orders": f"http://localhost:{settings.MCP_ORDERS_PORT}",
            "payment": f"http://localhost:{settings.MCP_PAYMENT_PORT}",
            "dashboard": f"http://localhost:{settings.MCP_DASHBOARD_PORT}",
            "patient": f"http://localhost:{settings.MCP_PATIENT_PORT}",
        },
    }
