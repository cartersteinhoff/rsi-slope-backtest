import { useQuery } from "@tanstack/react-query";
import {
	getEquityCurve,
	getEquityDateRange,
	getAlpacaStatus,
	type EquityCurveParams,
} from "@/lib/api";

export function useEquityCurve(params?: EquityCurveParams) {
	return useQuery({
		queryKey: [
			"equity",
			"curve",
			params?.start_date,
			params?.end_date,
			params?.initial_equity,
		],
		queryFn: () => getEquityCurve(params),
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

export function useEquityDateRange() {
	return useQuery({
		queryKey: ["equity", "date-range"],
		queryFn: getEquityDateRange,
		staleTime: 1000 * 60 * 60, // 1 hour
	});
}

export function useAlpacaStatus() {
	return useQuery({
		queryKey: ["alpaca", "status"],
		queryFn: getAlpacaStatus,
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}
