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
	showEntry?: boolean;
}

// S&P 500 yearly returns (source: macrotrends.net)
const SP500_RETURNS: Record<number, number> = {
	2018: -6.24,
	2019: 28.88,
	2020: 16.26,
	2021: 26.89,
	2022: -19.44,
	2023: 24.23,
	2024: 23.31,
	2025: 16.2,
};

// S&P 500 yearly max drawdowns (peak-to-trough within each year)
const SP500_DRAWDOWNS: Record<number, number> = {
	2018: 19.8,
	2019: 6.8,
	2020: 33.9,
	2021: 5.2,
	2022: 25.4,
	2023: 10.3,
	2024: 8.5,
	2025: 10.0,
};

// Theme colors
const getChartColors = (isDark: boolean) => ({
	background: isDark ? "#131629" : "#ffffff",
	textColor: isDark ? "#9ca3af" : "#71717a",
	gridColor: isDark ? "rgba(75, 85, 99, 0.3)" : "rgba(0, 0, 0, 0.1)",
	equityColor: isDark ? "#4C92C3" : "#3b82f6",
	spyColor: isDark ? "#22c55e" : "#16a34a", // Green for SPY
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
	equityHeight: initialEquityHeight = 565,
	drawdownHeight: initialDrawdownHeight = 275,
	showEntry = true,
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
	const [showStaticTooltips, setShowStaticTooltips] = useState(true);
	const [showSpy, setShowSpy] = useState(true);
	const [showHoverTooltip, setShowHoverTooltip] = useState(false);
	const chartContainerRef = useRef<HTMLDivElement>(null);
	const [containerWidth, setContainerWidth] = useState(0);

	// Track container width for tooltip positioning
	useEffect(() => {
		const updateWidth = () => {
			if (chartContainerRef.current) {
				setContainerWidth(chartContainerRef.current.offsetWidth);
			}
		};
		updateWidth();
		window.addEventListener('resize', updateWidth);
		return () => window.removeEventListener('resize', updateWidth);
	}, []);

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

	// Filter data to start from 2020 (exclude partial years 2018-2019)
	const filteredData = useMemo(() => {
		return data.filter((d) => new Date(d.date).getFullYear() >= 2020);
	}, [data]);

	// Convert data to ApexCharts format with timestamps
	const equitySeriesData = useMemo(() => {
		return filteredData.map((d) => ({
			x: new Date(d.date).getTime(),
			y: d.equity,
		}));
	}, [filteredData]);

	// SPY equity series (all points, null where no spy_equity)
	const spySeriesData = useMemo(() => {
		return filteredData.map((d) => ({
			x: new Date(d.date).getTime(),
			y: d.spy_equity ?? null,
		}));
	}, [filteredData]);

	// Check if we have any SPY data
	const hasSpyData = useMemo(() => {
		return filteredData.some((d) => d.spy_equity != null);
	}, [filteredData]);

	const drawdownSeriesData = useMemo(() => {
		return filteredData.map((d) => ({
			x: new Date(d.date).getTime(),
			y: d.drawdown_pct,
		}));
	}, [filteredData]);

	// Find entry timestamp
	const entryTimestamp = useMemo(() => {
		const entryPoint = data.find(d => d.date === entryDate);
		if (entryPoint) {
			return new Date(entryPoint.date).getTime();
		}
		return new Date(entryDate).getTime();
	}, [data, entryDate]);

	// Get year boundaries for annotations (starting from 2021 since chart starts at 2020)
	const yearBoundaries = useMemo(() => {
		const years = [...new Set(filteredData.map(d => new Date(d.date).getFullYear()))].sort();
		return years.slice(1).map(year => {
			const firstDay = filteredData.find(d => new Date(d.date).getFullYear() === year);
			return {
				year,
				timestamp: firstDay ? new Date(firstDay.date).getTime() : new Date(`${year}-01-02`).getTime(),
			};
		});
	}, [filteredData]);

	// Calculate yearly stats for cards and annotations
	const yearlyData = useMemo(() => {
		const years: Map<number, {
			startEquity: number;
			startDate: string;
			endEquity: number;
			endDate: string;
			maxDD: number;
			maxDDDate: string;
			profitPct: number;
		}> = new Map();

		// Collect start equity, end equity, and max DD for each year
		for (const point of data) {
			const year = new Date(point.date).getFullYear();
			const existing = years.get(year);

			if (!existing) {
				// First point of this year - use as start equity
				years.set(year, {
					startEquity: point.equity,
					startDate: point.date,
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

		// Exclude partial years from display
		years.delete(2018);
		years.delete(2019);

		return years;
	}, [data]);

	// Calculate static tooltip positions for each year
	const staticTooltipPositions = useMemo(() => {
		if (!filteredData.length || !containerWidth) return new Map<number, { xPixel: number; position: 'top' | 'bottom' }>();

		const minEquity = Math.min(...filteredData.map(d => d.equity));
		const maxEquity = Math.max(...filteredData.map(d => d.equity));
		const equityRange = maxEquity - minEquity;
		const midEquity = minEquity + equityRange / 2;

		const positions = new Map<number, { xPixel: number; position: 'top' | 'bottom' }>();

		// Chart margins (ApexCharts defaults)
		const leftMargin = 62; // y-axis labels
		const rightMargin = 12;
		const plotWidth = containerWidth - leftMargin - rightMargin;

		// X-axis range (matches chart config)
		const xAxisMin = new Date("2020-01-01").getTime();
		const xAxisMax = new Date(filteredData[filteredData.length - 1].date).getTime();
		const xAxisRange = xAxisMax - xAxisMin;

		yearlyData.forEach((info, year) => {
			// Calculate X position (midpoint of year segment)
			const startTime = new Date(info.startDate).getTime();
			const endTime = new Date(info.endDate).getTime();
			const midTime = startTime + (endTime - startTime) / 2;

			// Convert timestamp to pixel position
			const xRatio = (midTime - xAxisMin) / xAxisRange;
			const xPixel = leftMargin + (xRatio * plotWidth);

			// Calculate average equity for this year to determine position
			const yearData = filteredData.filter(d => new Date(d.date).getFullYear() === year);
			const avgEquity = yearData.reduce((sum, d) => sum + d.equity, 0) / yearData.length;

			// If equity is below 50%, tooltip at top; if 50%+ tooltip at bottom
			const position = avgEquity < midEquity ? 'top' : 'bottom';

			positions.set(year, { xPixel, position });
		});

		return positions;
	}, [filteredData, yearlyData, containerWidth]);

	const colors = getChartColors(isDark);

	// Build x-axis annotations for entry and year dividers
	const xAxisAnnotations = useMemo(() => {
		const annotations: NonNullable<ApexOptions["annotations"]>["xaxis"] = [];

		// Entry line annotation (conditional)
		if (showEntry) {
			const entryDateFormatted = new Date(entryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
			annotations.push({
				x: entryTimestamp,
				borderColor: colors.entryLineColor,
				borderWidth: 3,
				label: {
					text: `Entry\n${entryDateFormatted}`,
					borderColor: colors.entryLineColor,
					style: {
						color: "#fff",
						background: colors.entryLineColor,
						fontSize: "12px",
						fontWeight: "bold",
						padding: {
							left: 8,
							right: 8,
							top: 4,
							bottom: 4,
						},
					},
					position: "top",
					offsetY: 150,
				},
			});
		}

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
	}, [entryTimestamp, entryDate, yearBoundaries, colors, showEntry]);

	// Year labels positioned in the middle of each year segment
	const yearLabelAnnotations = useMemo(() => {
		const points: NonNullable<ApexOptions["annotations"]>["points"] = [];
		
		yearlyData.forEach((info, year) => {
			// Calculate midpoint of the year
			const startTime = new Date(info.startDate).getTime();
			const endTime = new Date(info.endDate).getTime();
			const midTime = startTime + (endTime - startTime) / 2;
			
			points.push({
				x: midTime,
				y: 0,
				marker: { size: 0 },
				label: {
					text: String(year),
					borderColor: "transparent",
					style: {
						color: colors.textColor,
						background: "transparent",
						fontSize: "16px",
						fontWeight: "bold",
					},
					offsetY: 20,
					position: "bottom",
				},
			});
		});
		
		return points;
	}, [yearlyData, colors.textColor]);

	// Point annotations for yearly profit percentages on equity chart
	// Position at the year divider lines
	const equityPointAnnotations = useMemo(() => {
		const points: NonNullable<ApexOptions["annotations"]>["points"] = [];

		yearlyData.forEach((info, year) => {
			// Find next year's boundary (the divider line at end of this year)
			const nextYearBoundary = yearBoundaries.find(b => b.year === year + 1);
			
			if (nextYearBoundary) {
				// Position at the divider line
				points.push({
					x: nextYearBoundary.timestamp,
					y: info.endEquity,
					marker: {
						size: 0,
					},
					label: {
						text: `${info.profitPct.toFixed(1)}%`,
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
			} else {
				// Current year (no next divider) - position at end of data, offset left to avoid cutoff
				points.push({
					x: new Date(info.endDate).getTime(),
					y: info.endEquity,
					marker: {
						size: 0,
					},
					label: {
						text: `${info.profitPct.toFixed(1)}%`,
						borderColor: "transparent",
						style: {
							color: "#22c55e",
							background: "transparent",
							fontSize: "14px",
							fontWeight: "bold",
						},
						offsetY: -15,
						offsetX: -20,
					},
				});
			}
		});

		return points;
	}, [yearlyData, yearBoundaries]);

	// Point annotations for max drawdown percentages on drawdown chart
	const drawdownPointAnnotations = useMemo(() => {
		const points: NonNullable<ApexOptions["annotations"]>["points"] = [];

		yearlyData.forEach((info, _year) => {
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
			colors: [colors.equityColor, colors.spyColor],
			xaxis: {
				type: "datetime",
				min: new Date("2020-01-01").getTime(),
				labels: {
					show: false,
				},
				axisBorder: { show: false },
				axisTicks: { show: false },
				crosshairs: {
					show: true,
					stroke: {
						color: colors.gridColor,
						width: 1,
						dashArray: 3,
					},
				},
				tooltip: {
					enabled: false,
				},
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
				clipMarkers: false,
			},
			annotations: {
				xaxis: xAxisAnnotations,
				points: [...equityPointAnnotations, ...yearLabelAnnotations],
				position: "front",
			},
			tooltip: {
				enabled: showHoverTooltip,
				shared: true,
				intersect: false,
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
		[equityHeight, colors, xAxisAnnotations, equityPointAnnotations, yearLabelAnnotations, isDark, showHoverTooltip]
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
				min: new Date("2020-01-01").getTime(),
				tickAmount: 6,
				labels: {
					style: { colors: colors.textColor, fontSize: "16px", fontWeight: 600 },
					datetimeFormatter: {
						year: "yyyy",
						month: "MMM 'yy",
						day: "dd MMM",
					},
					datetimeUTC: false,
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

	return (
		<div className="space-y-2">
			{/* Equity Chart */}
			<div className="relative border bg-card rounded" ref={chartContainerRef}>
				{/* Toggle buttons - positioned to align with ApexCharts toolbar */}
				<div className="absolute top-[3px] right-[140px] z-30 flex gap-1.5">
					{/* SPY toggle */}
					{hasSpyData && (
						<button
							onClick={() => setShowSpy(!showSpy)}
							className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
								showSpy
									? 'bg-green-600 text-white border-green-600'
									: 'bg-transparent text-slate-400 border-slate-500 hover:border-slate-400'
							}`}
							title={showSpy ? "Hide SPY" : "Show SPY"}
						>
							SPY
						</button>
					)}
					{/* Yearly stats toggle */}
					<button
						onClick={() => setShowStaticTooltips(!showStaticTooltips)}
						className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
							showStaticTooltips
								? 'bg-blue-500 text-white border-blue-500'
								: 'bg-transparent text-slate-400 border-slate-500 hover:border-slate-400'
						}`}
						title={showStaticTooltips ? "Hide yearly stats" : "Show yearly stats"}
					>
						Yearly Stats
					</button>
					{/* Crosshair toggle */}
					<button
						onClick={() => setShowHoverTooltip(!showHoverTooltip)}
						className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
							showHoverTooltip
								? 'bg-purple-500 text-white border-purple-500'
								: 'bg-transparent text-slate-400 border-slate-500 hover:border-slate-400'
						}`}
						title={showHoverTooltip ? "Hide crosshair" : "Show crosshair"}
					>
						Crosshair
					</button>
				</div>

				<Chart
					options={equityOptions}
					series={[
						{ name: "System", data: equitySeriesData },
						...(showSpy && hasSpyData
							? [{ name: "SPY", data: spySeriesData }]
							: []),
					]}
					type="line"
					height={equityHeight}
				/>

				{/* Static Tooltips */}
				{showStaticTooltips && Array.from(yearlyData.entries()).map(([year, info]) => {
					const pos = staticTooltipPositions.get(year);
					if (!pos) return null;

					return (
						<div
							key={year}
							className="absolute z-20 bg-slate-800/95 hover:bg-slate-800/30 border border-slate-600 hover:border-slate-600/50 text-white rounded-lg shadow-xl p-2 text-xs transition-all duration-200"
							style={{
								left: `${pos.xPixel}px`,
								transform: 'translateX(-50%)',
								...(pos.position === 'top'
									? { top: '40px' }
									: { bottom: '40px' }
								),
							}}
						>
							<div className="text-center font-bold text-sm mb-1 border-b border-gray-600 pb-1">
								{year}
							</div>
							<div className="grid grid-cols-2 gap-x-3 gap-y-0.5 whitespace-nowrap">
								<div className="text-gray-400">System:</div>
								<div className={info.profitPct >= 0 ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
									{info.profitPct >= 0 ? "+" : ""}{info.profitPct.toFixed(1)}%
								</div>
								{SP500_RETURNS[year] !== undefined && (
									<>
										<div className="text-gray-400">SPY:</div>
										<div className={SP500_RETURNS[year] >= 0 ? "text-blue-400 font-semibold" : "text-red-400 font-semibold"}>
											{SP500_RETURNS[year] >= 0 ? "+" : ""}{SP500_RETURNS[year].toFixed(1)}%
										</div>
									</>
								)}
								<div className="text-gray-400">Max DD:</div>
								<div className="text-red-400 font-semibold">-{info.maxDD.toFixed(1)}%</div>
								{SP500_DRAWDOWNS[year] !== undefined && (
									<>
										<div className="text-gray-400">SPY DD:</div>
										<div className="text-red-400 font-semibold">-{SP500_DRAWDOWNS[year].toFixed(1)}%</div>
									</>
								)}
							</div>
						</div>
					);
				})}
				{/* Resize handle */}
				<div
					className="absolute -bottom-1 left-0 right-0 h-3 cursor-ns-resize hover:bg-primary/30 z-20 transition-colors"
					onMouseDown={(e) => handleResizeMouseDown(e, "equity")}
					onDoubleClick={() => handleResizeDoubleClick("equity")}
				/>
			</div>

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
		</div>
	);
}
