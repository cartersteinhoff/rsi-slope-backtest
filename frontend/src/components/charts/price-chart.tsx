import { useEffect, useRef, useState, useCallback } from "react";
import {
	createChart,
	type IChartApi,
	type ISeriesApi,
	type Time,
	type ISeriesMarkersPluginApi,
	ColorType,
	LineSeries,
	AreaSeries,
	createSeriesMarkers,
	CrosshairMode,
} from "lightweight-charts";
import { Button } from "@/components/ui/button";
import type { ChartData } from "@/types";

interface PriceChartProps {
	data: ChartData;
	height?: number;
}

type RangeOption = "7D" | "1M" | "3M" | "6M" | "1Y" | "2Y" | "3Y" | "4Y" | "5Y" | "ALL";

// Theme colors for the chart
const getChartColors = (isDark: boolean) => ({
	background: isDark ? "#0a0a0a" : "#ffffff",
	textColor: isDark ? "#a1a1aa" : "#71717a",
	gridColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
	baseLineColor: isDark ? "#52525b" : "#a1a1aa",
});

export function PriceChart({ data, height = 500 }: PriceChartProps) {
	const chartContainerRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<IChartApi | null>(null);
	const markerSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
	const lineSeriesRef = useRef<ISeriesApi<"Line">[]>([]);
	const areaSeriesRef = useRef<ISeriesApi<"Area">[]>([]);
	const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
	const [selectedRange, setSelectedRange] = useState<RangeOption>("ALL");
	const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);
	const [isDark, setIsDark] = useState(() =>
		typeof window !== "undefined" ? document.documentElement.classList.contains("dark") : true
	);

	// Helper to format date for custom range display
	const formatDate = useCallback((timestamp: number) => {
		const date = new Date(timestamp * 1000);
		return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
	}, []);

	// Overview chart refs
	const overviewContainerRef = useRef<HTMLDivElement>(null);
	const overviewChartRef = useRef<IChartApi | null>(null);
	const overviewSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
	const selectionRef = useRef<HTMLDivElement>(null);
	const [selectionBounds, setSelectionBounds] = useState({ left: 0, width: 100 });
	const isDragging = useRef<"move" | "left" | "right" | null>(null);
	const dragStart = useRef({ x: 0, left: 0, width: 0 });

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

	const setTimeRange = (range: RangeOption) => {
		if (!chartRef.current || !data.candles.length) return;
		setSelectedRange(range);
		setCustomRange(null); // Clear custom range when preset is selected

		const timeScale = chartRef.current.timeScale();
		const lastCandle = data.candles[data.candles.length - 1];
		const lastTime = lastCandle.time;

		if (range === "ALL") {
			timeScale.fitContent();
			return;
		}

		// Calculate days to show based on range
		const daysMap: Record<Exclude<RangeOption, "ALL">, number> = {
			"7D": 7,
			"1M": 30,
			"3M": 90,
			"6M": 180,
			"1Y": 365,
			"2Y": 365 * 2,
			"3Y": 365 * 3,
			"4Y": 365 * 4,
			"5Y": 365 * 5,
		};

		const days = daysMap[range];
		const fromTime = lastTime - days * 24 * 60 * 60;

		// Find the index of the first candle in range
		const fromIndex = data.candles.findIndex((c) => c.time >= fromTime);
		if (fromIndex >= 0) {
			timeScale.setVisibleLogicalRange({
				from: fromIndex,
				to: data.candles.length - 1,
			});
		}
	};

	// Update selection bounds from main chart's visible range
	const updateSelectionFromChart = useCallback(() => {
		if (!chartRef.current || !overviewContainerRef.current || !data.candles.length) return;

		const logicalRange = chartRef.current.timeScale().getVisibleLogicalRange();
		if (!logicalRange) return;

		const maxIndex = data.candles.length - 1;
		const containerWidth = overviewContainerRef.current.clientWidth;

		const leftPct = Math.max(0, logicalRange.from / maxIndex);
		const rightPct = Math.min(1, logicalRange.to / maxIndex);

		setSelectionBounds({
			left: leftPct * containerWidth,
			width: (rightPct - leftPct) * containerWidth,
		});
	}, [data.candles.length]);

	// Handle selection window drag
	const handleMouseDown = useCallback(
		(e: React.MouseEvent, type: "move" | "left" | "right") => {
			e.preventDefault();
			isDragging.current = type;
			dragStart.current = {
				x: e.clientX,
				left: selectionBounds.left,
				width: selectionBounds.width,
			};
		},
		[selectionBounds]
	);

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isDragging.current || !overviewContainerRef.current || !chartRef.current || !data.candles.length) return;

			const containerWidth = overviewContainerRef.current.clientWidth;
			const deltaX = e.clientX - dragStart.current.x;
			const maxIndex = data.candles.length - 1;
			const minWidth = containerWidth * 0.02; // Minimum 2% width

			let newLeft = dragStart.current.left;
			let newWidth = dragStart.current.width;

			if (isDragging.current === "move") {
				newLeft = Math.max(0, Math.min(containerWidth - dragStart.current.width, dragStart.current.left + deltaX));
			} else if (isDragging.current === "left") {
				const maxLeft = dragStart.current.left + dragStart.current.width - minWidth;
				newLeft = Math.max(0, Math.min(maxLeft, dragStart.current.left + deltaX));
				newWidth = dragStart.current.width - (newLeft - dragStart.current.left);
			} else if (isDragging.current === "right") {
				newWidth = Math.max(minWidth, Math.min(containerWidth - dragStart.current.left, dragStart.current.width + deltaX));
			}

			setSelectionBounds({ left: newLeft, width: newWidth });

			// Update main chart
			const fromPct = newLeft / containerWidth;
			const toPct = (newLeft + newWidth) / containerWidth;
			const fromIndex = Math.round(fromPct * maxIndex);
			const toIndex = Math.round(toPct * maxIndex);

			if (toIndex > fromIndex) {
				chartRef.current.timeScale().setVisibleLogicalRange({
					from: fromIndex,
					to: toIndex,
				});

				// Set custom range display
				const fromDate = data.candles[fromIndex]?.time;
				const toDate = data.candles[toIndex]?.time;
				if (fromDate && toDate) {
					setCustomRange({
						from: formatDate(fromDate as number),
						to: formatDate(toDate as number),
					});
				}
				setSelectedRange("ALL"); // Deselect presets
			}
		},
		[data.candles.length, formatDate]
	);

	const handleMouseUp = useCallback(() => {
		isDragging.current = null;
	}, []);

	// Click on overview to jump to that position
	const handleOverviewClick = useCallback(
		(e: React.MouseEvent) => {
			if (!overviewContainerRef.current || !chartRef.current || !data.candles.length) return;

			// Don't handle if clicking on the selection window itself
			if (isDragging.current) return;

			const rect = overviewContainerRef.current.getBoundingClientRect();
			const clickX = e.clientX - rect.left;
			const containerWidth = rect.width;
			const maxIndex = data.candles.length - 1;

			// Center the current selection width on the click position
			const currentWidth = selectionBounds.width;
			const newLeft = Math.max(0, Math.min(containerWidth - currentWidth, clickX - currentWidth / 2));

			setSelectionBounds({ left: newLeft, width: currentWidth });

			// Update main chart
			const fromPct = newLeft / containerWidth;
			const toPct = (newLeft + currentWidth) / containerWidth;
			const fromIndex = Math.round(fromPct * maxIndex);
			const toIndex = Math.round(toPct * maxIndex);

			if (toIndex > fromIndex) {
				chartRef.current.timeScale().setVisibleLogicalRange({
					from: fromIndex,
					to: toIndex,
				});

				// Set custom range display
				const fromDate = data.candles[fromIndex]?.time;
				const toDate = data.candles[toIndex]?.time;
				if (fromDate && toDate) {
					setCustomRange({
						from: formatDate(fromDate as number),
						to: formatDate(toDate as number),
					});
				}
				setSelectedRange("ALL"); // Deselect presets
			}
		},
		[data.candles.length, selectionBounds.width, formatDate]
	);

	// Global mouse event listeners for dragging
	useEffect(() => {
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [handleMouseMove, handleMouseUp]);

	// Chart initialization - runs once
	useEffect(() => {
		if (!chartContainerRef.current) return;

		const colors = getChartColors(isDark);
		const chart = createChart(chartContainerRef.current, {
			height,
			layout: {
				background: { type: ColorType.Solid, color: colors.background },
				textColor: colors.textColor,
				attributionLogo: false,
			},
			grid: {
				vertLines: { color: colors.gridColor },
				horzLines: { color: colors.gridColor },
			},
			rightPriceScale: { borderVisible: false },
			timeScale: {
				borderVisible: false,
				timeVisible: true,
				secondsVisible: false,
				fixLeftEdge: true,
				fixRightEdge: true,
			},
			crosshair: {
				mode: CrosshairMode.Normal,
			},
		});

		chartRef.current = chart;

		// Handle resize
		const handleResize = () => {
			if (chartContainerRef.current) {
				chart.applyOptions({ width: chartContainerRef.current.clientWidth });
			}
		};

		window.addEventListener("resize", handleResize);
		handleResize();

		// Subscribe to visible range changes to sync overview selection
		const handleVisibleRangeChange = () => {
			if (!isDragging.current) {
				updateSelectionFromChart();
			}
		};

		chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

		return () => {
			chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
			window.removeEventListener("resize", handleResize);
			chart.remove();
			chartRef.current = null;
			markerSeriesRef.current = null;
			lineSeriesRef.current = [];
			areaSeriesRef.current = [];
			markersRef.current = null;
		};
	}, [height, data.candles.length, isDark, updateSelectionFromChart]);

	// Data updates - runs when data changes
	useEffect(() => {
		if (!chartRef.current || !data.candles.length) return;

		const chart = chartRef.current;

		// Remove existing series
		if (markerSeriesRef.current) {
			chart.removeSeries(markerSeriesRef.current);
			markerSeriesRef.current = null;
		}
		for (const series of lineSeriesRef.current) {
			chart.removeSeries(series);
		}
		lineSeriesRef.current = [];
		for (const series of areaSeriesRef.current) {
			chart.removeSeries(series);
		}
		areaSeriesRef.current = [];
		markersRef.current = null;

		// Create base line series (spans all data, hosts markers, visible as fallback)
		const colors = getChartColors(isDark);
		const markerSeries = chart.addSeries(LineSeries, {
			color: colors.baseLineColor,
			lineWidth: 2,
			priceLineVisible: false,
			lastValueVisible: false,
		});
		const fullLineData = data.candles.map((c) => ({ time: c.time as Time, value: c.close }));
		markerSeries.setData(fullLineData);
		markerSeriesRef.current = markerSeries;

		// Create colored line segments for each slope segment (drawn on top of base line)
		if (data.slope_segments && data.slope_segments.length > 0) {
			for (const segment of data.slope_segments) {
				// Get candles within this segment, plus one before and after for continuity
				const segmentStartIdx = data.candles.findIndex((c) => c.time >= segment.start);
				const segmentEndIdx = data.candles.findIndex((c) => c.time > segment.end);

				const startIdx = Math.max(0, segmentStartIdx - 1);
				const endIdx = segmentEndIdx === -1 ? data.candles.length : segmentEndIdx;

				const segmentCandles = data.candles.slice(startIdx, endIdx);
				if (segmentCandles.length < 2) continue;

				// Create area series for background fill
				const areaColor = segment.color === "green" ? "rgba(34, 197, 94, 0.15)" : "rgba(156, 163, 175, 0.15)";
				const areaSeries = chart.addSeries(AreaSeries, {
					topColor: areaColor,
					bottomColor: "rgba(0, 0, 0, 0)",
					lineColor: "rgba(0, 0, 0, 0)",
					lineWidth: 1,
					priceLineVisible: false,
					lastValueVisible: false,
					crosshairMarkerVisible: false,
				});
				const areaData = segmentCandles
					.filter((c) => c.time >= segment.start && c.time <= segment.end)
					.map((c) => ({ time: c.time as Time, value: c.close }));
				areaSeries.setData(areaData);
				areaSeriesRef.current.push(areaSeries);

				// Create line series with segment color
				const lineColor = segment.color === "green" ? "#22c55e" : "#a1a1aa";
				const lineSeries = chart.addSeries(LineSeries, {
					color: lineColor,
					lineWidth: 2,
					priceLineVisible: false,
					lastValueVisible: false,
					crosshairMarkerVisible: false,
				});
				const lineData = segmentCandles.map((c) => ({ time: c.time as Time, value: c.close }));
				lineSeries.setData(lineData);
				lineSeriesRef.current.push(lineSeries);
			}
		}

		// Build markers
		const markers = [
			...data.entries.map((e) => ({
				time: e.time as Time,
				position: "belowBar" as const,
				color: "#22c55e",
				shape: "arrowUp" as const,
				text: "Better",
			})),
			...data.exits.map((e) => ({
				time: e.time as Time,
				position: "aboveBar" as const,
				color: e.return_pct && e.return_pct >= 0 ? "#22c55e" : "#ef4444",
				shape: "arrowDown" as const,
				text: e.return_pct ? `${e.return_pct >= 0 ? "+" : ""}${e.return_pct.toFixed(1)}%` : "Exit",
			})),
			...data.rsi_triggers.map((t) => ({
				time: t.time as Time,
				position: "belowBar" as const,
				color: "#8b5cf6",
				shape: "circle" as const,
				text: "",
			})),
		].sort((a, b) => (a.time as number) - (b.time as number));

		// Create markers on base line series
		if (markerSeries && markers.length > 0) {
			markersRef.current = createSeriesMarkers(markerSeries, markers);
		}

		// Fit content
		chartRef.current?.timeScale().fitContent();
	}, [data, isDark]);

	// Overview chart initialization
	useEffect(() => {
		if (!overviewContainerRef.current) return;

		const colors = getChartColors(isDark);
		const overviewChart = createChart(overviewContainerRef.current, {
			height: 60,
			layout: {
				background: { type: ColorType.Solid, color: "transparent" },
				textColor: colors.textColor,
				attributionLogo: false,
			},
			grid: {
				vertLines: { visible: false },
				horzLines: { visible: false },
			},
			rightPriceScale: { visible: false },
			leftPriceScale: { visible: false },
			timeScale: {
				visible: false,
				borderVisible: false,
			},
			handleScroll: false,
			handleScale: false,
			crosshair: {
				vertLine: { visible: false },
				horzLine: { visible: false },
			},
		});

		overviewChartRef.current = overviewChart;

		// Handle resize
		const handleResize = () => {
			if (overviewContainerRef.current) {
				overviewChart.applyOptions({ width: overviewContainerRef.current.clientWidth });
				updateSelectionFromChart();
			}
		};

		window.addEventListener("resize", handleResize);
		handleResize();

		return () => {
			window.removeEventListener("resize", handleResize);
			overviewChart.remove();
			overviewChartRef.current = null;
			overviewSeriesRef.current = null;
		};
	}, [isDark, updateSelectionFromChart]);

	// Overview chart data updates
	useEffect(() => {
		if (!overviewChartRef.current || !data.candles.length) return;

		const chart = overviewChartRef.current;

		// Remove existing series
		if (overviewSeriesRef.current) {
			chart.removeSeries(overviewSeriesRef.current);
			overviewSeriesRef.current = null;
		}

		// Create area series for overview
		const areaSeries = chart.addSeries(AreaSeries, {
			topColor: isDark ? "rgba(59, 130, 246, 0.4)" : "rgba(59, 130, 246, 0.3)",
			bottomColor: isDark ? "rgba(59, 130, 246, 0.0)" : "rgba(59, 130, 246, 0.0)",
			lineColor: isDark ? "rgba(59, 130, 246, 0.8)" : "rgba(59, 130, 246, 0.6)",
			lineWidth: 1,
			priceLineVisible: false,
			lastValueVisible: false,
			crosshairMarkerVisible: false,
		});

		const areaData = data.candles.map((c) => ({ time: c.time as Time, value: c.close }));
		areaSeries.setData(areaData);
		overviewSeriesRef.current = areaSeries;

		chart.timeScale().fitContent();

		// Initialize selection bounds after data is loaded
		setTimeout(() => updateSelectionFromChart(), 50);
	}, [data, isDark, updateSelectionFromChart]);

	const rangeOptions: RangeOption[] = ["7D", "1M", "3M", "6M", "1Y", "2Y", "3Y", "4Y", "5Y", "ALL"];

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<div className="flex gap-1 items-center">
					{rangeOptions.map((range) => (
						<Button
							key={range}
							variant={selectedRange === range && !customRange ? "default" : "outline"}
							size="sm"
							onClick={() => setTimeRange(range)}
							className="h-7 px-2 text-xs"
						>
							{range}
						</Button>
					))}
					{customRange && (
						<span className="ml-2 text-xs text-muted-foreground">
							{customRange.from} - {customRange.to}
						</span>
					)}
				</div>
				<div className="flex items-center gap-6 text-sm text-muted-foreground">
					<div className="flex items-center gap-1.5">
						<span className="text-lg text-[#22c55e]">▲</span>
						<span>Entry</span>
					</div>
					<div className="flex items-center gap-1.5">
						<span className="text-lg text-[#22c55e]">▼</span>
						<span>Win</span>
					</div>
					<div className="flex items-center gap-1.5">
						<span className="text-lg text-[#ef4444]">▼</span>
						<span>Loss</span>
					</div>
					<div className="flex items-center gap-1.5">
						<span className="text-lg text-[#8b5cf6]">●</span>
						<span>RSI</span>
					</div>
				</div>
			</div>
			<div
				ref={chartContainerRef}
				className="w-full rounded-lg border bg-card"
				style={{ minHeight: height }}
			/>
			{/* Overview Navigator */}
			<div
				className="relative bg-muted/30 rounded-lg overflow-hidden cursor-pointer"
				onClick={handleOverviewClick}
			>
				<div ref={overviewContainerRef} className="w-full" style={{ height: 60 }} />
				{/* Selection overlay */}
				<div className="absolute inset-0 pointer-events-none z-10">
					{/* Left dimmed area */}
					<div
						className="absolute top-0 bottom-0 left-0 bg-background/60"
						style={{ width: selectionBounds.left }}
					/>
					{/* Right dimmed area */}
					<div
						className="absolute top-0 bottom-0 right-0 bg-background/60"
						style={{ left: selectionBounds.left + selectionBounds.width }}
					/>
					{/* Selection window */}
					<div
						ref={selectionRef}
						className="absolute top-0 bottom-0 pointer-events-auto cursor-grab active:cursor-grabbing"
						style={{
							left: selectionBounds.left,
							width: selectionBounds.width,
							borderLeft: "3px solid #3b82f6",
							borderRight: "3px solid #3b82f6",
							backgroundColor: "rgba(59, 130, 246, 0.35)",
							boxShadow: "inset 0 0 0 1px rgba(59, 130, 246, 0.5), 0 0 12px rgba(59, 130, 246, 0.5)",
						}}
						onMouseDown={(e) => {
							e.stopPropagation();
							handleMouseDown(e, "move");
						}}
					>
						{/* Left resize handle */}
						<div
							className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-blue-500/30"
							onMouseDown={(e) => {
								e.stopPropagation();
								handleMouseDown(e, "left");
							}}
						/>
						{/* Right resize handle */}
						<div
							className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-blue-500/30"
							onMouseDown={(e) => {
								e.stopPropagation();
								handleMouseDown(e, "right");
							}}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
