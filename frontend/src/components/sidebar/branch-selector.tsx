import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ChevronDown, X } from "lucide-react";
import { useParametersStore } from "@/stores/parameters-store";
import { useTickers } from "@/hooks/use-tickers";
import { useBranches } from "@/hooks/use-branches";

export function BranchSelector() {
	const {
		selectedTicker,
		selectedBranch,
		selectionMode,
		alphaSystem,
		setSelectedTicker,
		setSelectedBranch,
		setSelectionMode,
		setAlphaSystem,
	} = useParametersStore();

	const { data: tickersData } = useTickers();
	const { data: allBranchesData } = useBranches(undefined);
	const { data: filteredBranchesData } = useBranches(
		selectionMode === "ticker" ? selectedTicker : undefined,
	);

	const [branchSearch, setBranchSearch] = useState("");
	const [isSearchFocused, setIsSearchFocused] = useState(false);
	const [tickerSearch, setTickerSearch] = useState("");
	const [isTickerFocused, setIsTickerFocused] = useState(false);
	const [hasInitialized, setHasInitialized] = useState(false);

	// Helper to check if a branch is a VIX strategy (invests in VIXY)
	const isVixBranch = (branch: string) => branch.includes("_VIXY_daily_trade_log");

	// Filter branches by alpha system (based on investment ticker)
	const filterBranchesByAlphaSystem = (branches: string[]) => {
		if (alphaSystem === "both") return branches;
		return branches.filter((b) =>
			alphaSystem === "vix" ? isVixBranch(b) : !isVixBranch(b)
		);
	};

	const rawTickers = tickersData?.tickers ?? [];
	const rawAllBranches = allBranchesData?.branches ?? [];
	const rawTickerBranches = filteredBranchesData?.branches ?? [];

	// Apply alpha system filter to branches
	const allBranches = filterBranchesByAlphaSystem(rawAllBranches);
	const tickerBranches = filterBranchesByAlphaSystem(rawTickerBranches);

	// For tickers, filter based on whether they have any matching branches
	const tickers = alphaSystem === "both"
		? rawTickers
		: rawTickers.filter((ticker) => {
			// Check if this ticker has any branches matching the alpha system
			return rawAllBranches.some((b) => {
				const match = b.match(/_RSI_(.+?)_(?:LT|GT)/);
				const baseTicker = match ? match[1] : "";
				return baseTicker === ticker && (alphaSystem === "vix" ? isVixBranch(b) : !isVixBranch(b));
			});
		});

	const filteredTickers = tickers.filter((ticker) =>
		ticker.toLowerCase().includes(tickerSearch.toLowerCase())
	);

	useEffect(() => {
		if (allBranches.length > 0 && !hasInitialized) {
			const firstBranch = allBranches[0];
			setSelectedBranch(firstBranch);
			setBranchSearch(firstBranch.replace(/_daily_trade_log$/, "").replace(/_/g, " "));
			setHasInitialized(true);
		}
	}, [allBranches, hasInitialized, setSelectedBranch]);

	// Auto-select first branch when alpha system filter changes and current selection is invalid
	useEffect(() => {
		if (!hasInitialized || allBranches.length === 0) return;

		const currentBranchValid = selectedBranch && allBranches.includes(selectedBranch);
		if (!currentBranchValid && allBranches.length > 0) {
			const firstBranch = allBranches[0];
			setSelectedBranch(firstBranch);
			setSelectedTicker("");
			setSelectionMode("all");
			setTickerSearch("");
			setBranchSearch(firstBranch.replace(/_daily_trade_log$/, "").replace(/_/g, " "));
		}
	}, [alphaSystem, allBranches, selectedBranch, hasInitialized, setSelectedBranch, setSelectedTicker, setSelectionMode]);

	useEffect(() => {
		if (tickerBranches.length === 0 || !selectedTicker) return;

		const currentBranchValid = selectedBranch && tickerBranches.includes(selectedBranch);

		if (tickerBranches.length === 1) {
			setSelectedBranch(tickerBranches[0]);
		} else if (!currentBranchValid) {
			setSelectedBranch(tickerBranches[0]);
		}
	}, [tickerBranches, selectedBranch, selectedTicker, setSelectedBranch]);

	return (
		<div className="space-y-3">
			<div className="space-y-1">
				<Label className="text-sm">Alpha System</Label>
				<div className="flex rounded-md border overflow-hidden">
					<button
						type="button"
						onClick={() => setAlphaSystem("both")}
						className={`flex-1 px-2 py-1 text-xs transition-colors cursor-pointer ${
							alphaSystem === "both"
								? "bg-primary text-primary-foreground"
								: "bg-background hover:bg-accent"
						}`}
					>
						Both
					</button>
					<button
						type="button"
						onClick={() => setAlphaSystem("etf")}
						className={`flex-1 px-2 py-1 text-xs border-l transition-colors cursor-pointer ${
							alphaSystem === "etf"
								? "bg-primary text-primary-foreground"
								: "bg-background hover:bg-accent"
						}`}
					>
						ETF
					</button>
					<button
						type="button"
						onClick={() => setAlphaSystem("vix")}
						className={`flex-1 px-2 py-1 text-xs border-l transition-colors cursor-pointer ${
							alphaSystem === "vix"
								? "bg-primary text-primary-foreground"
								: "bg-background hover:bg-accent"
						}`}
					>
						VIX
					</button>
				</div>
			</div>

			<div className="space-y-1 relative">
				<Label className="text-sm">Search Branches</Label>
				<div className="relative">
					<Input
						placeholder="Search branches..."
						value={branchSearch}
						onChange={(e) => setBranchSearch(e.target.value)}
						onFocus={() => setIsSearchFocused(true)}
						onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
						className="text-sm h-8 pr-14 cursor-pointer"
					/>
					{branchSearch && (
						<button
							type="button"
							onClick={() => {
								setBranchSearch("");
								setSelectedBranch("");
							}}
							className="absolute right-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
						>
							<X className="h-4 w-4" />
						</button>
					)}
					<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
				</div>
				{isSearchFocused && allBranches.length > 0 && (
					<div className="absolute z-10 w-full max-h-60 overflow-y-auto rounded-md border bg-popover shadow-md">
						{allBranches.map((branch) => (
							<button
								key={branch}
								type="button"
								className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
								onClick={() => {
									setSelectedBranch(branch);
									setSelectedTicker("");
									setSelectionMode("all");
									setTickerSearch("");
									setBranchSearch(branch.replace(/_daily_trade_log$/, "").replace(/_/g, " "));
									setIsSearchFocused(false);
								}}
							>
								{branch.replace(/_daily_trade_log$/, "").replace(/_/g, " ")}
							</button>
						))}
					</div>
				)}
							</div>

			<div className="space-y-1 relative">
				<Label className="text-sm">Search Tickers</Label>
				<div className="relative">
					<Input
						placeholder="All tickers"
						value={tickerSearch}
						onChange={(e) => setTickerSearch(e.target.value)}
						onFocus={() => setIsTickerFocused(true)}
						onBlur={() => setTimeout(() => setIsTickerFocused(false), 150)}
						className="text-sm h-8 pr-14"
					/>
					{selectedTicker && (
						<button
							type="button"
							onClick={() => {
								setSelectedTicker("");
								setSelectionMode("all");
								setTickerSearch("");
								setSelectedBranch("");
								setBranchSearch("");
							}}
							className="absolute right-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
						>
							<X className="h-4 w-4" />
						</button>
					)}
					<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
				</div>
				{isTickerFocused && (
					<div className="absolute z-10 w-full max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md">
						<button
							type="button"
							className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
							onClick={() => {
								setSelectedTicker("");
								setSelectionMode("all");
								setTickerSearch("");
								setIsTickerFocused(false);
							}}
						>
							All tickers
						</button>
						{filteredTickers.map((ticker) => (
							<button
								key={ticker}
								type="button"
								className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
								onClick={() => {
									setSelectedTicker(ticker);
									setSelectionMode("ticker");
									setTickerSearch(ticker);
									setBranchSearch("");
									setIsTickerFocused(false);
								}}
							>
								{ticker}
							</button>
						))}
					</div>
				)}
			</div>

			{selectedTicker && (
				<div className="space-y-1">
					<Label className="text-sm">Branch</Label>
					<Select value={selectedBranch} onValueChange={setSelectedBranch}>
						<SelectTrigger className="text-sm h-8">
							<SelectValue placeholder="Select a branch" />
						</SelectTrigger>
						<SelectContent>
							{tickerBranches.map((branch) => (
								<SelectItem key={branch} value={branch} className="text-sm">
									{branch.replace(/_daily_trade_log$/, "").replace(/_/g, " ")}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground">
						{tickerBranches.length} branches available
					</p>
				</div>
			)}
		</div>
	);
}
