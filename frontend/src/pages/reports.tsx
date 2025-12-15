import { useParametersStore } from "@/stores/parameters-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Download, FileSpreadsheet, Info } from "lucide-react";

export function ReportsPage() {
	const {
		slopeWindow,
		posThreshold,
		negThreshold,
		signalType,
		overviewCache,
	} = useParametersStore();

	const branches = overviewCache.branches;
	const hasData = branches && branches.length > 0;

	const handleExportCSV = () => {
		if (!branches) return;

		// Build CSV content
		const headers = [
			"Ticker",
			"Branch",
			"Period",
			"Return %",
			"CAGR %",
			"Win Rate %",
			"Max Drawdown %",
			"Trades",
			"Sharpe",
			"Time in Market %",
		];

		const rows = branches.map((b) => [
			b.ticker,
			b.branch,
			b.period,
			b.return_pct.toFixed(2),
			b.cagr.toFixed(2),
			b.win_rate.toFixed(2),
			b.max_drawdown.toFixed(2),
			b.trades.toString(),
			b.sharpe.toFixed(2),
			b.time_in_market.toFixed(2),
		]);

		const csvContent = [
			headers.join(","),
			...rows.map((row) => row.join(",")),
		].join("\n");

		// Download
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `slope_analysis_${new Date().toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-lg font-semibold mb-1">Detailed Reports</h2>
				<p className="text-sm text-muted-foreground">
					Export analysis data and view parameter summary
				</p>
			</div>

			{/* Export Section */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base flex items-center gap-2">
						<FileSpreadsheet className="h-4 w-4" />
						Export Results
					</CardTitle>
				</CardHeader>
				<CardContent>
					{hasData ? (
						<div className="flex items-center gap-4">
							<Button onClick={handleExportCSV} className="gap-2">
								<Download className="h-4 w-4" />
								Download CSV Report
							</Button>
							<span className="text-sm text-muted-foreground">
								{branches.length} branches will be exported
							</span>
						</div>
					) : (
						<div className="flex items-center gap-2 text-muted-foreground">
							<Info className="h-4 w-4" />
							<span>
								Run the Overall Results tab first to generate exportable data.
							</span>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Parameters Summary */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Current Parameters</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Parameter</TableHead>
								<TableHead>Value</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							<TableRow>
								<TableCell className="font-medium">Slope Window</TableCell>
								<TableCell>{slopeWindow} days</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">
									Positive Threshold
								</TableCell>
								<TableCell>{posThreshold}%</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">
									Negative Threshold
								</TableCell>
								<TableCell>{negThreshold}%</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">Signal Type</TableCell>
								<TableCell>{signalType}</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Summary Stats if data available */}
			{hasData && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Analysis Summary</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
							<div>
								<p className="text-muted-foreground">Total Branches</p>
								<p className="text-lg font-semibold">{branches.length}</p>
							</div>
							<div>
								<p className="text-muted-foreground">Profitable Branches</p>
								<p className="text-lg font-semibold text-green-600 dark:text-green-400">
									{branches.filter((b) => b.return_pct > 0).length}
								</p>
							</div>
							<div>
								<p className="text-muted-foreground">Losing Branches</p>
								<p className="text-lg font-semibold text-red-600 dark:text-red-400">
									{branches.filter((b) => b.return_pct < 0).length}
								</p>
							</div>
							<div>
								<p className="text-muted-foreground">Total Trades</p>
								<p className="text-lg font-semibold">
									{branches.reduce((sum, b) => sum + b.trades, 0)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
