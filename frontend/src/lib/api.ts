import type {
	TickersResponse,
	BranchesResponse,
	IndividualAnalysisResponse,
	OverviewResponse,
	AnalysisParams,
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
