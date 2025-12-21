import { useEquityCurve, useAlpacaStatus } from "@/hooks/useEquityData";
import { EquityChart } from "@/components/charts/equity-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export function EquityPage() {
	const { data, isLoading, error } = useEquityCurve();
	const { data: alpacaStatus } = useAlpacaStatus();

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
			{/* Alpaca Status */}
			<div className="flex items-center gap-2">
				<span className="text-sm text-muted-foreground">Alpaca API:</span>
				{alpacaStatus?.connected ? (
					<Badge variant="default" className="bg-green-600">
						Connected
					</Badge>
				) : alpacaStatus?.configured ? (
					<Badge variant="secondary">Configured (Not Connected)</Badge>
				) : (
					<Badge variant="outline">Not Configured</Badge>
				)}
				{alpacaStatus?.account_status && (
					<span className="text-sm text-muted-foreground">
						Status: {alpacaStatus.account_status}
					</span>
				)}
			</div>

			{/* Equity Chart */}
			<EquityChart
				data={data.data}
				yearlyStats={data.yearly_stats}
				entryDate={data.entry_date}
				systemName={data.system_name}
			/>
		</div>
	);
}
