import { useEffect, useState, useRef, useMemo } from "react";
import { useParametersStore } from "@/stores/parameters-store";
import { getOverviewStreamUrl } from "@/lib/api";
import { OverviewTable } from "@/components/tables/overview-table";
import { ScatterPlot } from "@/components/charts/scatter-plot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatPercent, formatNumber } from "@/lib/formatters";

interface ProgressState {
	current: number;
	total: number;
	branch: string;
	percent: number;
}

export function OverviewPage() {
	const {
		slopeWindow,
		posThreshold,
		negThreshold,
		signalType,
		setSelectedBranch,
		setActiveTab,
		overviewCache,
		setOverviewCache,
	} = useParametersStore();

	const [progress, setProgress] = useState<ProgressState | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const eventSourceRef = useRef<EventSource | null>(null);

	// Check if cached results match current params
	const currentParams = useMemo(
		() => ({ slopeWindow, posThreshold, negThreshold, signalType }),
		[slopeWindow, posThreshold, negThreshold, signalType]
	);

	const cacheIsValid = useMemo(() => {
		if (!overviewCache.params || !overviewCache.branches) return false;
		return (
			overviewCache.params.slopeWindow === currentParams.slopeWindow &&
			overviewCache.params.posThreshold === currentParams.posThreshold &&
			overviewCache.params.negThreshold === currentParams.negThreshold &&
			overviewCache.params.signalType === currentParams.signalType
		);
	}, [overviewCache, currentParams]);

	useEffect(() => {
		// Skip fetch if we have valid cached results
		if (cacheIsValid) {
			return;
		}

		// Close previous connection
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
		}

		setIsLoading(true);
		setError(null);
		setProgress(null);

		const url = getOverviewStreamUrl({
			slope_window: slopeWindow,
			pos_threshold: posThreshold,
			neg_threshold: negThreshold,
			signal_type: signalType,
		});

		const eventSource = new EventSource(url);
		eventSourceRef.current = eventSource;

		eventSource.onmessage = (event) => {
			const data = JSON.parse(event.data);

			if (data.type === "progress") {
				setProgress({
					current: data.current,
					total: data.total,
					branch: data.branch,
					percent: data.percent,
				});
			} else if (data.type === "complete") {
				// Store results in cache
				setOverviewCache(currentParams, data.branches);
				setIsLoading(false);
				setProgress(null);
				eventSource.close();
			}
		};

		eventSource.onerror = () => {
			setError(new Error("Connection error"));
			setIsLoading(false);
			eventSource.close();
		};

		return () => {
			eventSource.close();
		};
	}, [slopeWindow, posThreshold, negThreshold, signalType, cacheIsValid, currentParams, setOverviewCache]);

	// Use cached branches
	const branches = overviewCache.branches;

	const handleSelectBranch = (branch: string) => {
		setSelectedBranch(branch);
		setActiveTab("individual");
	};

	if (isLoading && progress) {
		return (
			<div className="flex flex-col items-center justify-center h-full gap-6 px-8">
				<div className="w-full max-w-md space-y-4">
					<div className="text-center">
						<p className="text-lg font-medium mb-1">
							Analyzing branches...
						</p>
						<p className="text-sm text-muted-foreground">
							{progress.current} / {progress.total} branches
						</p>
					</div>
					<Progress value={progress.percent} className="h-3" />
					<p className="text-xs text-muted-foreground text-center truncate">
						{progress.branch}
					</p>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center h-full gap-4">
				<Progress value={0} className="w-64 h-3" />
				<p className="text-sm text-muted-foreground">
					Starting analysis...
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center h-full text-destructive">
				Error loading overview: {error.message}
			</div>
		);
	}

	if (!branches && !isLoading) {
		// No cache and not yet loading - will start loading soon
		return (
			<div className="flex flex-col items-center justify-center h-full gap-4">
				<Progress value={0} className="w-64 h-3" />
				<p className="text-sm text-muted-foreground">
					Starting analysis...
				</p>
			</div>
		);
	}

	if (!branches) {
		return null;
	}

	// Calculate summary stats
	const avgReturn =
		branches.reduce((sum, b) => sum + b.return_pct, 0) / branches.length;
	const avgWinRate =
		branches.reduce((sum, b) => sum + b.win_rate, 0) / branches.length;
	const totalTrades = branches.reduce((sum, b) => sum + b.trades, 0);
	const profitableBranches = branches.filter((b) => b.return_pct > 0).length;

	// Extended stats
	const sortedByReturn = [...branches].sort((a, b) => b.return_pct - a.return_pct);
	const medianReturn = sortedByReturn[Math.floor(sortedByReturn.length / 2)]?.return_pct ?? 0;
	const bestPerformer = sortedByReturn[0];
	const worstPerformer = sortedByReturn[sortedByReturn.length - 1];
	const avgCagr = branches.reduce((sum, b) => sum + b.cagr, 0) / branches.length;
	const avgSharpe = branches.reduce((sum, b) => sum + b.sharpe, 0) / branches.length;
	const avgMaxDrawdown = branches.reduce((sum, b) => sum + b.max_drawdown, 0) / branches.length;

	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-lg font-semibold mb-1">Overall Analysis</h2>
				<p className="text-sm text-muted-foreground">
					{branches.length} branches | Window: {slopeWindow} | Threshold:{" "}
					{posThreshold}% | Mode: {signalType}
				</p>
			</div>

			{/* Top metrics row - more compact */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				<Card className="p-3">
					<p className="text-xs text-muted-foreground">Avg Return</p>
					<p className="text-xl font-bold">{formatPercent(avgReturn)}</p>
				</Card>
				<Card className="p-3">
					<p className="text-xs text-muted-foreground">Avg Win Rate</p>
					<p className="text-xl font-bold">{formatPercent(avgWinRate)}</p>
				</Card>
				<Card className="p-3">
					<p className="text-xs text-muted-foreground">Total Trades</p>
					<p className="text-xl font-bold">{formatNumber(totalTrades, 0)}</p>
				</Card>
				<Card className="p-3">
					<p className="text-xs text-muted-foreground">Profitable</p>
					<p className="text-xl font-bold">{profitableBranches} / {branches.length}</p>
				</Card>
			</div>

			{/* Chart + Extended Stats side by side */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<ScatterPlot data={branches} onSelectBranch={handleSelectBranch} />

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Performance Summary</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
							<div>
								<p className="text-muted-foreground text-xs">Median Return</p>
								<p className="font-semibold">{formatPercent(medianReturn)}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Avg CAGR</p>
								<p className="font-semibold">{formatPercent(avgCagr)}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Avg Sharpe</p>
								<p className="font-semibold">{formatNumber(avgSharpe)}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Avg Max DD</p>
								<p className="font-semibold text-red-600 dark:text-red-400">{formatPercent(avgMaxDrawdown)}</p>
							</div>
						</div>

						<div className="border-t pt-3 space-y-2">
							<div>
								<p className="text-muted-foreground text-xs">Best Performer</p>
								<div className="flex items-center justify-between">
									<button
										onClick={() => handleSelectBranch(bestPerformer.branch)}
										className="font-medium text-sm hover:underline text-left cursor-pointer"
									>
										{bestPerformer.ticker}
									</button>
									<span className="text-green-600 dark:text-green-400 font-semibold">
										{formatPercent(bestPerformer.return_pct)}
									</span>
								</div>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Worst Performer</p>
								<div className="flex items-center justify-between">
									<button
										onClick={() => handleSelectBranch(worstPerformer.branch)}
										className="font-medium text-sm hover:underline text-left cursor-pointer"
									>
										{worstPerformer.ticker}
									</button>
									<span className="text-red-600 dark:text-red-400 font-semibold">
										{formatPercent(worstPerformer.return_pct)}
									</span>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<OverviewTable branches={branches} onSelectBranch={handleSelectBranch} />
		</div>
	);
}
