import { useQuery } from "@tanstack/react-query";
import { getIndividualAnalysis, getOverviewAnalysis } from "@/lib/api";
import type { AnalysisParams, SignalType } from "@/types";

export function useIndividualAnalysis(params: AnalysisParams) {
	return useQuery({
		queryKey: [
			"analysis",
			"individual",
			params.branch,
			params.slope_window,
			params.pos_threshold,
			params.neg_threshold,
			params.signal_type,
		],
		queryFn: () => getIndividualAnalysis(params),
		enabled: !!params.branch,
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

export function useOverviewAnalysis(params: {
	slope_window: number;
	pos_threshold: number;
	neg_threshold: number;
	signal_type: SignalType;
}) {
	return useQuery({
		queryKey: [
			"analysis",
			"overview",
			params.slope_window,
			params.pos_threshold,
			params.neg_threshold,
			params.signal_type,
		],
		queryFn: () => getOverviewAnalysis(params),
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}
