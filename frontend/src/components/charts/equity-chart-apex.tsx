import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { EquityDataPoint, EquityYearlyStats } from "@/types";

interface EquityChartApexProps {
	data: EquityDataPoint[];
	yearlyStats: EquityYearlyStats[];
	entryDate: string;
	systemName: string;
	equityHeight?: number;
	drawdownHeight?: number;
}

// S&P 500 yearly returns (hardcoded for comparison)
const SP500_RETURNS: Record<number, number> = {
	2020: 18.4,
	2021: 28.7,
	2022: -18.1,
	2023: 26.3,
	2024: 25.0,
	2025: 27.6,
};

// S&P 500 yearly max drawdowns
const SP500_DRAWDOWNS: Record<number, number> = {
	2020: 33.9,
	2021: 5.2,
	2022: 25.4,
	2023: 10.3,
	2024: 8.5,
	2025: 19.3,
};

// Theme colors
const getChartColors = (isDark: boolean) => ({
	background: isDark ? "#131629" : "#ffffff",
	textColor: isDark ? "#9ca3af" : "#71717a",
	gridColor: isDark ? "rgba(75, 85, 99, 0.3)" : "rgba(0, 0, 0, 0.1)",
	equityColor: isDark ? "#4C92C3" : "#3b82f6",
	drawdownColor: "rgba(239, 68, 68, 0.5)",
	drawdownLine: "rgba(239, 68, 68, 0.8)",
	entryLineColor: "#22c55e",
	yearLineColor: isDark ? "rgba(156, 163, 175, 0.5)" : "rgba(0, 0, 0, 0.3)",
});

// Format currency for axis
function formatMoney(value: number): string {
	if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
	if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
	return `$${value.toFixed(0)}`;
}

export function EquityChartApex({
	data,
	yearlyStats: _yearlyStats,
	entryDate,
	equityHeight: initialEquityHeight = 450,
	drawdownHeight: initialDrawdownHeight = 250,
}: EquityChartApexProps) {
	void _yearlyStats;

	const [isDark, setIsDark] = useState(() =>
		typeof window !== "undefined"
			? document.documentElement.classList.contains("dark")
			: true
	);
	const [equityHeight, setEquityHeight] = useState(initialEquityHeight);
	const [drawdownHeight, setDrawdownHeight] = useState(initialDrawdownHeight);

	const isResizing = useRef<false | "equity" | "drawdown">(false);
	const resizeStartY = useRef(0);
	const resizeStartHeight = useRef(0);
	const [hoveredYear, setHoveredYear] = useState<number | null>(null);
	const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);

	// Listen for theme changes
	useEffect(() => {
		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.attributeName === "class") {
					setIsDark(document.documentElement.classList.contains("dark"));
				}
			}
		});
		observer.observe(document.documentElement, { attributes: true });
		return () => observer.disconnect();
	}, []);

	// Resize handlers
	const handleResizeMouseDown = useCallback(
		(e: React.MouseEvent, target: "equity" | "drawdown") => {
			e.preventDefault();
			isResizing.current = target;
			resizeStartY.current = e.clientY;
			resizeStartHeight.current = target === "equity" ? equityHeight : drawdownHeight;
			document.body.style.cursor = "ns-resize";
			document.body.style.userSelect = "none";
		},
		[equityHeight, drawdownHeight]
	);

	const handleResizeDoubleClick = useCallback(
		(target: "equity" | "drawdown") => {
			if (target === "equity") {
				setEquityHeight(initialEquityHeight);
			} else {
				setDrawdownHeight(initialDrawdownHeight);
			}
		},
		[initialEquityHeight, initialDrawdownHeight]
	);

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isResizing.current) return;
			const deltaY = e.clientY - resizeStartY.current;
			const newHeight = Math.max(150, Math.min(800, resizeStartHeight.current + deltaY));
			if (isResizing.current === "equity") {
				setEquityHeight(newHeight);
			} else {
				setDrawdownHeight(newHeight);
			}
		};

		const handleMouseUp = () => {
			if (isResizing.current) {
				isResizing.current = false;
				document.body.style.cursor = "";
				document.body.style.userSelect = "";
			}
		};

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, []);

	// Convert data to ApexCharts format with timestamps
	const equitySeriesData = useMemo(() => {
		return data.map((d) => ({
			x: new Date(d.date).getTime(),
			y: d.equity,
		}));
	}, [data]);

	const drawdownSeriesData = useMemo(() => {
		return data.map((d) => ({
			x: new Date(d.date).getTime(),
			y: d.drawdown_pct,
		}));
	}, [data]);

	// Find entry timestamp
	const entryTimestamp = useMemo(() => {
		const entryPoint = data.find(d => d.date === entryDate);
		if (entryPoint) {
			return new Date(entryPoint.date).getTime();
		}
		return new Date(entryDate).getTime();
	}, [data, entryDate]);

	// Get year boundaries for annotations
	const yearBoundaries = useMemo(() => {
		const years = [...new Set(data.map(d => new Date(d.date).getFullYear()))].sort();
		return years.slice(1).map(year => {
			const firstDay = data.find(d => new Date(d.date).getFullYear() === year);
			return {
				year,
				timestamp: firstDay ? new Date(firstDay.date).getTime() : new Date(`${year}-01-02`).getTime(),
			};
		});
	}, [data]);

	// Calculate yearly stats for cards and annotations
	const yearlyData = useMemo(() => {
		const years: Map<number, {
			startEquity: number;
			endEquity: number;
			endDate: string;
			maxDD: number;
			maxDDDate: string;
			profitPct: number;
		}> = new Map();

		for (const point of data) {
			const year = new Date(point.date).getFullYear();
			const existing = years.get(year);

			if (!existing) {
				years.set(year, {
					startEquity: point.equity,
					endEquity: point.equity,
					endDate: point.date,
					maxDD: point.drawdown_pct,
					maxDDDate: point.date,
					profitPct: 0,
				});
			} else {
				existing.endEquity = point.equity;
				existing.endDate = point.date;
				if (point.drawdown_pct > existing.maxDD) {
					existing.maxDD = point.drawdown_pct;
					existing.maxDDDate = point.date;
				}
			}
		}

		// Calculate profit percentages
		years.forEach((info) => {
			info.profitPct = ((info.endEquity - info.startEquity) / info.startEquity) * 100;
		});

		return years;
	}, [data]);

	const colors = getChartColors(isDark);

	// Build x-axis annotations for entry and year dividers
	const xAxisAnnotations = useMemo(() => {
		const annotations: NonNullable<ApexOptions["annotations"]>["xaxis"] = [];

		// Entry line annotation
		annotations.push({
			x: entryTimestamp,
			borderColor: colors.entryLineColor,
			borderWidth: 3,
			label: {
				text: "Entry",
				borderColor: colors.entryLineColor,
				style: {
					color: "#fff",
					background: colors.entryLineColor,
					fontSize: "14px",
					fontWeight: "bold",
					padding: {
						left: 8,
						right: 8,
						top: 4,
						bottom: 4,
					},
				},
				position: "top",
				offsetY: 0,
			},
		});

		// Year divider lines
		yearBoundaries.forEach((boundary) => {
			annotations.push({
				x: boundary.timestamp,
				borderColor: colors.yearLineColor,
				borderWidth: 2,
				strokeDashArray: 8,
			});
		});

		return annotations;
	}, [entryTimestamp, yearBoundaries, colors]);

	// Point annotations for yearly profit percentages on equity chart
	const equityPointAnnotations = useMemo(() => {
		const points: NonNullable<ApexOptions["annotations"]>["points"] = [];

		yearlyData.forEach((info, year) => {
			points.push({
				x: new Date(info.endDate).getTime(),
				y: info.endEquity,
				marker: {
					size: 0,
				},
				label: {
					text: `${info.profitPct >= 0 ? "+" : ""}${info.profitPct.toFixed(1)}%`,
					borderColor: "transparent",
					style: {
						color: "#22c55e",
						background: "transparent",
						fontSize: "14px",
						fontWeight: "bold",
					},
					offsetY: -15,
					offsetX: 0,
				},
			});
		});

		return points;
	}, [yearlyData]);

	// Point annotations for max drawdown percentages on drawdown chart
	const drawdownPointAnnotations = useMemo(() => {
		const points: NonNullable<ApexOptions["annotations"]>["points"] = [];

		yearlyData.forEach((info, year) => {
			points.push({
				x: new Date(info.maxDDDate).getTime(),
				y: info.maxDD,
				marker: {
					size: 0,
				},
				label: {
					text: `-${info.maxDD.toFixed(1)}%`,
					borderColor: "transparent",
					style: {
						color: "#ef4444",
						background: "transparent",
						fontSize: "14px",
						fontWeight: "bold",
					},
					offsetY: 15,
					offsetX: 20,
				},
			});
		});

		return points;
	}, [yearlyData]);

	// Equity chart options
	const equityOptions: ApexOptions = useMemo(
		() => ({
			chart: {
				id: "equity-apex",
				type: "line",
				height: equityHeight,
				background: colors.background,
				toolbar: {
					show: true,
					tools: {
						download: false,
						selection: true,
						zoom: true,
						zoomin: true,
						zoomout: true,
						pan: true,
						reset: true,
					},
				},
				zoom: {
					enabled: true,
					type: "x",
				},
				animations: {
					enabled: false,
				},
			},
			stroke: {
				curve: "straight",
				width: 2,
			},
			colors: [colors.equityColor],
			xaxis: {
				type: "datetime",
				labels: {
					style: { colors: colors.textColor },
					datetimeFormatter: {
						year: "yyyy",
						month: "MMM 'yy",
						day: "dd MMM",
					},
				},
				axisBorder: { show: false },
				axisTicks: { show: false },
			},
			yaxis: {
				title: {
					text: "Equity ($)",
					style: {
						color: colors.textColor,
						fontSize: "12px",
						fontWeight: 500,
					},
				},
				labels: {
					style: { colors: colors.textColor },
					formatter: (value: number) => formatMoney(value),
				},
				opposite: false,
			},
			grid: {
				borderColor: colors.gridColor,
				strokeDashArray: 0,
			},
			annotations: {
				xaxis: xAxisAnnotations,
				points: equityPointAnnotations,
			},
			tooltip: {
				theme: isDark ? "dark" : "light",
				x: {
					format: "dd MMM yyyy",
				},
				y: {
					formatter: (value: number) => formatMoney(value),
				},
			},
			dataLabels: {
				enabled: false,
			},
			legend: {
				show: false,
			},
		}),
		[equityHeight, colors, xAxisAnnotations, equityPointAnnotations, isDark]
	);

	// Drawdown chart options
	const drawdownOptions: ApexOptions = useMemo(
		() => ({
			chart: {
				id: "drawdown-apex",
				type: "area",
				height: drawdownHeight,
				background: colors.background,
				toolbar: {
					show: false,
				},
				zoom: {
					enabled: true,
					type: "x",
				},
				animations: {
					enabled: false,
				},
				brush: {
					enabled: true,
					target: "equity-apex",
				},
			},
			stroke: {
				curve: "straight",
				width: 1,
			},
			colors: [colors.drawdownLine],
			fill: {
				type: "solid",
				colors: ["#ef4444"],
				opacity: 0.25,
			},
			xaxis: {
				type: "datetime",
				labels: {
					style: { colors: colors.textColor },
					datetimeFormatter: {
						year: "yyyy",
						month: "MMM 'yy",
						day: "dd MMM",
					},
				},
				axisBorder: { show: false },
				axisTicks: { show: false },
			},
			yaxis: {
				title: {
					text: "Drawdown (%)",
					style: {
						color: colors.textColor,
						fontSize: "12px",
						fontWeight: 500,
					},
				},
				reversed: true,
				labels: {
					style: { colors: colors.textColor },
					formatter: (value: number) => `-${value.toFixed(1)}%`,
				},
				opposite: false,
			},
			grid: {
				borderColor: colors.gridColor,
				strokeDashArray: 0,
			},
			annotations: {
				xaxis: xAxisAnnotations,
				points: drawdownPointAnnotations,
			},
			tooltip: {
				theme: isDark ? "dark" : "light",
				x: {
					format: "dd MMM yyyy",
				},
				y: {
					formatter: (value: number) => `-${value.toFixed(2)}%`,
				},
			},
			dataLabels: {
				enabled: false,
			},
			legend: {
				show: false,
			},
		}),
		[drawdownHeight, colors, xAxisAnnotations, drawdownPointAnnotations, isDark]
	);

	// Summary metrics
	const summaryMetrics = useMemo(() => {
		if (!data.length) return null;

		const startEquity = data[0].equity;
		const endEquity = data[data.length - 1].equity;
		const totalReturn = ((endEquity - startEquity) / startEquity) * 100;
		const maxDrawdown = Math.max(...data.map((d) => d.drawdown_pct));

		return { startEquity, endEquity, totalReturn, maxDrawdown };
	}, [data]);

	// Get sorted years for the performance cards
	const sortedYears = useMemo(() => {
		return [...yearlyData.entries()].sort((a, b) => a[0] - b[0]);
	}, [yearlyData]);

	return (
		<div className="space-y-2">
			{/* Equity Chart */}
			<div className="relative border bg-card rounded">
				<Chart
					options={equityOptions}
					series={[{ name: "Equity", data: equitySeriesData }]}
					type="line"
					height={equityHeight}
				/>
				{/* Invisible hover overlay to detect year segments */}
				<div
					className="absolute inset-0 z-10"
					style={{ pointerEvents: "all" }}
					onMouseMove={(e) => {
						const rect = e.currentTarget.getBoundingClientRect();
						const x = e.clientX - rect.left;
						const chartWidth = rect.width - 60; // Account for margins
						const chartLeft = 45; // Left margin

						if (x < chartLeft || x > chartLeft + chartWidth) {
							setHoveredYear(null);
							return;
						}

						// Find which year segment we're in
						const years = [...yearlyData.keys()].sort((a, b) => a - b);
						const segmentWidth = chartWidth / years.length;
						const segmentIndex = Math.floor((x - chartLeft) / segmentWidth);
						const year = years[Math.min(segmentIndex, years.length - 1)];

						setHoveredYear(year);
						setHoverPosition({ x: e.clientX, y: e.clientY });
					}}
					onMouseLeave={() => {
						setHoveredYear(null);
						setHoverPosition(null);
					}}
				/>
				{/* Resize handle */}
				<div
					className="absolute -bottom-1 left-0 right-0 h-3 cursor-ns-resize hover:bg-primary/30 z-20 transition-colors"
					onMouseDown={(e) => handleResizeMouseDown(e, "equity")}
					onDoubleClick={() => handleResizeDoubleClick("equity")}
				/>
			</div>

			{/* Hover Tooltip */}
			{hoveredYear !== null && hoverPosition && yearlyData.has(hoveredYear) && (
				<div
					className="fixed bg-gray-900 text-white rounded-lg shadow-xl p-3 z-50 pointer-events-none"
					style={{
						left: hoverPosition.x + 15,
						top: hoverPosition.y - 100,
					}}
				>
					<div className="text-center font-bold text-lg mb-2 border-b border-gray-600 pb-1">
						{hoveredYear}
					</div>
					<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm whitespace-nowrap">
						<div className="text-gray-400">System:</div>
						<div className={yearlyData.get(hoveredYear)!.profitPct >= 0 ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
							{yearlyData.get(hoveredYear)!.profitPct >= 0 ? "+" : ""}{yearlyData.get(hoveredYear)!.profitPct.toFixed(1)}%
						</div>
						<div className="text-gray-400">Max DD:</div>
						<div className="text-red-400 font-semibold">-{yearlyData.get(hoveredYear)!.maxDD.toFixed(1)}%</div>
						{SP500_RETURNS[hoveredYear] !== undefined && (
							<>
								<div className="text-gray-400">SPY:</div>
								<div className={SP500_RETURNS[hoveredYear] >= 0 ? "text-blue-400 font-semibold" : "text-red-400 font-semibold"}>
									{SP500_RETURNS[hoveredYear] >= 0 ? "+" : ""}{SP500_RETURNS[hoveredYear].toFixed(1)}%
								</div>
								<div className="text-gray-400">SPY DD:</div>
								<div className="text-red-400 font-semibold">-{SP500_DRAWDOWNS[hoveredYear]?.toFixed(1) ?? "?"}%</div>
							</>
						)}
					</div>
				</div>
			)}

			{/* Drawdown Chart */}
			<div className="relative border bg-card rounded">
				<Chart
					options={drawdownOptions}
					series={[{ name: "Drawdown", data: drawdownSeriesData }]}
					type="area"
					height={drawdownHeight}
				/>
				{/* Resize handle */}
				<div
					className="absolute -bottom-1 left-0 right-0 h-3 cursor-ns-resize hover:bg-primary/30 z-20 transition-colors"
					onMouseDown={(e) => handleResizeMouseDown(e, "drawdown")}
					onDoubleClick={() => handleResizeDoubleClick("drawdown")}
				/>
			</div>

			{/* Summary Stats */}
			{summaryMetrics && (
				<div className="grid grid-cols-4 gap-3 text-center mt-4">
					<div className="bg-card rounded-lg p-2 border">
						<div className="text-xs text-muted-foreground">Start</div>
						<div className="text-sm font-bold">
							{formatMoney(summaryMetrics.startEquity)}
						</div>
					</div>
					<div className="bg-card rounded-lg p-2 border">
						<div className="text-xs text-muted-foreground">Current</div>
						<div className="text-sm font-bold">
							{formatMoney(summaryMetrics.endEquity)}
						</div>
					</div>
					<div className="bg-card rounded-lg p-2 border">
						<div className="text-xs text-muted-foreground">Total Return</div>
						<div
							className={`text-sm font-bold ${
								summaryMetrics.totalReturn >= 0 ? "text-green-600" : "text-red-600"
							}`}
						>
							{summaryMetrics.totalReturn >= 0 ? "+" : ""}
							{summaryMetrics.totalReturn.toFixed(1)}%
						</div>
					</div>
					<div className="bg-card rounded-lg p-2 border">
						<div className="text-xs text-muted-foreground">Max Drawdown</div>
						<div className="text-sm font-bold text-red-600">
							-{summaryMetrics.maxDrawdown.toFixed(1)}%
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
