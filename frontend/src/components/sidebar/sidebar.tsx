import { useEffect, useRef, useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import { ParameterControls } from "./parameter-controls";
import { BranchSelector } from "./branch-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useParametersStore } from "@/stores/parameters-store";
import { Button } from "@/components/ui/button";

const MIN_WIDTH = 200;
const MAX_WIDTH = 500;
const COLLAPSED_WIDTH = 40;

export function Sidebar() {
	const { sidebarCollapsed, setSidebarCollapsed, sidebarWidth, setSidebarWidth } = useParametersStore();
	const isResizing = useRef(false);
	const sidebarRef = useRef<HTMLElement>(null);

	// Keyboard shortcut: Cmd/Ctrl + B to toggle sidebar
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "b") {
				e.preventDefault();
				setSidebarCollapsed(!sidebarCollapsed);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [sidebarCollapsed, setSidebarCollapsed]);

	// Handle resize drag
	const startResizing = useCallback((e: React.MouseEvent) => {
		if (sidebarCollapsed) return;
		e.preventDefault();
		isResizing.current = true;
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
	}, [sidebarCollapsed]);

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isResizing.current) return;
			const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
			setSidebarWidth(newWidth);
		};

		const handleMouseUp = () => {
			isResizing.current = false;
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [setSidebarWidth]);

	const currentWidth = sidebarCollapsed ? COLLAPSED_WIDTH : sidebarWidth;

	return (
		<aside
			ref={sidebarRef}
			className="border-r bg-card h-screen flex flex-col relative transition-[width] duration-200 ease-out"
			style={{ width: currentWidth }}
		>
			{/* Collapsed state: just the expand button */}
			{sidebarCollapsed && (
				<div className="flex flex-col items-center py-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setSidebarCollapsed(false)}
						title="Expand sidebar (⌘B)"
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			)}

			{/* Expanded state: full content */}
			{!sidebarCollapsed && (
				<>
					<div className="flex-1 overflow-y-auto p-4 overflow-x-hidden">
						<div className="flex items-center gap-2 mb-4">
							<h1 className="text-sm font-semibold leading-tight flex-1 whitespace-nowrap">RSI + Slope Backtester</h1>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setSidebarCollapsed(true)}
								className="flex-shrink-0"
								title="Collapse sidebar (⌘B)"
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

					{/* Resize handle */}
					<div
						className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 active:bg-primary/50 transition-colors"
						onMouseDown={startResizing}
					/>
				</>
			)}
		</aside>
	);
}
