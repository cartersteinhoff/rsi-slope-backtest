import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useParametersStore } from "@/stores/parameters-store";

export function ParameterControls() {
	const {
		slopeWindow,
		posThreshold,
		negThreshold,
		signalType,
		setSlopeWindow,
		setPosThreshold,
		setNegThreshold,
		setSignalType,
	} = useParametersStore();

	return (
		<div className="space-y-4">
			<div className="space-y-1">
				<div className="flex justify-between">
					<Label htmlFor="slope-window" className="text-sm">Slope Window</Label>
					<span className="text-sm text-muted-foreground">{slopeWindow}</span>
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
					<Label htmlFor="pos-threshold" className="text-sm">Positive Threshold</Label>
					<span className="text-sm text-muted-foreground">
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
					<Label htmlFor="neg-threshold" className="text-sm">Negative Threshold</Label>
					<span className="text-sm text-muted-foreground">
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

			<div className="space-y-2">
				<Label className="text-sm">Signal Type</Label>
				<div className="flex flex-col gap-1">
					{(["Both", "RSI", "Slope"] as const).map((type) => (
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
							<span className="text-sm">
								{type === "Both" ? "Both (RSI + Slope)" : `${type} Only`}
							</span>
						</label>
					))}
				</div>
			</div>
		</div>
	);
}
