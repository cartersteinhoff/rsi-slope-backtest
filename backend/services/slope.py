import numpy as np
import pandas as pd


def calculate_slope(prices: pd.Series, window: int) -> pd.Series:
    """Calculate slope over a rolling window (fully vectorized).

    Args:
        prices: Series of price values
        window: Rolling window size in days

    Returns:
        Series of slope percentages
    """
    prices_arr = prices.values.astype(float)
    n = len(prices_arr)

    if n < window:
        return pd.Series([np.nan] * n, index=prices.index)

    # Pre-compute x values for linear regression
    x = np.arange(window)
    x_mean = x.mean()
    x_var = ((x - x_mean) ** 2).sum()

    # Create sliding windows using stride tricks
    shape = (n - window + 1, window)
    strides = (prices_arr.strides[0], prices_arr.strides[0])
    windows = np.lib.stride_tricks.as_strided(prices_arr, shape=shape, strides=strides)

    # Vectorized slope calculation for all windows at once
    y_means = windows.mean(axis=1)
    slopes_raw = ((x - x_mean) * (windows - y_means[:, np.newaxis])).sum(axis=1) / x_var

    # Get base prices (first value in each window)
    base_prices = windows[:, 0]

    # Convert to percentage (vectorized)
    with np.errstate(divide='ignore', invalid='ignore'):
        slope_pcts = np.where(
            base_prices != 0,
            (slopes_raw * (window - 1) / base_prices) * 100,
            0
        )

    # Pad with NaNs at the beginning
    slopes = np.full(n, np.nan)
    slopes[window - 1:] = slope_pcts

    return pd.Series(slopes, index=prices.index)
