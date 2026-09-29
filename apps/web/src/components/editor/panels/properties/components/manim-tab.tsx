"use client";

import { useState, useCallback, useTransition } from "react";
import type { ManimClip, ManimEditHistoryEntry } from "@/timeline";
import { useEditor } from "@/editor/use-editor";
import { useElementPreview } from "@/timeline/hooks/use-element-preview";
import { manimServiceClient } from "@/services/manim";
import {
	Section,
	SectionContent,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import {
	AiBrain05Icon,
	Copy01Icon,
	Tick02Icon,
	CodeSquareIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Sparkles,
	Terminal,
	History,
	RotateCcw,
	Check,
	RefreshCw,
	Wand2,
	Play,
	Clock,
	Layers,
} from "lucide-react";

interface ManimPropertiesTabProps {
	element: ManimClip;
	trackId: string;
}

const QUICK_ITERATIONS = [
	"Make colors more vibrant and modern",
	"Slow down the animation transition duration",
	"Add descriptive text labels with arrows",
	"Smooth the camera zoom and rotation",
];

export function ManimPropertiesTab({
	element: initialElement,
	trackId,
}: ManimPropertiesTabProps) {
	const editor = useEditor();
	const { renderElement } = useElementPreview({
		trackId,
		elementId: initialElement.id,
		fallback: initialElement,
	});

	const element = (renderElement as ManimClip) || initialElement;

	const [codeDraft, setCodeDraft] = useState(element.generatedCode);
	const [isCodeDirty, setIsCodeDirty] = useState(false);
	const [isEditingCode, setIsEditingCode] = useState(false);
	const [instruction, setInstruction] = useState("");
	const [isIterating, setIsIterating] = useState(false);
	const [isReRendering, setIsReRendering] = useState(false);
	const [isCopied, setIsCopied] = useState(false);

	// Sync draft when element changes externally
	if (!isCodeDirty && codeDraft !== element.generatedCode) {
		setCodeDraft(element.generatedCode);
	}

	const handleCopyCode = useCallback(() => {
		navigator.clipboard.writeText(element.generatedCode);
		setIsCopied(true);
		toast.success("Python code copied to clipboard");
		setTimeout(() => setIsCopied(false), 2000);
	}, [element.generatedCode]);

	const updateClip = useCallback(
		(patch: Partial<ManimClip>) => {
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						patch,
					},
				],
			});
		},
		[editor, trackId, element.id],
	);

	const handleToggleQuality = () => {
		const nextQuality = element.quality === "draft" ? "final" : "draft";
		updateClip({ quality: nextQuality });
		toast.info(`Render quality set to ${nextQuality === "draft" ? "Draft (Fast)" : "Final (1080p)"}`);
	};

	const handleApplyCodeEdit = async () => {
		setIsReRendering(true);
		try {
			const newHash = `hash-${Math.random().toString(36).substring(2, 9)}`;
			const newEntry: ManimEditHistoryEntry = {
				timestamp: new Date(),
				instruction: "Manual code edit",
				code: codeDraft,
				codeHash: newHash,
			};

			const nextHistory = [...(element.editHistory || []), newEntry];

			updateClip({
				generatedCode: codeDraft,
				codeHash: newHash,
				editHistory: nextHistory,
				renderStatus: "rendering",
			});

			// Trigger render via service
			const renderJob = await manimServiceClient.renderScene(
				element.id,
				element.quality || "draft",
			);
			const jobStatus = await manimServiceClient.getRenderStatus(renderJob.jobId);

			updateClip({
				renderStatus: jobStatus.status,
				videoAssetRef: jobStatus.videoAssetRef,
			});

			setIsCodeDirty(false);
			setIsEditingCode(false);
			toast.success("Scene code updated & re-rendered!");
		} catch (err) {
			console.error("Failed to re-render scene:", err);
			toast.error("Failed to re-render. Check daemon status.");
			updateClip({ renderStatus: "failed" });
		} finally {
			setIsReRendering(false);
		}
	};

	const handleAiIterate = async () => {
		if (!instruction.trim()) {
			toast.error("Enter an edit instruction first");
			return;
		}

		setIsIterating(true);
		try {
			const res = await manimServiceClient.regenerateScene(
				element.id,
				instruction.trim(),
			);

			const newEntry: ManimEditHistoryEntry = {
				timestamp: new Date(),
				instruction: instruction.trim(),
				code: res.generatedCode,
				codeHash: res.codeHash,
			};

			const nextHistory = [...(element.editHistory || []), newEntry];

			updateClip({
				generatedCode: res.generatedCode,
				codeHash: res.codeHash,
				editHistory: nextHistory,
				renderStatus: "completed",
				videoAssetRef: res.videoAssetRef,
			});

			setCodeDraft(res.generatedCode);
			setIsCodeDirty(false);
			setInstruction("");
			toast.success("AI animation updated!");
		} catch (err) {
			console.error("Failed to iterate scene:", err);
			toast.error("Failed to iterate animation with AI.");
		} finally {
			setIsIterating(false);
		}
	};

	const handleRollback = (entry: ManimEditHistoryEntry) => {
		updateClip({
			generatedCode: entry.code,
			codeHash: entry.codeHash,
		});
		setCodeDraft(entry.code);
		setIsCodeDirty(false);
		toast.success(`Reverted to revision (${entry.codeHash})`);
	};

	const getStatusBadge = (status: ManimClip["renderStatus"]) => {
		switch (status) {
			case "completed":
				return (
					<Badge
						variant="outline"
						className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] px-1.5 py-0 h-4.5 gap-1 font-mono"
					>
						<span className="size-1.5 rounded-full bg-emerald-500" />
						Rendered
					</Badge>
				);
			case "rendering":
				return (
					<Badge
						variant="outline"
						className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0 h-4.5 gap-1 font-mono"
					>
						<span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
						Rendering...
					</Badge>
				);
			case "pending":
			case "idle":
				return (
					<Badge
						variant="outline"
						className="border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] px-1.5 py-0 h-4.5 gap-1 font-mono"
					>
						<span className="size-1.5 rounded-full bg-sky-500" />
						Queued
					</Badge>
				);
			case "failed":
				return (
					<Badge
						variant="destructive"
						className="text-[10px] px-1.5 py-0 h-4.5 gap-1 font-mono"
					>
						<span className="size-1.5 rounded-full bg-white animate-ping" />
						Failed
					</Badge>
				);
			default:
				return null;
		}
	};

	return (
		<div className="flex flex-col pb-8">
			{/* Overview Section */}
			<Section collapsible sectionKey={`${element.id}:manim-overview`} defaultOpen={true}>
				<SectionHeader>
					<SectionTitle>Animation Overview</SectionTitle>
					<div className="ml-auto flex items-center gap-1.5">
						{getStatusBadge(element.renderStatus)}
					</div>
				</SectionHeader>
				<SectionContent>
					<div className="flex flex-col gap-2.5 p-2">
						{/* Prompt Box */}
						<div className="flex flex-col gap-1 rounded-sm border bg-muted/30 p-2 text-xs">
							<span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1">
								<Sparkles className="size-2.5 text-primary" />
								Scene Prompt
							</span>
							<p className="text-foreground text-xs leading-relaxed font-sans">
								{element.prompt || "Mathematical Manim Scene"}
							</p>
						</div>

						{/* Quick Specs */}
						<div className="grid grid-cols-2 gap-2 text-xs">
							<div className="flex items-center justify-between rounded-sm border bg-background px-2 py-1.5">
								<span className="text-muted-foreground text-[11px]">Quality</span>
								<button
									type="button"
									onClick={handleToggleQuality}
									className="cursor-pointer text-[11px] font-medium text-foreground hover:text-primary transition-colors uppercase font-mono"
								>
									{element.quality || "draft"}
								</button>
							</div>

							<div className="flex items-center justify-between rounded-sm border bg-background px-2 py-1.5">
								<span className="text-muted-foreground text-[11px]">Code Hash</span>
								<span className="font-mono text-[11px] text-muted-foreground truncate max-w-[80px]">
									{element.codeHash || "none"}
								</span>
							</div>
						</div>
					</div>
				</SectionContent>
			</Section>

			{/* Python Code Section */}
			<Section collapsible sectionKey={`${element.id}:manim-code`} defaultOpen={true}>
				<SectionHeader>
					<div className="flex items-center gap-1.5">
						<Terminal className="size-3.5 text-primary" />
						<SectionTitle>Python Manim Code</SectionTitle>
					</div>
					<div className="ml-auto flex items-center gap-1">
						<button
							type="button"
							onClick={() => setIsEditingCode(!isEditingCode)}
							className="text-[11px] text-muted-foreground hover:text-foreground font-mono px-1.5 py-0.5 rounded-xs"
						>
							{isEditingCode ? "Close Editor" : "Edit Code"}
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
				</SectionHeader>
				<SectionContent>
					<div className="flex flex-col gap-2 p-2">
						{isEditingCode ? (
							<div className="flex flex-col gap-2">
								<Textarea
									value={codeDraft}
									onChange={(e) => {
										setCodeDraft(e.target.value);
										setIsCodeDirty(true);
									}}
									rows={12}
									className="font-mono text-[11px] leading-relaxed bg-zinc-950 text-zinc-100 p-2.5 rounded-sm border border-zinc-800 resize-y focus-visible:ring-primary/40"
									spellCheck={false}
								/>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										className="flex-1 text-xs h-7"
										onClick={() => {
											setCodeDraft(element.generatedCode);
											setIsCodeDirty(false);
											setIsEditingCode(false);
										}}
									>
										Cancel
									</Button>
									<Button
										variant="default"
										size="sm"
										className="flex-1 text-xs h-7 gap-1"
										onClick={handleApplyCodeEdit}
										disabled={isReRendering}
									>
										{isReRendering ? (
											<>
												<Spinner className="size-3" />
												Re-rendering...
											</>
										) : (
											<>
												<RefreshCw className="size-3" />
												Apply & Re-render
											</>
										)}
									</Button>
								</div>
							</div>
						) : (
							<div className="relative rounded-sm border border-zinc-800 bg-zinc-950 p-2.5 overflow-hidden">
								<div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-800/80 text-[10px] text-zinc-400 font-mono">
									<span>scene.py</span>
									<span className="text-zinc-500">{element.codeHash}</span>
								</div>
								<pre className="font-mono text-[11px] text-zinc-200 leading-relaxed overflow-x-auto max-h-[220px] scrollbar-thin">
									<code>{element.generatedCode}</code>
								</pre>
							</div>
						)}
					</div>
				</SectionContent>
			</Section>

			{/* AI Iterative Refinement Section */}
			<Section collapsible sectionKey={`${element.id}:manim-agent`} defaultOpen={true}>
				<SectionHeader>
					<div className="flex items-center gap-1.5">
						<Wand2 className="size-3.5 text-primary" />
						<SectionTitle>Iterative AI Refinement</SectionTitle>
					</div>
				</SectionHeader>
				<SectionContent>
					<div className="flex flex-col gap-2 p-2">
						<p className="text-[11px] text-muted-foreground leading-relaxed">
							Instruct the AI agent to adjust or expand this scene without rewriting code manually.
						</p>

						<Textarea
							placeholder="e.g. Change square color to yellow, slow down rotation, add formula label..."
							value={instruction}
							onChange={(e) => setInstruction(e.target.value)}
							rows={2}
							className="text-xs resize-none placeholder:text-muted-foreground/60 leading-relaxed"
						/>

						{/* Quick Iteration Suggestions */}
						<div className="flex flex-wrap gap-1">
							{QUICK_ITERATIONS.map((suggestion) => (
								<button
									key={suggestion}
									type="button"
									onClick={() => setInstruction(suggestion)}
									className="text-[10px] bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xs px-1.5 py-0.5 transition-colors text-left"
								>
									+ {suggestion}
								</button>
							))}
						</div>

						<Button
							variant="default"
							size="sm"
							className="text-xs h-8 gap-1.5 mt-1"
							onClick={handleAiIterate}
							disabled={isIterating || !instruction.trim()}
						>
							{isIterating ? (
								<>
									<Spinner className="size-3" />
									Regenerating Scene...
								</>
							) : (
								<>
									<Sparkles className="size-3 text-primary-foreground" />
									Apply AI Adjustment
								</>
							)}
						</Button>
					</div>
				</SectionContent>
			</Section>

			{/* Edit History Section */}
			{element.editHistory && element.editHistory.length > 0 && (
				<Section collapsible sectionKey={`${element.id}:manim-history`} defaultOpen={false}>
					<SectionHeader>
						<div className="flex items-center gap-1.5">
							<History className="size-3.5 text-muted-foreground" />
							<SectionTitle>Edit History ({element.editHistory.length})</SectionTitle>
						</div>
					</SectionHeader>
					<SectionContent>
						<div className="flex flex-col gap-1.5 p-2">
							{element.editHistory.map((entry, idx) => (
								<div
									key={idx}
									className="flex items-center justify-between p-1.5 rounded-sm border bg-card text-xs"
								>
									<div className="flex flex-col gap-0.5 overflow-hidden pr-2">
										<span className="font-medium text-[11px] text-foreground truncate">
											{entry.instruction || entry.prompt || `Revision #${idx + 1}`}
										</span>
										<span className="text-[10px] text-muted-foreground font-mono">
											{entry.codeHash}
										</span>
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
										onClick={() => handleRollback(entry)}
										title="Revert to this revision"
									>
										<RotateCcw className="size-3" />
									</Button>
								</div>
							))}
						</div>
					</SectionContent>
				</Section>
			)}
		</div>
	);
}
