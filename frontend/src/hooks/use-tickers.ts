import { useQuery } from "@tanstack/react-query";
import { getTickers } from "@/lib/api";

export function useTickers() {
	return useQuery({
		queryKey: ["tickers"],
		queryFn: getTickers,
		staleTime: 1000 * 60 * 60, // 1 hour - tickers don't change often
	});
}
