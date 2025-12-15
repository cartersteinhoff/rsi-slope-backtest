import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { YearlyStats } from "@/types";
import { formatPercent, formatNumber, getReturnBgColor } from "@/lib/formatters";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface YearlyBreakdownProps {
	stats: YearlyStats[];
}

export function YearlyBreakdown({ stats }: YearlyBreakdownProps) {
	const [expanded, setExpanded] = useState(false);

	if (stats.length === 0) {
		return null;
	}

	// Sort by year descending
	const sortedStats = [...stats].sort((a, b) => b.year - a.year);

	return (
		<Card className="py-0 gap-2">
			<CardHeader
				className="cursor-pointer flex flex-row items-center justify-between py-2"
				onClick={() => setExpanded(!expanded)}
			>
				<CardTitle className="text-sm font-medium">Yearly Breakdown</CardTitle>
				{expanded ? (
					<ChevronUp className="h-4 w-4" />
				) : (
					<ChevronDown className="h-4 w-4" />
				)}
			</CardHeader>
			{expanded && (
				<CardContent className="pt-0 pb-0">
					<div className="flex gap-4 overflow-x-auto pb-2">
						{sortedStats.map((stat) => (
							<div
								key={stat.year}
								className={`flex-shrink-0 p-4 rounded-lg ${getReturnBgColor(stat.return_pct)}`}
							>
								<div className="text-lg font-semibold mb-3">{stat.year}</div>
								<div className="space-y-2 text-base">
									<div className="flex justify-between gap-6">
										<span className="text-muted-foreground">Return</span>
										<Badge
											variant={stat.return_pct >= 0 ? "default" : "destructive"}
											className="text-sm"
										>
											{formatPercent(stat.return_pct)}
										</Badge>
									</div>
									<div className="flex justify-between gap-6">
										<span className="text-muted-foreground">Max DD</span>
										<span className="font-medium">{formatPercent(stat.max_drawdown)}</span>
									</div>
									<div className="flex justify-between gap-6">
										<span className="text-muted-foreground">Trades</span>
										<span className="font-medium">{stat.trades}</span>
									</div>
									<div className="flex justify-between gap-6">
										<span className="text-muted-foreground">Avg Hold</span>
										<span className="font-medium">{formatNumber(stat.avg_hold, 0)}d</span>
									</div>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			)}
		</Card>
	);
}
