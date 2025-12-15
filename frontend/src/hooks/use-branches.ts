import { useQuery } from "@tanstack/react-query";
import { getBranches } from "@/lib/api";

export function useBranches(ticker?: string) {
	return useQuery({
		queryKey: ["branches", ticker],
		queryFn: () => getBranches(ticker),
		staleTime: 1000 * 60 * 60, // 1 hour
	});
}
