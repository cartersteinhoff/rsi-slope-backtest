import { useEquityCurve } from "@/hooks/useEquityData";
import { EquityChartApex } from "@/components/charts/equity-chart-apex";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function EquityApexPage() {
	const { data, isLoading, error } = useEquityCurve();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				<span className="ml-2 text-muted-foreground">Loading equity data...</span>
			</div>
		);
	}

	if (error) {
		return (
			<Card className="border-destructive">
				<CardHeader>
					<CardTitle className="text-destructive">Error Loading Data</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">
						{error instanceof Error ? error.message : "Failed to load equity data"}
					</p>
				</CardContent>
			</Card>
		);
	}

	if (!data || !data.data.length) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>No Data Available</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">
						No equity data found. Please ensure the data file is configured correctly.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{/* Header with System Name */}
			<div className="flex items-center justify-center bg-gradient-to-r from-blue-950 to-blue-900 dark:from-blue-950 dark:to-blue-950 px-4 py-2 rounded-lg">
				<h2 className="text-base font-bold text-white">Alpaca ETF System</h2>
			</div>

			{/* Equity Chart */}
			<EquityChartApex
				data={data.data}
				yearlyStats={data.yearly_stats}
				entryDate={data.entry_date}
				systemName={data.system_name}
			/>
		</div>
	);
}
