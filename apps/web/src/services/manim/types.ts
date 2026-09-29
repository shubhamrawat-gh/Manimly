export type RenderQuality = "draft" | "final";

export type RenderStatus =
	| "idle"
	| "pending"
	| "rendering"
	| "completed"
	| "failed";

export interface SceneContext {
	projectId?: string;
	duration?: number;
	fps?: number;
	canvasSize?: { width: number; height: number };
	variables?: Record<string, unknown>;
}

export interface GeneratedSceneResponse {
	sceneId: string;
	prompt: string;
	generatedCode: string;
	codeHash: string;
	quality: RenderQuality;
	renderStatus: RenderStatus;
	videoAssetRef?: string;
	duration: number;
}

export interface RenderJobStatus {
	jobId: string;
	sceneId: string;
	status: RenderStatus;
	progress: number;
	videoAssetRef?: string;
	error?: string;
}

export interface ManimServiceClient {
	generateScene(
		prompt: string,
		context?: SceneContext,
	): Promise<GeneratedSceneResponse>;
	regenerateScene(
		sceneId: string,
		editInstruction: string,
	): Promise<GeneratedSceneResponse>;
	renderScene(
		sceneId: string,
		quality: RenderQuality,
	): Promise<{ jobId: string }>;
	getRenderStatus(jobId: string): Promise<RenderJobStatus>;
	checkHealth(): Promise<boolean>;
}
