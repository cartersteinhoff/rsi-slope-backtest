import { useEffect, useState, useRef, useMemo } from "react";
import { useParametersStore } from "@/stores/parameters-store";
import { getOverviewStreamUrl } from "@/lib/api";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { formatPercent, formatNumber, getReturnColor } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface ProgressState {
	current: number;
	total: number;
	branch: string;
	percent: number;
}

export function BranchOverviewsPage() {
	const {
		slopeWindow,
		posThreshold,
		negThreshold,
		signalType,
		overviewCache,
		setOverviewCache,
		setSelectedBranch,
		setActiveTab,
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
	}, [
		slopeWindow,
		posThreshold,
		negThreshold,
		signalType,
		cacheIsValid,
		currentParams,
		setOverviewCache,
	]);

	const branches = overviewCache.branches;

	const handleSelectBranch = (branch: string) => {
		setSelectedBranch(branch);
		setActiveTab("individual");
	};

	// Clean branch name for display
	const cleanBranchName = (branch: string) => {
		return branch
			.replace(/_daily_trade_log$/, "")
			.replace(/_/g, " ");
	};

	if (isLoading && progress) {
		return (
			<div className="flex flex-col items-center justify-center h-full gap-6 px-8">
				<div className="w-full max-w-md space-y-4">
					<div className="text-center">
						<p className="text-lg font-medium mb-1">Loading branch data...</p>
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
				<p className="text-sm text-muted-foreground">Loading branches...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center h-full text-destructive">
				Error loading branches: {error.message}
			</div>
		);
	}

	if (!branches && !isLoading) {
		return (
			<div className="flex flex-col items-center justify-center h-full gap-4">
				<Progress value={0} className="w-64 h-3" />
				<p className="text-sm text-muted-foreground">Loading branches...</p>
			</div>
		);
	}

	if (!branches) {
		return null;
	}

	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-lg font-semibold mb-1">Branch Overviews</h2>
				<p className="text-sm text-muted-foreground">
					{branches.length} branches | Window: {slopeWindow} | Threshold:{" "}
					{posThreshold}% | Mode: {signalType}
				</p>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Branch</TableHead>
							<TableHead>Ticker</TableHead>
							<TableHead>Period</TableHead>
							<TableHead className="text-right">Return</TableHead>
							<TableHead className="text-right">CAGR</TableHead>
							<TableHead className="text-right">Win Rate</TableHead>
							<TableHead className="text-right">Max DD</TableHead>
							<TableHead className="text-right">Trades</TableHead>
							<TableHead className="text-right">Sharpe</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{branches.map((branch) => (
							<TableRow
								key={branch.branch}
								className="cursor-pointer hover:bg-muted/50"
								onClick={() => handleSelectBranch(branch.branch)}
							>
								<TableCell className="font-medium">
									{cleanBranchName(branch.branch)}
								</TableCell>
								<TableCell>{branch.ticker}</TableCell>
								<TableCell className="text-xs text-muted-foreground">
									{branch.period}
								</TableCell>
								<TableCell
									className={cn("text-right font-semibold", getReturnColor(branch.return_pct))}
								>
									{formatPercent(branch.return_pct)}
								</TableCell>
								<TableCell
									className={cn("text-right", getReturnColor(branch.cagr))}
								>
									{formatPercent(branch.cagr)}
								</TableCell>
								<TableCell className="text-right">
									{formatPercent(branch.win_rate)}
								</TableCell>
								<TableCell className="text-right text-red-600 dark:text-red-400">
									{formatPercent(branch.max_drawdown)}
								</TableCell>
								<TableCell className="text-right">
									{formatNumber(branch.trades, 0)}
								</TableCell>
								<TableCell className="text-right">
									{formatNumber(branch.sharpe)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
