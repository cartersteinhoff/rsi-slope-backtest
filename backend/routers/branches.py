from fastapi import APIRouter, Query
from typing import Optional

from services.data_loader import DataLoader
from models.schemas import BranchesResponse

router = APIRouter()


@router.get("/branches", response_model=BranchesResponse)
def get_branches(
    ticker: Optional[str] = Query(None, description="Filter branches by ticker symbol")
):
    """Get list of all available branches, optionally filtered by ticker."""
    if ticker:
        branches = DataLoader.get_branches_for_ticker(ticker)
    else:
        branches = DataLoader.get_available_branches()

    return BranchesResponse(branches=branches)
