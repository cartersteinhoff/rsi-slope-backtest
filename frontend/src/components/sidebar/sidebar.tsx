import { Separator } from "@/components/ui/separator";
import { ParameterControls } from "./parameter-controls";
import { BranchSelector } from "./branch-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { useParametersStore } from "@/stores/parameters-store";
import { Button } from "@/components/ui/button";

export function Sidebar() {
	const { sidebarCollapsed, setSidebarCollapsed } = useParametersStore();

	if (sidebarCollapsed) {
		return (
			<aside className="w-12 border-r bg-card h-screen flex flex-col items-center py-4 transition-all duration-300">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setSidebarCollapsed(false)}
					className="mb-4"
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
				<TrendingUp className="h-6 w-6 text-primary" />
			</aside>
		);
	}

	return (
		<aside className="w-80 border-r bg-card h-screen flex flex-col transition-all duration-300">
			<div className="flex-1 overflow-y-auto p-4">
				<div className="flex items-center gap-2 mb-4">
					<TrendingUp className="h-10 w-10 text-primary flex-shrink-0" />
					<h1 className="text-base font-semibold leading-tight flex-1">Advanced RSI + Slope Filter Backtesting System</h1>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setSidebarCollapsed(true)}
						className="flex-shrink-0"
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
				</div>

				<Separator className="mb-4" />

				<div className="space-y-4">
					<ParameterControls />
					<Separator />
					<BranchSelector />
				</div>
			</div>

			{/* Footer with theme toggle */}
			<div className="border-t p-3">
				<div className="flex items-center justify-between">
					<span className="text-base text-muted-foreground">Theme</span>
					<ThemeToggle />
				</div>
			</div>
		</aside>
	);
}
