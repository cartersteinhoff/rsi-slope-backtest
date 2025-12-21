import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
	createChart,
	type IChartApi,
	type ISeriesApi,
	type Time,
	ColorType,
	LineSeries,
	AreaSeries,
	CrosshairMode,
} from "lightweight-charts";
import type { EquityDataPoint, EquityYearlyStats } from "@/types";

interface EquityChartProps {
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
	2025: 27.6, // YTD estimate
};

// Theme colors
const getChartColors = (isDark: boolean) => ({
	background: isDark ? "#131629" : "#ffffff",
	textColor: isDark ? "#7b8ab8" : "#71717a",
	gridColor: isDark ? "rgba(41, 98, 255, 0.08)" : "rgba(0, 0, 0, 0.1)",
	equityColor: isDark ? "#4C92C3" : "#3b82f6",
	equityColorLight: isDark ? "#A0C4E8" : "#93c5fd",
	drawdownColor: "rgba(239, 68, 68, 0.5)",
	drawdownLine: "rgba(239, 68, 68, 0.8)",
	entryLineColor: "#22c55e",
	yearLineColor: isDark ? "rgba(100, 100, 100, 0.5)" : "rgba(0, 0, 0, 0.3)",
});

// Convert date string to Unix timestamp
function dateToTimestamp(dateStr: string): number {
	return Math.floor(new Date(dateStr).getTime() / 1000);
}

// Format currency for axis
function formatMoney(value: number): string {
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
	return `${value.toFixed(0)}`;
}

// Annotation box position type
interface AnnotationPosition {
	year: number;
	x: number;
	equityY: number;
	drawdownY: number;
	drawdownX: number;
	profitPct: number;
	maxDD: number;
	endEquity: number;
	boxY: number; // Smart positioned Y for box
}

export function EquityChart({
	data,
	yearlyStats: _yearlyStats,
	entryDate,
	systemName,
	equityHeight: initialEquityHeight = 450,
	drawdownHeight: initialDrawdownHeight = 250,
}: EquityChartProps) {
	// yearlyStats available for future use
	void _yearlyStats;
	// Chart refs
	const equityContainerRef = useRef<HTMLDivElement>(null);
	const equityChartRef = useRef<IChartApi | null>(null);
	const equitySeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
	const equityLiveSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

	const drawdownContainerRef = useRef<HTMLDivElement>(null);
	const drawdownChartRef = useRef<IChartApi | null>(null);
	const drawdownSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);

	// State
	const [isDark, setIsDark] = useState(() =>
		typeof window !== "undefined"
			? document.documentElement.classList.contains("dark")
			: true
	);
	const [equityHeight, setEquityHeight] = useState(initialEquityHeight);
	const [drawdownHeight, setDrawdownHeight] = useState(initialDrawdownHeight);
	const [annotations, setAnnotations] = useState<AnnotationPosition[]>([]);
	const [entryAnnotation, setEntryAnnotation] = useState<{ x: number; visible: boolean } | null>(null);
	const [yearDividers, setYearDividers] = useState<{ year: number; x: number }[]>([]);
	const [yearLabels, setYearLabels] = useState<{ year: number; x: number }[]>([]);
	const isResizing = useRef<false | "equity" | "drawdown">(false);
	const resizeStartY = useRef(0);
	const resizeStartHeight = useRef(0);

	// Parse entry date timestamp
	const entryTimestamp = useMemo(() => dateToTimestamp(entryDate), [entryDate]);

	// Get first trading day of each year for divider lines
	const yearBoundaries = useMemo(() => {
		const years = [...new Set(data.map(d => new Date(d.date).getFullYear()))].sort();
		// Skip first year, find first trading day of each year
		return years.slice(1).map(year => {
			const firstDay = data.find(d => new Date(d.date).getFullYear() === year);
			return {
				year,
				timestamp: firstDay ? dateToTimestamp(firstDay.date) : dateToTimestamp(`${year}-01-02`),
			};
		});
	}, [data]);

	// Get year boundaries and stats
	const yearData = useMemo(() => {
		const years: Map<number, {
			startDate: string;
			endDate: string;
			startEquity: number;
			endEquity: number;
			maxDD: number;
			maxDDDate: string;
		}> = new Map();

		for (const point of data) {
			const year = new Date(point.date).getFullYear();
			const existing = years.get(year);

			if (!existing) {
				years.set(year, {
					startDate: point.date,
					endDate: point.date,
					startEquity: point.equity,
					endEquity: point.equity,
					maxDD: point.drawdown_pct,
					maxDDDate: point.date,
				});
			} else {
				existing.endDate = point.date;
				existing.endEquity = point.equity;
				if (point.drawdown_pct > existing.maxDD) {
					existing.maxDD = point.drawdown_pct;
					existing.maxDDDate = point.date;
				}
			}
		}

		return years;
	}, [data]);


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

	// Smart box positioning - position boxes above curve and avoid overlaps
	const calculateBoxPositions = useCallback((
		annotations: Array<{ year: number; x: number; equityY: number }>,
		chartHeight: number
	): Map<number, number> => {
		const boxHeight = 65;
		const boxWidth = 70;
		const minY = 10;
		const maxY = chartHeight - boxHeight - 10;
		const positions = new Map<number, number>();

		// Sort by X position (left to right)
		const sorted = [...annotations].sort((a, b) => a.x - b.x);

		for (let i = 0; i < sorted.length; i++) {
			const ann = sorted[i];
			// Initial position: above the curve
			let targetY = Math.max(minY, ann.equityY - 85);

			// Check for overlap with previous boxes
			for (let j = 0; j < i; j++) {
				const prevAnn = sorted[j];
				const prevY = positions.get(prevAnn.year) ?? 0;

				// Check if X positions are close enough to potentially overlap
				const xOverlap = Math.abs(ann.x - prevAnn.x) < boxWidth + 10;

				if (xOverlap) {
					// Check Y overlap
					const yOverlap = Math.abs(targetY - prevY) < boxHeight + 5;

					if (yOverlap) {
						// Move this box up or down to avoid overlap
						if (targetY >= prevY) {
							// Try moving down
							targetY = prevY + boxHeight + 10;
						} else {
							// Try moving up
							targetY = prevY - boxHeight - 10;
						}
					}
				}
			}

			// Ensure within bounds
			targetY = Math.max(minY, Math.min(maxY, targetY));
			positions.set(ann.year, targetY);
		}

		return positions;
	}, []);

	// Update annotation positions
	const updateAnnotations = useCallback(() => {
		if (!equityChartRef.current || !drawdownChartRef.current) return;
		if (!equityContainerRef.current || !drawdownContainerRef.current) return;

		const equityChart = equityChartRef.current;
		const drawdownChart = drawdownChartRef.current;
		const equitySeries = equitySeriesRef.current;
		const drawdownSeries = drawdownSeriesRef.current;

		if (!equitySeries || !drawdownSeries) return;

		const containerWidth = equityContainerRef.current.clientWidth;

		// First pass: collect all annotation data with coordinates
		const rawAnnotations: Array<{
			year: number;
			x: number;
			equityY: number;
			drawdownY: number;
			drawdownX: number;
			profitPct: number;
			maxDD: number;
			endEquity: number;
		}> = [];

		// Sort years to process in order
		const sortedYears = [...yearData.entries()].sort((a, b) => a[0] - b[0]);

		sortedYears.forEach(([year, info]) => {
			// Get x position for end of year
			const endTs = dateToTimestamp(info.endDate) as Time;
			const xCoord = equityChart.timeScale().timeToCoordinate(endTs);

			if (xCoord === null || xCoord < 80 || xCoord > containerWidth - 80) return;

			// Get y position on equity chart
			const equityYCoord = equitySeries.priceToCoordinate(info.endEquity);

			// Get y position on drawdown chart for max DD
			const maxDDTs = dateToTimestamp(info.maxDDDate) as Time;
			const drawdownXCoord = drawdownChart.timeScale().timeToCoordinate(maxDDTs);
			const drawdownYCoord = drawdownSeries.priceToCoordinate(info.maxDD);

			if (equityYCoord === null || equityYCoord < 0 || equityYCoord > equityHeight) return;

			const profitPct = ((info.endEquity - info.startEquity) / info.startEquity) * 100;

			rawAnnotations.push({
				year,
				x: xCoord,
				equityY: equityYCoord,
				drawdownY: drawdownYCoord !== null && drawdownYCoord >= 0 ? drawdownYCoord : 50,
				drawdownX: drawdownXCoord ?? xCoord,
				profitPct,
				maxDD: info.maxDD,
				endEquity: info.endEquity,
			});
		});

		// Second pass: calculate smart box positions to avoid overlap
		const boxPositions = calculateBoxPositions(rawAnnotations, equityHeight);

		// Create final annotations with calculated box positions
		const newAnnotations: AnnotationPosition[] = rawAnnotations.map(ann => ({
			...ann,
			boxY: boxPositions.get(ann.year) ?? ann.equityY - 85,
		}));

		setAnnotations(newAnnotations);

		// Update entry annotation
		const entryXCoord = equityChart.timeScale().timeToCoordinate(entryTimestamp as Time);
		if (entryXCoord !== null && entryXCoord > 50 && entryXCoord < containerWidth - 50) {
			setEntryAnnotation({ x: entryXCoord, visible: true });
		} else {
			setEntryAnnotation({ x: 0, visible: false });
		}

		// Update year divider positions (at start of each year)
		const newDividers: { year: number; x: number }[] = [];
		for (const boundary of yearBoundaries) {
			const xCoord = equityChart.timeScale().timeToCoordinate(boundary.timestamp as Time);
			if (xCoord !== null && xCoord > 20 && xCoord < containerWidth - 20) {
				newDividers.push({ year: boundary.year, x: xCoord });
			}
		}
		setYearDividers(newDividers);

		// Calculate year label positions (centered in each segment)
		const allYears = [...new Set(data.map(d => new Date(d.date).getFullYear()))].sort();
		const newLabels: { year: number; x: number }[] = [];

		for (let i = 0; i < allYears.length; i++) {
			const year = allYears[i];
			// Find left and right boundaries for this year's segment
			let leftX = 50; // Default to near left edge
			let rightX = containerWidth - 50; // Default to near right edge

			// Left boundary: start of this year's divider (if exists)
			const thisYearDivider = newDividers.find(d => d.year === year);
			if (thisYearDivider) {
				leftX = thisYearDivider.x;
			} else if (i > 0) {
				// For first year (no divider), use chart start
				const firstDataTs = dateToTimestamp(data[0].date) as Time;
				const firstX = equityChart.timeScale().timeToCoordinate(firstDataTs);
				if (firstX !== null) leftX = firstX;
			}

			// Right boundary: next year's divider (or chart end)
			const nextYearDivider = newDividers.find(d => d.year === year + 1);
			if (nextYearDivider) {
				rightX = nextYearDivider.x;
			} else {
				// For last year, use last data point
				const lastDataTs = dateToTimestamp(data[data.length - 1].date) as Time;
				const lastX = equityChart.timeScale().timeToCoordinate(lastDataTs);
				if (lastX !== null) rightX = lastX;
			}

			// Center position
			const centerX = (leftX + rightX) / 2;
			if (centerX > 30 && centerX < containerWidth - 30) {
				newLabels.push({ year, x: centerX });
			}
		}
		setYearLabels(newLabels);
	}, [yearData, entryTimestamp, equityHeight, calculateBoxPositions, yearBoundaries, data]);

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

	// Initialize equity chart
	useEffect(() => {
		if (!equityContainerRef.current) return;

		const colors = getChartColors(isDark);
		const chart = createChart(equityContainerRef.current, {
			height: equityHeight,
			layout: {
				background: { type: ColorType.Solid, color: colors.background },
				textColor: colors.textColor,
				attributionLogo: false,
			},
			grid: {
				vertLines: { color: colors.gridColor },
				horzLines: { color: colors.gridColor },
			},
			rightPriceScale: {
				borderVisible: false,
			},
			leftPriceScale: {
				visible: true,
				borderVisible: false,
			},
			timeScale: {
				borderVisible: false,
				timeVisible: false,
				secondsVisible: false,
				fixLeftEdge: true,
				fixRightEdge: true,
				tickMarkFormatter: () => '', // Hide built-in labels, we use custom HTML labels
			},
			crosshair: {
				mode: CrosshairMode.Normal,
			},
		});

		equityChartRef.current = chart;

		const resizeObserver = new ResizeObserver(() => {
			if (equityContainerRef.current) {
				chart.applyOptions({ width: equityContainerRef.current.clientWidth });
				updateAnnotations();
			}
		});
		resizeObserver.observe(equityContainerRef.current);

		// Subscribe to visible range changes
		chart.timeScale().subscribeVisibleLogicalRangeChange(updateAnnotations);

		return () => {
			chart.timeScale().unsubscribeVisibleLogicalRangeChange(updateAnnotations);
			resizeObserver.disconnect();
			chart.remove();
			equityChartRef.current = null;
			equitySeriesRef.current = null;
			equityLiveSeriesRef.current = null;
		};
	}, [isDark, updateAnnotations]);

	// Update equity chart height
	useEffect(() => {
		if (equityChartRef.current) {
			equityChartRef.current.applyOptions({ height: equityHeight });
			setTimeout(updateAnnotations, 50);
		}
	}, [equityHeight, updateAnnotations]);

	// Update equity chart data
	useEffect(() => {
		if (!equityChartRef.current || !data.length) return;

		const chart = equityChartRef.current;
		const colors = getChartColors(isDark);

		// Remove existing series
		if (equitySeriesRef.current) {
			chart.removeSeries(equitySeriesRef.current);
			equitySeriesRef.current = null;
		}
		if (equityLiveSeriesRef.current) {
			chart.removeSeries(equityLiveSeriesRef.current);
			equityLiveSeriesRef.current = null;
		}

		// Single equity line (use lighter color, like the image)
		const allData = data.map((d) => ({
			time: dateToTimestamp(d.date) as Time,
			value: d.equity,
		}));

		const equitySeries = chart.addSeries(LineSeries, {
			color: colors.equityColor,
			lineWidth: 2,
			priceLineVisible: false,
			lastValueVisible: true,
			priceScaleId: "left",
		});
		equitySeries.setData(allData);
		equitySeriesRef.current = equitySeries;

		chart.timeScale().fitContent();
		setTimeout(updateAnnotations, 100);
	}, [data, isDark, updateAnnotations]);

	// Initialize drawdown chart
	useEffect(() => {
		if (!drawdownContainerRef.current) return;

		const colors = getChartColors(isDark);
		const chart = createChart(drawdownContainerRef.current, {
			height: drawdownHeight,
			layout: {
				background: { type: ColorType.Solid, color: colors.background },
				textColor: colors.textColor,
				attributionLogo: false,
			},
			grid: {
				vertLines: { color: colors.gridColor },
				horzLines: { color: colors.gridColor },
			},
			rightPriceScale: {
				borderVisible: false,
				invertScale: true, // Invert so 0% at top, larger DD at bottom
			},
			leftPriceScale: {
				visible: true,
				borderVisible: false,
				invertScale: true,
			},
			timeScale: {
				borderVisible: false,
				timeVisible: false,
				secondsVisible: false,
				fixLeftEdge: true,
				fixRightEdge: true,
				tickMarkFormatter: () => '', // Hide built-in labels, we use custom HTML labels
			},
			crosshair: {
				mode: CrosshairMode.Normal,
			},
		});

		drawdownChartRef.current = chart;

		const resizeObserver = new ResizeObserver(() => {
			if (drawdownContainerRef.current) {
				chart.applyOptions({ width: drawdownContainerRef.current.clientWidth });
				updateAnnotations();
			}
		});
		resizeObserver.observe(drawdownContainerRef.current);

		chart.timeScale().subscribeVisibleLogicalRangeChange(updateAnnotations);

		return () => {
			chart.timeScale().unsubscribeVisibleLogicalRangeChange(updateAnnotations);
			resizeObserver.disconnect();
			chart.remove();
			drawdownChartRef.current = null;
			drawdownSeriesRef.current = null;
		};
	}, [isDark, updateAnnotations]);

	// Update drawdown chart height
	useEffect(() => {
		if (drawdownChartRef.current) {
			drawdownChartRef.current.applyOptions({ height: drawdownHeight });
			setTimeout(updateAnnotations, 50);
		}
	}, [drawdownHeight, updateAnnotations]);

	// Update drawdown chart data
	useEffect(() => {
		if (!drawdownChartRef.current || !data.length) return;

		const chart = drawdownChartRef.current;
		const colors = getChartColors(isDark);

		// Remove existing series
		if (drawdownSeriesRef.current) {
			chart.removeSeries(drawdownSeriesRef.current);
			drawdownSeriesRef.current = null;
		}

		// Drawdown area (positive values, inverted scale shows them going down)
		const drawdownSeries = chart.addSeries(AreaSeries, {
			topColor: colors.drawdownColor,
			bottomColor: "transparent",
			lineColor: colors.drawdownLine,
			lineWidth: 1,
			priceLineVisible: false,
			lastValueVisible: true,
			priceScaleId: "left",
		});

		drawdownSeries.setData(
			data.map((d) => ({
				time: dateToTimestamp(d.date) as Time,
				value: d.drawdown_pct, // Positive values, inverted scale
			}))
		);
		drawdownSeriesRef.current = drawdownSeries;

		chart.timeScale().fitContent();
		setTimeout(updateAnnotations, 100);
	}, [data, isDark, updateAnnotations]);

	// Sync drawdown chart time scale with equity chart
	useEffect(() => {
		if (!equityChartRef.current || !drawdownChartRef.current) return;

		const equityTimeScale = equityChartRef.current.timeScale();
		const drawdownTimeScale = drawdownChartRef.current.timeScale();

		let syncing = false;

		const syncDrawdownToEquity = () => {
			if (syncing) return;
			syncing = true;
			const logicalRange = equityTimeScale.getVisibleLogicalRange();
			if (logicalRange) {
				drawdownTimeScale.setVisibleLogicalRange(logicalRange);
			}
			syncing = false;
		};

		const syncEquityToDrawdown = () => {
			if (syncing) return;
			syncing = true;
			const logicalRange = drawdownTimeScale.getVisibleLogicalRange();
			if (logicalRange) {
				equityTimeScale.setVisibleLogicalRange(logicalRange);
			}
			syncing = false;
		};

		equityTimeScale.subscribeVisibleLogicalRangeChange(syncDrawdownToEquity);
		drawdownTimeScale.subscribeVisibleLogicalRangeChange(syncEquityToDrawdown);

		return () => {
			equityTimeScale.unsubscribeVisibleLogicalRangeChange(syncDrawdownToEquity);
			drawdownTimeScale.unsubscribeVisibleLogicalRangeChange(syncEquityToDrawdown);
		};
	}, [data]);

	// Calculate summary metrics
	const summaryMetrics = useMemo(() => {
		if (!data.length) return null;

		const startEquity = data[0].equity;
		const endEquity = data[data.length - 1].equity;
		const totalReturn = ((endEquity - startEquity) / startEquity) * 100;
		const maxDrawdown = Math.max(...data.map((d) => d.drawdown_pct));

		return { startEquity, endEquity, totalReturn, maxDrawdown };
	}, [data]);

	return (
		<div className="space-y-2">
			{/* Header */}
			<div className="bg-amber-100 dark:bg-amber-900/30 px-4 py-2 rounded-lg">
				<h2 className="text-lg font-bold text-center">{systemName}</h2>
			</div>

			{/* Equity Chart with overlays */}
			<div className="relative">
				{/* Y-axis label */}
				<div className="absolute -left-1 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-medium text-muted-foreground whitespace-nowrap">
					Equity ($)
				</div>

				<div
					ref={equityContainerRef}
					className="w-full border bg-card"
					style={{ height: equityHeight }}
				/>

				{/* Year annotation boxes on equity chart */}
				{annotations.map((ann) => {
					const boxTop = ann.boxY;
					const boxBottom = boxTop + 58; // box height
					const arrowStart = boxBottom;
					const arrowEnd = ann.equityY;
					const arrowLength = arrowEnd - arrowStart;

					return (
						<div key={`equity-${ann.year}`} className="absolute pointer-events-none" style={{ left: 0, top: 0, right: 0, bottom: 0 }}>
							{/* Annotation box with hover fade-in */}
							<div
								className="absolute bg-white dark:bg-gray-800 border-2 border-gray-400 dark:border-gray-500 rounded px-2 py-1 shadow-md opacity-40 hover:opacity-100 transition-opacity duration-150 pointer-events-auto cursor-default"
								style={{
									left: ann.x - 55,
									top: boxTop,
									zIndex: 10,
								}}
							>
								<div className="font-bold text-center text-sm text-gray-900 dark:text-gray-100 mb-1">{ann.year}</div>
								<div className="flex gap-3">
									{/* Strategy returns */}
									<div className="text-center">
										<div className={`font-bold text-sm ${ann.profitPct >= 0 ? "text-green-600" : "text-red-600"}`}>
											{ann.profitPct >= 0 ? "+" : ""}{ann.profitPct.toFixed(1)}%
										</div>
										<div className="text-red-500 font-medium text-xs">-{ann.maxDD.toFixed(1)}%</div>
									</div>
									{/* SPY returns */}
									{SP500_RETURNS[ann.year] !== undefined && (
										<div className="text-center border-l border-gray-300 dark:border-gray-600 pl-3">
											<div className={`font-bold text-sm ${SP500_RETURNS[ann.year] >= 0 ? "text-blue-500" : "text-red-600"}`}>
												{SP500_RETURNS[ann.year] >= 0 ? "+" : ""}{SP500_RETURNS[ann.year].toFixed(1)}%
											</div>
											<div className="text-gray-500 dark:text-gray-400 text-xs">SPY</div>
										</div>
									)}
								</div>
							</div>

							{/* Arrow line from box to curve */}
							{arrowLength > 15 && (
								<>
									{/* Vertical line */}
									<div
										className="absolute w-0.5 bg-green-500"
										style={{
											left: ann.x,
											top: arrowStart,
											height: arrowLength - 8,
										}}
									/>
									{/* Arrow head pointing down to curve */}
									<svg
										className="absolute"
										width="12"
										height="10"
										style={{
											left: ann.x - 5,
											top: arrowEnd - 10,
										}}
									>
										<polygon points="6,10 0,0 12,0" fill="#22c55e" />
									</svg>
									{/* Profit label next to arrow */}
									<div
										className="absolute text-green-600 font-bold text-sm whitespace-nowrap"
										style={{
											left: ann.x + 8,
											top: (arrowStart + arrowEnd) / 2 - 8,
										}}
									>
										{ann.profitPct >= 0 ? "+" : ""}{ann.profitPct.toFixed(1)}%
									</div>
								</>
							)}
						</div>
					);
				})}

				{/* Entry line annotation */}
				{entryAnnotation?.visible && (
					<>
						<div
							className="absolute top-0 w-1 bg-green-500"
							style={{
								left: entryAnnotation.x,
								height: equityHeight,
							}}
						/>
						<div
							className="absolute bg-green-500 text-white font-bold text-xs px-2 py-0.5 rounded"
							style={{
								left: entryAnnotation.x + 6,
								top: 8,
							}}
						>
							Entry
						</div>
					</>
				)}

				{/* Year divider lines (at start of each year) */}
				{yearDividers.map((divider) => (
					<div
						key={`divider-equity-${divider.year}`}
						className="absolute top-0 pointer-events-none"
						style={{
							left: divider.x,
							height: equityHeight,
							width: 2,
							zIndex: 5,
							backgroundImage: 'repeating-linear-gradient(to bottom, #9ca3af 0px, #9ca3af 8px, transparent 8px, transparent 16px)',
						}}
					/>
				))}

				{/* Custom year labels centered in each segment */}
				{yearLabels.map((label) => (
					<div
						key={`year-label-equity-${label.year}`}
						className="absolute pointer-events-none text-sm font-semibold text-muted-foreground"
						style={{
							left: label.x,
							bottom: 4,
							transform: 'translateX(-50%)',
							zIndex: 5,
						}}
					>
						{label.year}
					</div>
				))}

				{/* Resize handle */}
				<div
					className="absolute -bottom-1 left-0 right-0 h-3 cursor-ns-resize hover:bg-primary/30 z-20 transition-colors"
					onMouseDown={(e) => handleResizeMouseDown(e, "equity")}
					onDoubleClick={() => handleResizeDoubleClick("equity")}
				/>
			</div>

			{/* Drawdown Chart with overlays */}
			<div className="relative">
				{/* Y-axis label */}
				<div className="absolute -left-1 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-medium text-muted-foreground whitespace-nowrap">
					Drawdown (%)
				</div>

				<div
					ref={drawdownContainerRef}
					className="w-full border bg-card"
					style={{ height: drawdownHeight }}
				/>

				{/* Max drawdown annotations with red arrows */}
				{annotations.map((ann) => {
					// Clamp Y position to visible area
					const yPos = Math.min(Math.max(ann.drawdownY, 10), drawdownHeight - 30);
					return (
						<div
							key={`dd-${ann.year}`}
							className="absolute pointer-events-none flex items-center"
							style={{
								left: ann.drawdownX + 5,
								top: yPos,
							}}
						>
							{/* Red arrow pointing left */}
							<svg width="10" height="12" viewBox="0 0 10 12" className="mr-1">
								<polygon points="0,6 10,0 10,12" fill="#ef4444" />
							</svg>
							<span className="text-red-500 font-bold text-sm whitespace-nowrap">
								-{ann.maxDD.toFixed(1)}%
							</span>
						</div>
					);
				})}

				{/* Entry line on drawdown chart */}
				{entryAnnotation?.visible && (
					<div
						className="absolute top-0 w-1 bg-green-500"
						style={{
							left: entryAnnotation.x,
							height: drawdownHeight,
						}}
					/>
				)}

				{/* Year divider lines on drawdown (at start of each year) */}
				{yearDividers.map((divider) => (
					<div
						key={`divider-dd-${divider.year}`}
						className="absolute top-0 pointer-events-none"
						style={{
							left: divider.x,
							height: drawdownHeight,
							width: 2,
							zIndex: 5,
							backgroundImage: 'repeating-linear-gradient(to bottom, #9ca3af 0px, #9ca3af 8px, transparent 8px, transparent 16px)',
						}}
					/>
				))}

				{/* Custom year labels centered in each segment */}
				{yearLabels.map((label) => (
					<div
						key={`year-label-dd-${label.year}`}
						className="absolute pointer-events-none text-sm font-semibold text-muted-foreground"
						style={{
							left: label.x,
							bottom: 4,
							transform: 'translateX(-50%)',
							zIndex: 5,
						}}
					>
						{label.year}
					</div>
				))}

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
						<div className="text-sm font-bold">${formatMoney(summaryMetrics.startEquity)}</div>
					</div>
					<div className="bg-card rounded-lg p-2 border">
						<div className="text-xs text-muted-foreground">Current</div>
						<div className="text-sm font-bold">${formatMoney(summaryMetrics.endEquity)}</div>
					</div>
					<div className="bg-card rounded-lg p-2 border">
						<div className="text-xs text-muted-foreground">Total Return</div>
						<div className={`text-sm font-bold ${summaryMetrics.totalReturn >= 0 ? "text-green-600" : "text-red-600"}`}>
							{summaryMetrics.totalReturn >= 0 ? "+" : ""}{summaryMetrics.totalReturn.toFixed(1)}%
						</div>
					</div>
					<div className="bg-card rounded-lg p-2 border">
						<div className="text-xs text-muted-foreground">Max Drawdown</div>
						<div className="text-sm font-bold text-red-600">-{summaryMetrics.maxDrawdown.toFixed(1)}%</div>
					</div>
				</div>
			)}
		</div>
	);
}
