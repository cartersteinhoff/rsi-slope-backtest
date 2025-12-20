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
