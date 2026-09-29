import type { SerializedProject, StorageAdapter } from "./types";
import { IndexedDBAdapter } from "./indexeddb-adapter";

export interface ProjectStore extends StorageAdapter<SerializedProject> {
	getAll(): Promise<SerializedProject[]>;
	save?(project: SerializedProject): Promise<void>;
	load?(id: string): Promise<SerializedProject | null>;
	delete?(id: string): Promise<void>;
}

export class IndexedDBProjectStore implements ProjectStore {
	private adapter: IndexedDBAdapter<SerializedProject>;

	constructor(
		dbName = "video-editor-projects",
		storeName = "projects",
		version = 1,
	) {
		this.adapter = new IndexedDBAdapter<SerializedProject>({
			dbName,
			storeName,
			version,
		});
	}

	async get(key: string): Promise<SerializedProject | null> {
		return this.adapter.get(key);
	}

	async set(
		keyOrArgs: string | { key: string; value: SerializedProject },
		maybeValue?: SerializedProject,
	): Promise<void> {
		const key = typeof keyOrArgs === "string" ? keyOrArgs : keyOrArgs.key;
		const value =
			typeof keyOrArgs === "string" ? (maybeValue as SerializedProject) : keyOrArgs.value;
		return this.adapter.set({ key, value });
	}

	async remove(key: string): Promise<void> {
		return this.adapter.remove(key);
	}

	async list(): Promise<string[]> {
		return this.adapter.list();
	}

	async getAll(): Promise<SerializedProject[]> {
		return this.adapter.getAll();
	}

	async clear(): Promise<void> {
		return this.adapter.clear();
	}

	async save(project: SerializedProject): Promise<void> {
		return this.set({ key: project.metadata.id, value: project });
	}

	async load(id: string): Promise<SerializedProject | null> {
		return this.get(id);
	}

	async delete(id: string): Promise<void> {
		return this.remove(id);
	}
}

export class FilesystemProjectStore implements ProjectStore {
	private apiBase = "/api/projects";
	private fallbackStore = new IndexedDBProjectStore();

	async get(key: string): Promise<SerializedProject | null> {
		try {
			const res = await fetch(`${this.apiBase}/${key}`);
			if (res.status === 404) return null;
			if (!res.ok) {
				console.warn(
					`[FilesystemProjectStore] API returned ${res.status}, falling back to IndexedDB`,
				);
				return this.fallbackStore.get(key);
			}
			const data = await res.json();
			return data.project ?? null;
		} catch {
			return this.fallbackStore.get(key);
		}
	}

	async set(
		keyOrArgs: string | { key: string; value: SerializedProject },
		maybeValue?: SerializedProject,
	): Promise<void> {
		const key = typeof keyOrArgs === "string" ? keyOrArgs : keyOrArgs.key;
		const value =
			typeof keyOrArgs === "string" ? (maybeValue as SerializedProject) : keyOrArgs.value;
		try {
			const res = await fetch(`${this.apiBase}/${key}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ project: value }),
			});
			if (!res.ok) {
				console.warn(
					`[FilesystemProjectStore] API returned ${res.status}, saving to IndexedDB fallback`,
				);
				await this.fallbackStore.set({ key, value });
				return;
			}
			// Keep fallback in sync
			try {
				await this.fallbackStore.set({ key, value });
			} catch {
				// Ignore fallback sync errors
			}
		} catch {
			await this.fallbackStore.set({ key, value });
		}
	}

	async remove(key: string): Promise<void> {
		try {
			const res = await fetch(`${this.apiBase}/${key}`, {
				method: "DELETE",
			});
			if (!res.ok && res.status !== 404) {
				console.warn(
					`[FilesystemProjectStore] API returned ${res.status}, removing from fallback`,
				);
			}
		} catch {
			// ignore network error
		}
		try {
			await this.fallbackStore.remove(key);
		} catch {
			// ignore fallback error
		}
	}

	async list(): Promise<string[]> {
		try {
			const res = await fetch(this.apiBase);
			if (!res.ok) {
				return this.fallbackStore.list();
			}
			const data = await res.json();
			return data.ids ?? [];
		} catch {
			return this.fallbackStore.list();
		}
	}

	async getAll(): Promise<SerializedProject[]> {
		try {
			const res = await fetch(`${this.apiBase}?full=true`);
			if (!res.ok) {
				return this.fallbackStore.getAll();
			}
			const data = await res.json();
			const serverProjects: SerializedProject[] = data.projects ?? [];
			if (serverProjects.length > 0) {
				return serverProjects;
			}
			// Fallback check if server had 0 but indexeddb had legacy projects
			const fallbackProjects = await this.fallbackStore.getAll();
			if (fallbackProjects.length > 0) {
				// Migrate to filesystem store
				for (const p of fallbackProjects) {
					await this.set({ key: p.metadata.id, value: p });
				}
				return fallbackProjects;
			}
			return serverProjects;
		} catch {
			return this.fallbackStore.getAll();
		}
	}

	async clear(): Promise<void> {
		const ids = await this.list();
		await Promise.all(ids.map((id) => this.remove(id)));
		try {
			await this.fallbackStore.clear();
		} catch {
			// ignore fallback error
		}
	}

	async save(project: SerializedProject): Promise<void> {
		return this.set({ key: project.metadata.id, value: project });
	}

	async load(id: string): Promise<SerializedProject | null> {
		return this.get(id);
	}

	async delete(id: string): Promise<void> {
		return this.remove(id);
	}
}

export type ProjectStoreBackend = "filesystem" | "indexeddb";

export function createProjectStore(
	backend: ProjectStoreBackend = "filesystem",
): ProjectStore {
	if (backend === "filesystem") {
		return new FilesystemProjectStore();
	}
	return new IndexedDBProjectStore();
}
