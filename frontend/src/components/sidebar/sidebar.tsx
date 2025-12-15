import { Separator } from "@/components/ui/separator";
import { ParameterControls } from "./parameter-controls";
import { BranchSelector } from "./branch-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { TrendingUp } from "lucide-react";

export function Sidebar() {
	return (
		<aside className="w-80 border-r bg-card h-screen flex flex-col">
			<div className="flex-1 overflow-y-auto p-4">
				<div className="flex items-center gap-2 mb-4">
					<TrendingUp className="h-6 w-6 text-primary" />
					<h1 className="text-base font-semibold leading-tight">Advanced RSI + Slope Filter Backtesting System</h1>
				</div>

				<div className="space-y-4">
					<section>
						<h2 className="text-base font-medium text-muted-foreground mb-2">
							Parameters
						</h2>
						<ParameterControls />
					</section>

					<Separator />

					<section>
						<h2 className="text-base font-medium text-muted-foreground mb-2">
							Branch Selection
						</h2>
						<BranchSelector />
					</section>
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
