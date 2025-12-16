from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import tickers, branches, analysis

app = FastAPI(
    title="Advanced RSI + Slope Filter Backtesting API",
    description="API for RSI and slope-based trading analysis",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://rsimvp.vercel.app",
        "https://*.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tickers.router, prefix="/api", tags=["tickers"])
app.include_router(branches.router, prefix="/api", tags=["branches"])
app.include_router(analysis.router, prefix="/api", tags=["analysis"])


@app.get("/")
def root():
    return {"message": "Advanced RSI + Slope Filter Backtesting API", "docs": "/docs"}
