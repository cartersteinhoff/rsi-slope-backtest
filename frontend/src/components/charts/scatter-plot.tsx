import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BranchOverview } from "@/types";

interface ScatterPlotProps {
	data: BranchOverview[];
	onSelectBranch?: (branch: string) => void;
}

export function ScatterPlot({ data, onSelectBranch }: ScatterPlotProps) {
	const { points, xRange, yRange } = useMemo(() => {
		if (!data.length) return { points: [], xRange: [0, 100], yRange: [-50, 100] };

		const winRates = data.map((d) => d.win_rate);
		const returns = data.map((d) => d.return_pct);

		const xMin = Math.min(...winRates);
		const xMax = Math.max(...winRates);
		const yMin = Math.min(...returns);
		const yMax = Math.max(...returns);

		// Add padding
		const xPad = (xMax - xMin) * 0.1 || 10;
		const yPad = (yMax - yMin) * 0.1 || 10;

		return {
			points: data.map((d) => ({
				x: d.win_rate,
				y: d.return_pct,
				label: d.ticker,
				branch: d.branch,
			})),
			xRange: [Math.max(0, xMin - xPad), Math.min(100, xMax + xPad)],
			yRange: [yMin - yPad, yMax + yPad],
		};
	}, [data]);

	const width = 400;
	const height = 280;
	const padding = { top: 16, right: 16, bottom: 36, left: 50 };
	const plotWidth = width - padding.left - padding.right;
	const plotHeight = height - padding.top - padding.bottom;

	const scaleX = (val: number) =>
		padding.left + ((val - xRange[0]) / (xRange[1] - xRange[0])) * plotWidth;
	const scaleY = (val: number) =>
		padding.top + plotHeight - ((val - yRange[0]) / (yRange[1] - yRange[0])) * plotHeight;

	// Generate axis ticks
	const xTicks = Array.from({ length: 5 }, (_, i) =>
		xRange[0] + (i / 4) * (xRange[1] - xRange[0])
	);
	const yTicks = Array.from({ length: 5 }, (_, i) =>
		yRange[0] + (i / 4) * (yRange[1] - yRange[0])
	);

	if (!data.length) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-muted-foreground">
					No data for scatter plot
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-medium">Win Rate vs Return</CardTitle>
			</CardHeader>
			<CardContent>
				<svg width="100%" viewBox={`0 0 ${width} ${height}`} className="max-w-full">
					{/* Grid lines */}
					{xTicks.map((tick) => (
						<line
							key={`x-${tick}`}
							x1={scaleX(tick)}
							y1={padding.top}
							x2={scaleX(tick)}
							y2={padding.top + plotHeight}
							stroke="rgba(128,128,128,0.2)"
							strokeDasharray="2,2"
						/>
					))}
					{yTicks.map((tick) => (
						<line
							key={`y-${tick}`}
							x1={padding.left}
							y1={scaleY(tick)}
							x2={padding.left + plotWidth}
							y2={scaleY(tick)}
							stroke="rgba(128,128,128,0.2)"
							strokeDasharray="2,2"
						/>
					))}

					{/* Zero line for y-axis */}
					{yRange[0] < 0 && yRange[1] > 0 && (
						<line
							x1={padding.left}
							y1={scaleY(0)}
							x2={padding.left + plotWidth}
							y2={scaleY(0)}
							stroke="rgba(128,128,128,0.5)"
							strokeWidth={1}
						/>
					)}

					{/* 50% line for win rate */}
					{xRange[0] < 50 && xRange[1] > 50 && (
						<line
							x1={scaleX(50)}
							y1={padding.top}
							x2={scaleX(50)}
							y2={padding.top + plotHeight}
							stroke="rgba(128,128,128,0.5)"
							strokeWidth={1}
						/>
					)}

					{/* X axis labels */}
					{xTicks.map((tick) => (
						<text
							key={`xl-${tick}`}
							x={scaleX(tick)}
							y={height - 8}
							textAnchor="middle"
							fontSize={10}
							fill="currentColor"
							className="text-muted-foreground"
						>
							{tick.toFixed(0)}%
						</text>
					))}

					{/* Y axis labels */}
					{yTicks.map((tick) => (
						<text
							key={`yl-${tick}`}
							x={padding.left - 8}
							y={scaleY(tick) + 3}
							textAnchor="end"
							fontSize={10}
							fill="currentColor"
							className="text-muted-foreground"
						>
							{tick.toFixed(0)}%
						</text>
					))}

					{/* Axis titles */}
					<text
						x={width / 2}
						y={height - 1}
						textAnchor="middle"
						fontSize={10}
						fill="currentColor"
						className="text-muted-foreground"
					>
						Win Rate
					</text>
					<text
						x={12}
						y={height / 2}
						textAnchor="middle"
						fontSize={10}
						fill="currentColor"
						className="text-muted-foreground"
						transform={`rotate(-90, 12, ${height / 2})`}
					>
						Total Return
					</text>

					{/* Data points */}
					{points.map((point, i) => (
						<circle
							key={i}
							cx={scaleX(point.x)}
							cy={scaleY(point.y)}
							r={5}
							fill={point.y >= 0 ? "#22c55e" : "#ef4444"}
							opacity={0.7}
							className="cursor-pointer hover:opacity-100 transition-opacity"
							onClick={() => onSelectBranch?.(point.branch)}
						>
							<title>
								{point.label}: {point.x.toFixed(1)}% win rate, {point.y.toFixed(1)}% return
							</title>
						</circle>
					))}
				</svg>
			</CardContent>
		</Card>
	);
}
