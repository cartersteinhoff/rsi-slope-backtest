import { useQuery } from "@tanstack/react-query";
import { getAlpacaVixEquityCurve, type EquityCurveParams } from "@/lib/api";

export function useAlpacaVixEquityCurve(params?: EquityCurveParams) {
	return useQuery({
		queryKey: [
			"alpaca-vix-equity",
			"curve",
			params?.start_date,
			params?.end_date,
			params?.initial_equity,
		],
		queryFn: () => getAlpacaVixEquityCurve(params),
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}
