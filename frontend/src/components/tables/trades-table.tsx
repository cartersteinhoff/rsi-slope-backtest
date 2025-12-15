import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ChevronDown, ChevronUp } from "lucide-react";
import type { Trade } from "@/types";
import {
	formatPercent,
	formatCurrency,
	formatShortDate,
	getReturnColor,
} from "@/lib/formatters";
import { useState } from "react";

function exportToCSV(trades: Trade[], filename: string) {
	const headers = ["Entry Date", "Exit Date", "Entry Price", "Exit Price", "Return %", "Days Held"];
	const rows = trades.map((t) => [
		t.entry_date,
		t.exit_date,
		t.entry_price.toFixed(2),
		t.exit_price.toFixed(2),
		t.return_pct.toFixed(2),
		t.days_held.toString(),
	]);

	const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
	const blob = new Blob([csv], { type: "text/csv" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

interface TradesTableProps {
	trades: Trade[];
}

export function TradesTable({ trades }: TradesTableProps) {
	const [expanded, setExpanded] = useState(false);

	if (trades.length === 0) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-muted-foreground">
					No trades to display
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="py-0 gap-2">
			<CardHeader
				className="cursor-pointer flex flex-row items-center justify-between py-2"
				onClick={() => setExpanded(!expanded)}
			>
				<CardTitle className="text-sm font-medium">
					Trade History ({trades.length} trades)
				</CardTitle>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={(e) => {
							e.stopPropagation();
							exportToCSV(trades, "trades.csv");
						}}
						className="h-7"
					>
						<Download className="h-4 w-4 mr-1" />
						Export CSV
					</Button>
					{expanded ? (
						<ChevronUp className="h-4 w-4" />
					) : (
						<ChevronDown className="h-4 w-4" />
					)}
				</div>
			</CardHeader>
			{expanded && (
				<CardContent className="pt-0 pb-0">
					<div className="max-h-96 overflow-y-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Entry Date</TableHead>
									<TableHead>Exit Date</TableHead>
									<TableHead className="text-right">Entry Price</TableHead>
									<TableHead className="text-right">Exit Price</TableHead>
									<TableHead className="text-right">Return</TableHead>
									<TableHead className="text-right">Days</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{trades.map((trade, index) => (
									<TableRow key={`${trade.entry_date}-${index}`}>
										<TableCell>{formatShortDate(trade.entry_date)}</TableCell>
										<TableCell>{formatShortDate(trade.exit_date)}</TableCell>
										<TableCell className="text-right">
											{formatCurrency(trade.entry_price)}
										</TableCell>
										<TableCell className="text-right">
											{formatCurrency(trade.exit_price)}
										</TableCell>
										<TableCell
											className={`text-right font-medium ${getReturnColor(trade.return_pct)}`}
										>
											{formatPercent(trade.return_pct)}
										</TableCell>
										<TableCell className="text-right">{trade.days_held}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			)}
		</Card>
	);
}
