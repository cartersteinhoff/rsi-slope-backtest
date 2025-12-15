import { useParametersStore } from "@/stores/parameters-store";
import { useIndividualAnalysis } from "@/hooks/use-analysis";
import { PriceChart } from "@/components/charts/price-chart";
import { MetricsCards } from "@/components/metrics/metrics-cards";
import { YearlyBreakdown } from "@/components/metrics/yearly-breakdown";
import { TradesTable } from "@/components/tables/trades-table";
import { Loader2 } from "lucide-react";

export function IndividualPage() {
	const {
		selectedBranch,
		slopeWindow,
		posThreshold,
		negThreshold,
		signalType,
	} = useParametersStore();

	const { data, isLoading, error } = useIndividualAnalysis({
		branch: selectedBranch,
		slope_window: slopeWindow,
		pos_threshold: posThreshold,
		neg_threshold: negThreshold,
		signal_type: signalType,
	});

	if (!selectedBranch) {
		return (
			<div className="flex items-center justify-center h-full text-muted-foreground">
				Select a branch from the sidebar to view analysis
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center h-full text-destructive">
				Error loading analysis: {error.message}
			</div>
		);
	}

	if (!data) {
		return null;
	}

	return (
		<div className="space-y-6">
			<MetricsCards metrics={data.metrics} />

			<YearlyBreakdown stats={data.yearly_stats} />

			<PriceChart data={data.chart_data} />

			<TradesTable trades={data.trades} />
		</div>
	);
}
