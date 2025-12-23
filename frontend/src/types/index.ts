// API Response Types

export interface Candle {
	time: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume?: number;
}

export interface Trade {
	entry_date: string;
	exit_date: string;
	entry_price: number;
	exit_price: number;
	return_pct: number;
	days_held: number;
}

export interface YearlyStats {
	year: number;
	return_pct: number;
	max_drawdown: number;
	trades: number;
	avg_hold: number;
}

export interface PerformanceMetrics {
	total_return: number;
	win_rate: number;
	max_drawdown: number;
	num_trades: number;
	time_in_market: number;
	avg_days_held: number;
	avg_return: number;
	sharpe_ratio: number;
	volatility: number;
}

export interface SlopeSegment {
	start: number;
	end: number;
	color: "green" | "gray";
}

export interface ChartMarker {
	time: number;
	price: number;
	return_pct?: number;
	entry_type?: "RSI" | "Slope";
}

export interface RSIDataPoint {
	time: number;
	value: number;
}

export interface ChartData {
	candles: Candle[];
	slope_segments: SlopeSegment[];
	entries: ChartMarker[];
	exits: ChartMarker[];
	rsi_triggers: ChartMarker[];
	rsi_data: RSIDataPoint[];
	rsi_threshold: number;
}

export interface IndividualAnalysisResponse {
	metrics: PerformanceMetrics;
	trades: Trade[];
	yearly_stats: YearlyStats[];
	chart_data: ChartData;
}

export interface BranchOverview {
	ticker: string;
	branch: string;
	period: string;
	return_pct: number;
	cagr: number;
	win_rate: number;
	max_drawdown: number;
	trades: number;
	sharpe: number;
	time_in_market: number;
}

export interface OverviewResponse {
	branches: BranchOverview[];
}

export interface TickersResponse {
	tickers: string[];
}

export interface BranchesResponse {
	branches: string[];
}

// Parameter Types
export type SignalType = "Both" | "RSI";

export interface AnalysisParams {
	branch: string;
	slope_window: number;
	pos_threshold: number;
	neg_threshold: number;
	signal_type: SignalType;
}

// Equity Chart Types

export interface EquityDataPoint {
	date: string; // ISO format YYYY-MM-DD
	equity: number;
	daily_return: number; // Percentage
	drawdown_pct: number;
	is_live: boolean; // True if from live trading, False if backtest
	spy_equity?: number; // SPY equity for comparison
}

export interface EquityYearlyStats {
	year: number;
	profit_pct: number;
	max_drawdown_pct: number;
	start_equity: number;
	end_equity: number;
}

export interface EquityCurveResponse {
	system_name: string;
	data: EquityDataPoint[];
	yearly_stats: EquityYearlyStats[];
	entry_date: string; // ISO date when live trading started
}

export interface DateRangeResponse {
	min_date: string;
	max_date: string;
}

export interface AlpacaAccount {
	account_id: string;
	cash: number;
	portfolio_value: number;
	buying_power: number;
	equity: number;
	last_equity: number;
	status: string;
}

export interface AlpacaPosition {
	symbol: string;
	qty: number;
	avg_entry_price: number;
	current_price: number;
	market_value: number;
	unrealized_pl: number;
	unrealized_plpc: number;
}
