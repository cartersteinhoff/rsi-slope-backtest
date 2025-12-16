# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Run Commands

### Backend (Python/FastAPI)
```bash
cd backend
source venv/bin/activate  # Activate virtual environment
uvicorn main:app --reload --port 8000
```

### Frontend (React/Vite)
```bash
cd frontend
npm install    # Install dependencies
npm run dev    # Development server (port 5173)
npm run build  # Production build (runs tsc -b && vite build)
npm run lint   # ESLint
```

## Architecture Overview

This is a full-stack RSI (Relative Strength Index) trading strategy backtesting application.

### Data Flow
1. **Data Source**: Pre-computed Parquet files in `backend/data/`:
   - `tickers/` - OHLCV stock price data per ticker
   - `trade_logs/` - Pre-computed RSI signals per branch (branch = ticker + RSI configuration)
2. **Backend Processing**: FastAPI endpoints apply slope filters to RSI signals and compute performance metrics
3. **Frontend Display**: React app visualizes results with interactive charts and tables

### Backend Services (`backend/services/`)
- `data_loader.py` - Loads Parquet files, extracts ticker from branch names
- `slope.py` - Calculates price slope over configurable window
- `signals.py` - Core trading logic with three signal types:
  - **Both**: RSI activates flag, slope confirms entry
  - **RSI**: Trade when RSI Active signal is 1
  - **Slope**: Trade when slope exceeds threshold
- `metrics.py` - Calculates performance metrics (Sharpe, max drawdown, etc.)

### Frontend State Management
- **Zustand store** (`stores/parameters-store.ts`): Persists analysis parameters, selection state, theme, and cached overview results
- **TanStack Query hooks** (`hooks/`): Data fetching with 5-minute stale time

### Key API Endpoints
- `GET /api/analysis/individual` - Single branch detailed analysis with chart data
- `GET /api/analysis/overview` - Parallelized analysis across all branches
- `GET /api/analysis/overview/stream` - SSE streaming version with progress updates

### Chart System
Uses `lightweight-charts` library. Chart data includes:
- Price candles (last 5 years only for performance)
- Slope segments (green when above threshold)
- Entry/exit markers from trades
- RSI trigger markers

## Deployment
- Backend: Railway with Procfile
- Frontend: Vercel (configured in `vercel.json`)
