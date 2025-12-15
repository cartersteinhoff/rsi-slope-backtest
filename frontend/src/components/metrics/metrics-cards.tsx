import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PerformanceMetrics } from "@/types";
import {
	formatPercent,
	formatNumber,
	getReturnColor,
} from "@/lib/formatters";
import {
	TrendingUp,
	Target,
	TrendingDown,
	Activity,
	Clock,
	BarChart3,
} from "lucide-react";

interface MetricsCardsProps {
	metrics: PerformanceMetrics;
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
	const cards = [
		{
			title: "Total Return",
			value: formatPercent(metrics.total_return),
			icon: TrendingUp,
			colorClass: getReturnColor(metrics.total_return),
		},
		{
			title: "Win Rate",
			value: formatPercent(metrics.win_rate),
			icon: Target,
			colorClass:
				metrics.win_rate >= 50
					? "text-green-600 dark:text-green-400"
					: "text-amber-600 dark:text-amber-400",
		},
		{
			title: "Max Drawdown",
			value: formatPercent(metrics.max_drawdown),
			icon: TrendingDown,
			colorClass: "text-red-600 dark:text-red-400",
		},
		{
			title: "Trades",
			value: metrics.num_trades.toString(),
			icon: Activity,
			colorClass: "text-blue-600 dark:text-blue-400",
		},
		{
			title: "Avg Days Held",
			value: formatNumber(metrics.avg_days_held, 1),
			icon: Clock,
			colorClass: "text-purple-600 dark:text-purple-400",
		},
		{
			title: "Sharpe Ratio",
			value: formatNumber(metrics.sharpe_ratio),
			icon: BarChart3,
			colorClass: getReturnColor(metrics.sharpe_ratio),
		},
	];

	return (
		<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
			{cards.map((card) => (
				<Card key={card.title} className="py-2 gap-0">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-0">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							{card.title}
						</CardTitle>
						<card.icon className="h-3 w-3 text-muted-foreground" />
					</CardHeader>
					<CardContent className="px-3 pt-0 pb-1">
						<div className={`text-lg font-bold ${card.colorClass}`}>
							{card.value}
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
