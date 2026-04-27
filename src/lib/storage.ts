import type { Node, Edge } from './types';

export type ExplorationMeta = {
	id: string;
	name: string;
	createdAt: number;
	updatedAt: number;
	nodeCount: number;
	seedTitles: string[];
};

export type ExplorationSave = {
	meta: ExplorationMeta;
	nodes: Node[];
	edges: Edge[];
	dna: Record<string, string>;
};

const META_KEY = 'tt-explorations';
const dataKey = (id: string) => `tt-exp-${id}`;

export function listExplorations(): ExplorationMeta[] {
	try {
		const raw = localStorage.getItem(META_KEY);
		if (!raw) return [];
		const list = JSON.parse(raw) as ExplorationMeta[];
		// Sort newest first
		return list.sort((a, b) => b.updatedAt - a.updatedAt);
	} catch {
		return [];
	}
}

export function loadExploration(id: string): ExplorationSave | null {
	try {
		const raw = localStorage.getItem(dataKey(id));
		if (!raw) return null;
		return JSON.parse(raw) as ExplorationSave;
	} catch {
		return null;
	}
}

export function saveExploration(save: ExplorationSave): void {
	try {
		localStorage.setItem(dataKey(save.meta.id), JSON.stringify(save));
		const list = listExplorations();
		const idx = list.findIndex((m) => m.id === save.meta.id);
		if (idx >= 0) {
			list[idx] = save.meta;
		} else {
			list.push(save.meta);
		}
		localStorage.setItem(META_KEY, JSON.stringify(list));
	} catch {
		// Storage quota exceeded — fail silently
	}
}

export function deleteExploration(id: string): void {
	try {
		localStorage.removeItem(dataKey(id));
		const list = listExplorations().filter((m) => m.id !== id);
		localStorage.setItem(META_KEY, JSON.stringify(list));
	} catch {
		// ignore
	}
}

export function renameExploration(id: string, name: string): void {
	try {
		const list = listExplorations();
		const meta = list.find((m) => m.id === id);
		if (!meta) return;
		meta.name = name;
		localStorage.setItem(META_KEY, JSON.stringify(list));
		// Also update inside the data blob
		const raw = localStorage.getItem(dataKey(id));
		if (raw) {
			const save = JSON.parse(raw) as ExplorationSave;
			save.meta.name = name;
			localStorage.setItem(dataKey(id), JSON.stringify(save));
		}
	} catch {
		// ignore
	}
}

export function uid(): string {
	return Math.random().toString(36).slice(2, 11);
}

export function formatRelativeTime(ts: number): string {
	const diff = Date.now() - ts;
	const mins = Math.floor(diff / 60_000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	const days = Math.floor(hrs / 24);
	if (days < 7) return `${days}d ago`;
	return new Date(ts).toLocaleDateString();
}
