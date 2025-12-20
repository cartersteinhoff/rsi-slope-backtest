import { useState } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BranchOverview } from "@/types";
import { formatPercent, formatNumber, getReturnColor } from "@/lib/formatters";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParametersStore } from "@/stores/parameters-store";

interface OverviewTableProps {
	branches: BranchOverview[];
	onSelectBranch?: (branch: string) => void;
}

type SortKey = keyof BranchOverview;
type SortOrder = "asc" | "desc";

export function OverviewTable({ branches, onSelectBranch }: OverviewTableProps) {
	const [sortKey, setSortKey] = useState<SortKey>("return_pct");
	const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
	const alphaSystem = useParametersStore((s) => s.alphaSystem);

	// Filter branches by alpha system (based on investment ticker in branch name)
	const isVixBranch = (branch: string) => branch.includes("_VIXY_daily_trade_log");
	const filteredBranches = alphaSystem === "both"
		? branches
		: branches.filter((b) =>
			alphaSystem === "vix" ? isVixBranch(b.branch) : !isVixBranch(b.branch)
		);

	const handleSort = (key: SortKey) => {
		if (sortKey === key) {
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			setSortKey(key);
			setSortOrder("desc");
		}
	};

	const sortedBranches = [...filteredBranches].sort((a, b) => {
		const aVal = a[sortKey];
		const bVal = b[sortKey];
		if (typeof aVal === "number" && typeof bVal === "number") {
			return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
		}
		if (typeof aVal === "string" && typeof bVal === "string") {
			return sortOrder === "asc"
				? aVal.localeCompare(bVal)
				: bVal.localeCompare(aVal);
		}
		return 0;
	});

	const SortableHeader = ({
		label,
		sortKeyValue,
	}: {
		label: string;
		sortKeyValue: SortKey;
	}) => (
		<Button
			variant="ghost"
			className="h-auto p-0 font-medium hover:bg-transparent"
			onClick={() => handleSort(sortKeyValue)}
		>
			{label}
			<ArrowUpDown className="ml-1 h-3 w-3" />
		</Button>
	);

	if (filteredBranches.length === 0) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-muted-foreground">
					No branches to display
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-medium">
					Branch Overview ({filteredBranches.length} branches)
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="max-h-[600px] overflow-y-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>
									<SortableHeader label="Ticker" sortKeyValue="ticker" />
								</TableHead>
								<TableHead>Branch</TableHead>
								<TableHead className="text-right">
									<SortableHeader label="Return" sortKeyValue="return_pct" />
								</TableHead>
								<TableHead className="text-right">
									<SortableHeader label="CAGR" sortKeyValue="cagr" />
								</TableHead>
								<TableHead className="text-right">
									<SortableHeader label="Win Rate" sortKeyValue="win_rate" />
								</TableHead>
								<TableHead className="text-right">
									<SortableHeader label="Max DD" sortKeyValue="max_drawdown" />
								</TableHead>
								<TableHead className="text-right">
									<SortableHeader label="Trades" sortKeyValue="trades" />
								</TableHead>
								<TableHead className="text-right">
									<SortableHeader label="Sharpe" sortKeyValue="sharpe" />
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sortedBranches.map((branch) => (
								<TableRow
									key={branch.branch}
									className="cursor-pointer hover:bg-muted/50"
									onClick={() => onSelectBranch?.(branch.branch)}
								>
									<TableCell className="font-medium">{branch.ticker}</TableCell>
									<TableCell className="text-xs text-muted-foreground">
										{branch.branch.replace(/_daily_trade_log$/, "").replace(/_/g, " ")}
									</TableCell>
									<TableCell
										className={`text-right font-medium ${getReturnColor(branch.return_pct)}`}
									>
										{formatPercent(branch.return_pct)}
									</TableCell>
									<TableCell
										className={`text-right ${getReturnColor(branch.cagr)}`}
									>
										{formatPercent(branch.cagr)}
									</TableCell>
									<TableCell className="text-right">
										{formatPercent(branch.win_rate)}
									</TableCell>
									<TableCell className="text-right text-red-600 dark:text-red-400">
										{formatPercent(branch.max_drawdown)}
									</TableCell>
									<TableCell className="text-right">{branch.trades}</TableCell>
									<TableCell
										className={`text-right ${getReturnColor(branch.sharpe)}`}
									>
										{formatNumber(branch.sharpe)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}
