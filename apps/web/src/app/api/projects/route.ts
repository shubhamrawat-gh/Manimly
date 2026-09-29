import { type NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import type { SerializedProject } from "@/services/storage/types";

function getProjectsDir(): string {
	const cwd = process.cwd();
	// If run from monorepo root or apps/web, ensure consistent directory
	if (path.basename(cwd) === "web") {
		return path.resolve(cwd, "..", "..", "projects");
	}
	return path.resolve(cwd, "projects");
}

async function ensureDir(dir: string) {
	try {
		await fs.mkdir(dir, { recursive: true });
	} catch {
		// already exists
	}
}

export async function GET(request: NextRequest) {
	try {
		const projectsDir = getProjectsDir();
		await ensureDir(projectsDir);

		const { searchParams } = new URL(request.url);
		const full = searchParams.get("full") === "true";

		const files = await fs.readdir(projectsDir);
		const jsonFiles = files.filter((f) => f.endsWith(".json"));

		if (!full) {
			const ids = jsonFiles.map((f) => f.replace(/\.json$/, ""));
			return NextResponse.json({ ids });
		}

		const projects: SerializedProject[] = [];
		for (const file of jsonFiles) {
			try {
				const content = await fs.readFile(path.join(projectsDir, file), "utf-8");
				const parsed = JSON.parse(content);
				if (parsed && parsed.metadata && parsed.metadata.id) {
					projects.push(parsed);
				}
			} catch (err) {
				console.warn(`[api/projects] Failed to read ${file}:`, err);
			}
		}

		return NextResponse.json({ projects });
	} catch (error) {
		console.error("[api/projects] GET error:", error);
		return NextResponse.json(
			{ error: "Failed to list projects" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const projectsDir = getProjectsDir();
		await ensureDir(projectsDir);

		const body = await request.json();
		const project: SerializedProject = body.project;
		if (!project?.metadata?.id) {
			return NextResponse.json({ error: "Invalid project data" }, { status: 400 });
		}

		const filePath = path.join(projectsDir, `${project.metadata.id}.json`);
		await fs.writeFile(filePath, JSON.stringify(project, null, 2), "utf-8");

		return NextResponse.json({ success: true, id: project.metadata.id });
	} catch (error) {
		console.error("[api/projects] POST error:", error);
		return NextResponse.json(
			{ error: "Failed to save project" },
			{ status: 500 },
		);
	}
}
