import type {
	TickersResponse,
	BranchesResponse,
	IndividualAnalysisResponse,
	OverviewResponse,
	AnalysisParams,
	EquityCurveResponse,
	DateRangeResponse,
	AlpacaAccount,
	AlpacaPosition,
} from "@/types";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`API error: ${response.status} ${response.statusText}`);
	}
	return response.json();
}

export async function getTickers(): Promise<TickersResponse> {
	return fetchJson<TickersResponse>(`${API_BASE}/tickers`);
}

export async function getBranches(ticker?: string): Promise<BranchesResponse> {
	const url = ticker
		? `${API_BASE}/branches?ticker=${encodeURIComponent(ticker)}`
		: `${API_BASE}/branches`;
	return fetchJson<BranchesResponse>(url);
}

export async function getIndividualAnalysis(
	params: AnalysisParams,
): Promise<IndividualAnalysisResponse> {
	const searchParams = new URLSearchParams({
		branch: params.branch,
		slope_window: params.slope_window.toString(),
		pos_threshold: params.pos_threshold.toString(),
		neg_threshold: params.neg_threshold.toString(),
		signal_type: params.signal_type,
	});
	return fetchJson<IndividualAnalysisResponse>(
		`${API_BASE}/analysis/individual?${searchParams}`,
	);
}

export async function getOverviewAnalysis(
	params: Omit<AnalysisParams, "branch">,
): Promise<OverviewResponse> {
	const searchParams = new URLSearchParams({
		slope_window: params.slope_window.toString(),
		pos_threshold: params.pos_threshold.toString(),
		neg_threshold: params.neg_threshold.toString(),
		signal_type: params.signal_type,
	});
	return fetchJson<OverviewResponse>(
		`${API_BASE}/analysis/overview?${searchParams}`,
	);
}

export function getOverviewStreamUrl(
	params: Omit<AnalysisParams, "branch">,
): string {
	const searchParams = new URLSearchParams({
		slope_window: params.slope_window.toString(),
		pos_threshold: params.pos_threshold.toString(),
		neg_threshold: params.neg_threshold.toString(),
		signal_type: params.signal_type,
	});
	return `${API_BASE}/analysis/overview/stream?${searchParams}`;
}

// Equity Chart API

export interface EquityCurveParams {
	start_date?: string;
	end_date?: string;
	initial_equity?: number;
}

export async function getEquityCurve(
	params?: EquityCurveParams,
): Promise<EquityCurveResponse> {
	const searchParams = new URLSearchParams();
	if (params?.start_date) searchParams.set("start_date", params.start_date);
	if (params?.end_date) searchParams.set("end_date", params.end_date);
	if (params?.initial_equity)
		searchParams.set("initial_equity", params.initial_equity.toString());

	const query = searchParams.toString();
	return fetchJson<EquityCurveResponse>(
		`${API_BASE}/equity/curve${query ? `?${query}` : ""}`,
	);
}

export async function getEquityDateRange(): Promise<DateRangeResponse> {
	return fetchJson<DateRangeResponse>(`${API_BASE}/equity/date-range`);
}

export async function getAlpacaAccount(): Promise<AlpacaAccount> {
	return fetchJson<AlpacaAccount>(`${API_BASE}/equity/alpaca/account`);
}

export async function getAlpacaPositions(): Promise<AlpacaPosition[]> {
	return fetchJson<AlpacaPosition[]>(`${API_BASE}/equity/alpaca/positions`);
}

export async function getAlpacaStatus(): Promise<{
	configured: boolean;
	connected: boolean;
	message?: string;
	account_status?: string;
}> {
	return fetchJson(`${API_BASE}/equity/alpaca/status`);
}

// Alpaca + VIX ETF System API

export async function getAlpacaVixEquityCurve(
	params?: EquityCurveParams,
): Promise<EquityCurveResponse> {
	const searchParams = new URLSearchParams();
	if (params?.start_date) searchParams.set("start_date", params.start_date);
	if (params?.end_date) searchParams.set("end_date", params.end_date);
	if (params?.initial_equity)
		searchParams.set("initial_equity", params.initial_equity.toString());

	const query = searchParams.toString();
	return fetchJson<EquityCurveResponse>(
		`${API_BASE}/alpaca-vix-equity/curve${query ? `?${query}` : ""}`,
	);
}
