import { webEnv } from "@/env/web";
import type {
	GeneratedSceneResponse,
	ManimServiceClient,
	RenderJobStatus,
	RenderQuality,
	SceneContext,
} from "./types";

export class HttpManimServiceClient implements ManimServiceClient {
	private baseUrl: string;

	constructor(baseUrl?: string) {
		this.baseUrl =
			baseUrl ||
			webEnv.NEXT_PUBLIC_MANIM_SERVICE_URL ||
			"http://127.0.0.1:8787";
	}

	getBaseUrl(): string {
		return this.baseUrl;
	}

	setBaseUrl(url: string): void {
		this.baseUrl = url;
	}

	async checkHealth(): Promise<boolean> {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 2000);
			const res = await fetch(`${this.baseUrl}/health`, {
				method: "GET",
				signal: controller.signal,
			});
			clearTimeout(timeoutId);
			return res.ok;
		} catch {
			return false;
		}
	}

	async generateScene(
		prompt: string,
		context?: SceneContext,
	): Promise<GeneratedSceneResponse> {
		// Mock response: placeholder solid-color clip & Manim code
		const sceneId = `mock-scene-${Date.now()}`;
		const mockCode = `from manim import *

class GeneratedScene(Scene):
    def construct(self):
        # Prompt: ${prompt.replace(/"/g, '\\"')}
        square = Square(color=BLUE, fill_opacity=1.0)
        self.play(FadeIn(square))
        self.wait(1)
        self.play(Transform(square, Circle(color=RED, fill_opacity=1.0)))
        self.wait(1)
`;
		return {
			sceneId,
			prompt,
			generatedCode: mockCode,
			codeHash: `hash-${Math.random().toString(36).substring(2, 9)}`,
			quality: "draft",
			renderStatus: "completed",
			// Solid-color clip SVG placeholder data URI
			videoAssetRef:
				"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'><rect width='100%' height='100%' fill='%232563eb'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='48' fill='white' font-family='sans-serif'>Manim Scene Placeholder</text></svg>",
			duration: context?.duration ?? 5,
		};
	}

	async regenerateScene(
		sceneId: string,
		editInstruction: string,
	): Promise<GeneratedSceneResponse> {
		const mockCode = `from manim import *

class GeneratedScene(Scene):
    def construct(self):
        # Edit: ${editInstruction.replace(/"/g, '\\"')}
        circle = Circle(color=GREEN, fill_opacity=1.0)
        self.play(Create(circle))
        self.wait(2)
`;
		return {
			sceneId,
			prompt: editInstruction,
			generatedCode: mockCode,
			codeHash: `hash-${Math.random().toString(36).substring(2, 9)}`,
			quality: "draft",
			renderStatus: "completed",
			videoAssetRef:
				"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'><rect width='100%' height='100%' fill='%23059669'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='48' fill='white' font-family='sans-serif'>Regenerated Manim Scene</text></svg>",
			duration: 5,
		};
	}

	async renderScene(
		sceneId: string,
		quality: RenderQuality,
	): Promise<{ jobId: string }> {
		return { jobId: `mock-job-${sceneId}-${quality}-${Date.now()}` };
	}

	async getRenderStatus(jobId: string): Promise<RenderJobStatus> {
		return {
			jobId,
			sceneId: "mock-scene",
			status: "completed",
			progress: 100,
			videoAssetRef:
				"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'><rect width='100%' height='100%' fill='%234f46e5'/></svg>",
		};
	}
}

export const manimServiceClient = new HttpManimServiceClient();
