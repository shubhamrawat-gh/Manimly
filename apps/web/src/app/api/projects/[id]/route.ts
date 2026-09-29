import { type NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import type { SerializedProject } from "@/services/storage/types";

function getProjectsDir(): string {
	const cwd = process.cwd();
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

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const projectsDir = getProjectsDir();
		const filePath = path.join(projectsDir, `${id}.json`);

		try {
			const content = await fs.readFile(filePath, "utf-8");
			const project: SerializedProject = JSON.parse(content);
			return NextResponse.json({ project });
		} catch (err: unknown) {
			if (
				typeof err === "object" &&
				err !== null &&
				"code" in err &&
				(err as { code: string }).code === "ENOENT"
			) {
				return NextResponse.json({ error: "Project not found" }, { status: 404 });
			}
			throw err;
		}
	} catch (error) {
		console.error("[api/projects/[id]] GET error:", error);
		return NextResponse.json(
			{ error: "Failed to read project" },
			{ status: 500 },
		);
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const projectsDir = getProjectsDir();
		await ensureDir(projectsDir);

		const body = await request.json();
		const project: SerializedProject = body.project;
		if (!project?.metadata?.id) {
			return NextResponse.json({ error: "Invalid project data" }, { status: 400 });
		}

		const filePath = path.join(projectsDir, `${id}.json`);
		await fs.writeFile(filePath, JSON.stringify(project, null, 2), "utf-8");

		return NextResponse.json({ success: true, id });
	} catch (error) {
		console.error("[api/projects/[id]] PUT error:", error);
		return NextResponse.json(
			{ error: "Failed to save project" },
			{ status: 500 },
		);
	}
}

export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const projectsDir = getProjectsDir();
		const filePath = path.join(projectsDir, `${id}.json`);

		try {
			await fs.unlink(filePath);
		} catch (err: unknown) {
			if (
				typeof err === "object" &&
				err !== null &&
				"code" in err &&
				(err as { code: string }).code === "ENOENT"
			) {
				return NextResponse.json({ success: true, message: "File already deleted" });
			}
			throw err;
		}

		return NextResponse.json({ success: true, id });
	} catch (error) {
		console.error("[api/projects/[id]] DELETE error:", error);
		return NextResponse.json(
			{ error: "Failed to delete project" },
			{ status: 500 },
		);
	}
}
