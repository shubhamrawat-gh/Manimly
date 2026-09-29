"use client";

import { useState, useEffect, useCallback } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditor } from "@/editor/use-editor";
import { buildManimClip } from "@/timeline/element-utils";
import { manimServiceClient } from "@/services/manim";
import { toElementDurationTicks } from "@/timeline/creation";
import { toast } from "sonner";
import {
	AiBrain05Icon,
	Copy01Icon,
	Tick02Icon,
	PlusSignIcon,
	CodeSquareIcon,
	PlayCircle02Icon,
	Settings01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sparkles, Terminal, Check, RefreshCw } from "lucide-react";

interface PromptPreset {
	title: string;
	badge: string;
	prompt: string;
}

const PRESET_TEMPLATES: PromptPreset[] = [
	{
		title: "Fourier Series",
		badge: "Wave Decomposition",
		prompt:
			"Animate a square wave being approximated by rotating epicycles (Fourier series circles) and plotting the harmonics in real-time.",
	},
	{
		title: "Pythagorean Theorem",
		badge: "Geometry",
		prompt:
			"Visual geometric proof of the Pythagorean Theorem showing right triangle a² + b² = c² with transforming colored squares.",
	},
	{
		title: "Neural Network Flow",
		badge: "Deep Learning",
		prompt:
			"Animate a 3-layer neural network with pulses of activation values propagating through weighted connections from input to output.",
	},
	{
		title: "Matrix Transformation",
		badge: "Linear Algebra",
		prompt:
			"Display a 2D Cartesian grid with unit basis vectors î and ĵ, transforming dynamically under a 2x2 shear and rotation matrix.",
	},
	{
		title: "Riemann Integral",
		badge: "Calculus",
		prompt:
			"Show a continuous curve f(x) with Riemann sum rectangles progressively subdividing to demonstrate convergence to the integral area.",
	},
	{
		title: "Unit Circle & Sine",
		badge: "Trigonometry",
		prompt:
			"Animate a point rotating on a unit circle with dotted projection lines continuously drawing the sine wave along the horizontal axis.",
	},
];

const DEFAULT_SAMPLE_CODE = `from manim import *

class GeneratedScene(Scene):
    def construct(self):
        # Mathematical animation
        title = Text("Manim AI Studio", font_size=42, color=BLUE)
        circle = Circle(radius=1.5, color=YELLOW)
        square = Square(side_length=2.5, color=TEAL)

        self.play(Write(title))
        self.play(title.animate.to_edge(UP))
        self.play(Create(circle))
        self.play(Transform(circle, square))
        self.wait(1)
`;

export function ManimAiView() {
	const editor = useEditor();
	const [prompt, setPrompt] = useState("");
	const [quality, setQuality] = useState<"draft" | "final">("draft");
	const [durationSec, setDurationSec] = useState<number>(5);
	const [isGenerating, setIsGenerating] = useState(false);
	const [generatedCode, setGeneratedCode] = useState<string>(DEFAULT_SAMPLE_CODE);
	const [codeHash, setCodeHash] = useState<string>("init-manim-sample");
	const [activeTab, setActiveTab] = useState<"code" | "presets">("presets");
	const [isCopied, setIsCopied] = useState(false);
	const [isServiceConnected, setIsServiceConnected] = useState<boolean | null>(null);
	const [isDirectEditing, setIsDirectEditing] = useState(false);

	// Check local daemon health on mount
	useEffect(() => {
		let isMounted = true;
		const check = async () => {
			const ok = await manimServiceClient.checkHealth();
			if (isMounted) setIsServiceConnected(ok);
		};
		check();
		const interval = setInterval(check, 10000);
		return () => {
			isMounted = false;
			clearInterval(interval);
		};
	}, []);

	const handleCopyCode = useCallback(() => {
		navigator.clipboard.writeText(generatedCode);
		setIsCopied(true);
		toast.success("Python code copied to clipboard");
		setTimeout(() => setIsCopied(false), 2000);
	}, [generatedCode]);

	const handleSelectPreset = (presetPrompt: string) => {
		setPrompt(presetPrompt);
	};

	const handleGenerate = async () => {
		if (!prompt.trim()) {
			toast.error("Please enter an animation prompt first");
			return;
		}

		setIsGenerating(true);
		try {
			const res = await manimServiceClient.generateScene(prompt, {
				duration: durationSec,
			});
			setGeneratedCode(res.generatedCode);
			setCodeHash(res.codeHash);
			setActiveTab("code");
			toast.success("Manim scene generated successfully!");
		} catch (err) {
			console.error("Failed to generate scene:", err);
			toast.error("Failed to generate scene. Check daemon connection.");
		} finally {
			setIsGenerating(false);
		}
	};

	const handleAddToTimeline = () => {
		const currentTime = editor.playback.getCurrentTime();
		const durationTicks = toElementDurationTicks({ seconds: durationSec });

		const manimElement = buildManimClip({
			prompt: prompt || "Manim AI Animation",
			generatedCode,
			codeHash,
			quality,
			renderStatus: "completed",
			startTime: currentTime,
			duration: durationTicks,
			videoAssetRef:
				"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'><rect width='100%' height='100%' fill='%231e293b'/><circle cx='960' cy='540' r='180' fill='%2338bdf8' opacity='0.8'/><text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' font-size='56' fill='white' font-family='monospace' font-weight='bold'>Manim Scene</text></svg>",
		});

		editor.timeline.insertElement({
			element: manimElement,
			placement: { mode: "auto", trackType: "video" },
		});

		toast.success("Manim clip inserted into timeline!");
	};

	const handleGenerateAndInsert = async () => {
		if (!prompt.trim()) {
			toast.error("Please enter a prompt to generate");
			return;
		}

		setIsGenerating(true);
		try {
			const res = await manimServiceClient.generateScene(prompt, {
				duration: durationSec,
			});
			setGeneratedCode(res.generatedCode);
			setCodeHash(res.codeHash);

			const currentTime = editor.playback.getCurrentTime();
			const durationTicks = toElementDurationTicks({ seconds: durationSec });

			const manimElement = buildManimClip({
				prompt,
				generatedCode: res.generatedCode,
				codeHash: res.codeHash,
				quality,
				renderStatus: res.renderStatus,
				startTime: currentTime,
				duration: durationTicks,
				videoAssetRef: res.videoAssetRef,
			});

			editor.timeline.insertElement({
				element: manimElement,
				placement: { mode: "auto", trackType: "video" },
			});

			toast.success("Scene generated & added to timeline!");
		} catch (err) {
			console.error("Failed to generate and insert:", err);
			toast.error("Failed to generate scene.");
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<PanelView
			title="Manim AI"
			actions={
				<div className="flex items-center gap-1.5">
					<span
						className={`size-2 rounded-full ${
							isServiceConnected === true
								? "bg-emerald-500"
								: isServiceConnected === false
									? "bg-amber-500"
									: "bg-muted-foreground"
						}`}
						title={
							isServiceConnected === true
								? "Manim daemon connected"
								: "Manim daemon mock mode"
						}
					/>
					<span className="text-[11px] text-muted-foreground font-mono">
						{isServiceConnected === true ? "daemon active" : "local mock"}
					</span>
				</div>
			}
		>
			<div className="flex flex-col gap-3 pb-6">
				{/* AI Header Card */}
				<div className="relative overflow-hidden rounded-md border border-primary/20 bg-primary/5 p-3">
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-2">
							<div className="flex size-7 items-center justify-center rounded-sm bg-primary/10 text-primary">
								<HugeiconsIcon icon={AiBrain05Icon} className="size-4" />
							</div>
							<div>
								<div className="flex items-center gap-1.5">
									<h3 className="text-xs font-semibold text-foreground">
										Mathematical Animation AI
									</h3>
									<Badge
										variant="outline"
										className="text-[9px] px-1 py-0 h-4 border-primary/30 text-primary"
									>
										Python Manim
									</Badge>
								</div>
								<p className="text-[11px] text-muted-foreground mt-0.5">
									Turn natural language mathematical formulas into smooth 60fps animations.
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Prompt Input Section */}
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center justify-between">
						<label className="text-xs font-medium text-foreground flex items-center gap-1">
							<Sparkles className="size-3 text-primary" />
							Animation Prompt
						</label>
						{prompt && (
							<button
								type="button"
								onClick={() => setPrompt("")}
								className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
							>
								Clear
							</button>
						)}
					</div>
					<Textarea
						placeholder="Describe the mathematical concept or animation... e.g. Animate the unit circle tracing a sine wave with moving tangent vectors"
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						rows={3}
						className="resize-none text-xs leading-relaxed font-sans placeholder:text-muted-foreground/60 focus-visible:ring-primary/40"
					/>
				</div>

				{/* Configuration Row */}
				<div className="grid grid-cols-2 gap-2 text-xs">
					<div className="flex flex-col gap-1">
						<span className="text-[11px] text-muted-foreground font-medium">Render Quality</span>
						<div className="flex rounded-md border p-0.5 bg-muted/40">
							<button
								type="button"
								onClick={() => setQuality("draft")}
								className={`flex-1 rounded-xs py-1 text-center text-[11px] font-medium transition-all ${
									quality === "draft"
										? "bg-background text-foreground shadow-xs"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								Draft (Fast)
							</button>
							<button
								type="button"
								onClick={() => setQuality("final")}
								className={`flex-1 rounded-xs py-1 text-center text-[11px] font-medium transition-all ${
									quality === "final"
										? "bg-background text-foreground shadow-xs"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								Final (HD)
							</button>
						</div>
					</div>

					<div className="flex flex-col gap-1">
						<span className="text-[11px] text-muted-foreground font-medium">Duration (sec)</span>
						<div className="flex items-center rounded-md border px-2 py-1 bg-background text-xs">
							<input
								type="number"
								min={1}
								max={60}
								value={durationSec}
								onChange={(e) => setDurationSec(Number(e.target.value) || 5)}
								className="w-full bg-transparent text-xs font-mono outline-hidden"
							/>
							<span className="text-[11px] text-muted-foreground shrink-0 font-mono">s</span>
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						className="flex-1 text-xs gap-1.5 h-8 font-medium"
						onClick={handleGenerate}
						disabled={isGenerating || !prompt.trim()}
					>
						{isGenerating ? (
							<>
								<Spinner className="size-3" />
								Generating...
							</>
						) : (
							<>
								<Sparkles className="size-3.5 text-primary" />
								Generate Code
							</>
						)}
					</Button>
					<Button
						variant="default"
						size="sm"
						className="flex-1 text-xs gap-1.5 h-8 font-medium shadow-xs"
						onClick={handleGenerateAndInsert}
						disabled={isGenerating || !prompt.trim()}
					>
						<HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
						Insert at Playhead
					</Button>
				</div>

				{/* Tabs: Code View & Presets */}
				<div className="mt-1 flex flex-col gap-2">
					<div className="flex items-center justify-between border-b pb-1.5">
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={() => setActiveTab("presets")}
								className={`text-xs font-medium px-2 py-0.5 rounded-xs transition-colors ${
									activeTab === "presets"
										? "bg-secondary text-secondary-foreground"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								Presets & Templates
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("code")}
								className={`text-xs font-medium px-2 py-0.5 rounded-xs transition-colors flex items-center gap-1 ${
									activeTab === "code"
										? "bg-secondary text-secondary-foreground"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								<Terminal className="size-3" />
								Python Code
							</button>
						</div>
						{activeTab === "code" && (
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => setIsDirectEditing(!isDirectEditing)}
									className="text-[10px] text-muted-foreground hover:text-foreground font-mono"
								>
									{isDirectEditing ? "Preview" : "Edit"}
								</button>
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6 text-muted-foreground hover:text-foreground"
									onClick={handleCopyCode}
									title="Copy Python Code"
								>
									{isCopied ? (
										<Check className="size-3 text-emerald-500" />
									) : (
										<HugeiconsIcon icon={Copy01Icon} className="size-3" />
									)}
								</Button>
							</div>
						)}
					</div>

					{activeTab === "presets" ? (
						<div className="grid grid-cols-1 gap-1.5">
							{PRESET_TEMPLATES.map((preset) => (
								<button
									key={preset.title}
									type="button"
									onClick={() => handleSelectPreset(preset.prompt)}
									className="flex flex-col items-start gap-1 p-2 rounded-sm border bg-card hover:bg-accent/40 text-left transition-colors cursor-pointer group"
								>
									<div className="flex items-center justify-between w-full">
										<span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
											{preset.title}
										</span>
										<Badge
											variant="secondary"
											className="text-[9px] px-1 py-0 h-3.5 text-muted-foreground font-normal"
										>
											{preset.badge}
										</Badge>
									</div>
									<p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
										{preset.prompt}
									</p>
								</button>
							))}
						</div>
					) : (
						<div className="flex flex-col gap-2">
							{isDirectEditing ? (
								<Textarea
									value={generatedCode}
									onChange={(e) => setGeneratedCode(e.target.value)}
									rows={12}
									className="font-mono text-[11px] leading-relaxed resize-y bg-zinc-950 text-zinc-100 p-2.5 rounded-sm border border-zinc-800 focus-visible:ring-primary/40"
									spellCheck={false}
								/>
							) : (
								<div className="relative rounded-sm border border-zinc-800 bg-zinc-950 p-2.5 overflow-hidden">
									<div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-800/80 text-[10px] text-zinc-400 font-mono">
										<span>scene.py</span>
										<span className="text-zinc-500">{codeHash}</span>
									</div>
									<pre className="font-mono text-[11px] text-zinc-200 leading-relaxed overflow-x-auto max-h-[260px] scrollbar-thin">
										<code>{generatedCode}</code>
									</pre>
								</div>
							)}

							<Button
								variant="default"
								size="sm"
								className="w-full text-xs gap-1.5 h-8 font-medium mt-1"
								onClick={handleAddToTimeline}
							>
								<HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
								Add Scene to Timeline
							</Button>
						</div>
					)}
				</div>
			</div>
		</PanelView>
	);
}
