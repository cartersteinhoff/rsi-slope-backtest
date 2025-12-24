import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useParametersStore } from "@/stores/parameters-store";
import { Plus, Minus } from "lucide-react";

export function ParameterControls() {
	const {
		slopeWindow,
		posThreshold,
		negThreshold,
		signalType,
		slopeParametersExpanded,
		setSlopeWindow,
		setPosThreshold,
		setNegThreshold,
		setSignalType,
		setSlopeParametersExpanded,
	} = useParametersStore();

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label className="text-base">Signal Type</Label>
				<div className="flex flex-col gap-1">
					{(["RSI", "Both"] as const).map((type) => (
						<label
							key={type}
							className="flex items-center gap-2 cursor-pointer"
						>
							<input
								type="radio"
								name="signal-type"
								value={type}
								checked={signalType === type}
								onChange={() => setSignalType(type)}
								className="w-3 h-3 accent-blue-500"
							/>
							<span className="text-base">
								{type === "Both" ? "RSI + Slope" : "RSI Only"}
							</span>
						</label>
					))}
				</div>
			</div>

			{signalType !== "RSI" && (
				<div className="space-y-2">
					<button
						onClick={() => setSlopeParametersExpanded(!slopeParametersExpanded)}
						className="flex items-center gap-1.5 text-base font-medium hover:text-foreground/80 transition-colors w-full"
					>
						{slopeParametersExpanded ? (
							<Minus className="h-3.5 w-3.5" />
						) : (
							<Plus className="h-3.5 w-3.5" />
						)}
						Slope Parameters
					</button>

					{slopeParametersExpanded && (
						<div className="space-y-3">
							<div className="space-y-1">
								<div className="flex justify-between">
									<Label htmlFor="slope-window" className="text-base">Look Back Period</Label>
									<span className="text-base text-muted-foreground">{slopeWindow}</span>
								</div>
								<Slider
									id="slope-window"
									min={5}
									max={30}
									step={1}
									value={[slopeWindow]}
									onValueChange={([value]) => setSlopeWindow(value)}
								/>
							</div>

							<div className="space-y-1">
								<div className="flex justify-between">
									<Label htmlFor="pos-threshold" className="text-base">Positive Angle</Label>
									<span className="text-base text-muted-foreground">
										{posThreshold.toFixed(1)}%
									</span>
								</div>
								<Slider
									id="pos-threshold"
									min={0}
									max={20}
									step={0.5}
									value={[posThreshold]}
									onValueChange={([value]) => setPosThreshold(value)}
								/>
							</div>

							<div className="space-y-1">
								<div className="flex justify-between">
									<Label htmlFor="neg-threshold" className="text-base">Negative Angle</Label>
									<span className="text-base text-muted-foreground">
										{negThreshold.toFixed(1)}%
									</span>
								</div>
								<Slider
									id="neg-threshold"
									min={-10}
									max={10}
									step={0.5}
									value={[negThreshold]}
									onValueChange={([value]) => setNegThreshold(value)}
								/>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
