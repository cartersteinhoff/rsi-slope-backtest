# RSI + Slope Filter Backtesting System

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com)

A full-stack application for backtesting RSI (Relative Strength Index) trading strategies combined with slope-based filters. Analyze historical stock data with configurable parameters and visualize trading signals, performance metrics, and trade history.

## Features

- **Multiple Signal Types**: Test RSI-only, Slope-only, or combined RSI+Slope strategies
- **Configurable Parameters**: Adjust slope window, positive/negative thresholds
- **Performance Metrics**: Total return, win rate, max drawdown, Sharpe ratio, volatility
- **Yearly Breakdown**: View performance statistics by year
- **Interactive Charts**: Price charts with entry/exit signals using lightweight-charts
- **Trade History**: Detailed table of all trades with entry/exit prices and returns
- **Branch Analysis**: Compare different RSI configurations (branches) across multiple tickers
- **Dark Mode**: Toggle between light and dark themes

## Tech Stack

### Backend
- **FastAPI** - REST API framework
- **Pandas/NumPy** - Data processing and calculations
- **PyArrow** - Fast Parquet file reading
- **Uvicorn** - ASGI server

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS 4** - Styling
- **TanStack Query** - Server state management
- **TanStack Table** - Data tables
- **Zustand** - Client state management
- **Radix UI** - Accessible UI primitives
- **Lightweight Charts** - Financial charting

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── requirements.txt     # Python dependencies
│   ├── Procfile            # Railway deployment config
│   ├── data/
│   │   ├── tickers/        # Stock OHLCV data (Parquet)
│   │   └── trade_logs/     # Pre-computed RSI signals (Parquet)
│   ├── models/
│   │   └── schemas.py      # Pydantic models
│   ├── routers/
│   │   ├── tickers.py      # Ticker endpoints
│   │   ├── branches.py     # Branch endpoints
│   │   └── analysis.py     # Analysis endpoints
│   └── services/
│       ├── data_loader.py  # Parquet file loading
│       ├── slope.py        # Slope calculation
│       ├── signals.py      # Trade signal generation
│       └── metrics.py      # Performance metrics
│
└── frontend/
    ├── package.json
    ├── src/
    │   ├── App.tsx         # Main app component
    │   ├── pages/          # Page components
    │   ├── components/     # UI components
    │   ├── hooks/          # React Query hooks
    │   ├── stores/         # Zustand stores
    │   ├── lib/            # Utilities
    │   └── types/          # TypeScript types
    └── public/
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. View API docs at `http://localhost:8000/docs`.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The app will be available at `http://localhost:5173`.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tickers` | GET | List all available tickers |
| `/api/branches` | GET | List all RSI branches |
| `/api/analysis` | POST | Run backtest analysis |

## Configuration

The frontend connects to the backend at `http://localhost:8000` by default. This can be configured in the API client.

## Deployment

This is a **monorepo** with separate deployment configurations for the frontend and backend:

### Frontend → Vercel
The frontend is deployed to [Vercel](https://vercel.com). Configuration is in `vercel.json`:
- Builds from the `frontend/` directory
- Runs `npm install && npm run build`
- Serves the static `dist/` output

### Backend → Railway
The backend is deployed to [Railway](https://railway.app). Configuration files:
- `backend/railway.toml` - Railway-specific build and deploy settings
- `backend/Procfile` - Defines the web process command

When setting up on Railway, point the service to the `backend/` directory as the root.

## License

MIT
