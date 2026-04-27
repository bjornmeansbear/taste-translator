import type { Node, Edge, Rating, Recommendation } from './types';
import { RATINGS } from './types';
import { saveExploration, loadExploration } from './storage';
import type { ExplorationSave } from './storage';

function uid() {
	return Math.random().toString(36).slice(2, 11);
}

function ratingWeight(r: Rating | null): number {
	if (!r) return 0;
	return RATINGS.find((x) => x.value === r)?.weight ?? 0;
}

class Graph {
	nodes = $state<Node[]>([]);
	edges = $state<Edge[]>([]);
	loadingId = $state<string | null>(null);
	showExiled = $state(false);
	dna = $state<Record<string, string>>({});
	focusId = $state<string | null>(null);

	// Persistence
	explorationId = $state<string | null>(null);

	byId = $derived.by(() => {
		const m = new Map<string, Node>();
		for (const n of this.nodes) m.set(n.id, n);
		return m;
	});

	anchorNode = $derived(this.nodes[0] ?? null);

	/** Auto-generated name from seed titles */
	explorationName = $derived(
		this.nodes
			.filter((n) => n.parentId === null)
			.map((n) => n.title)
			.join(' · ') || 'Untitled'
	);

	add(n: Omit<Node, 'id' | 'createdAt' | 'vx' | 'vy'> & { id?: string }) {
		const node: Node = {
			id: n.id ?? uid(),
			vx: 0,
			vy: 0,
			createdAt: Date.now(),
			...n
		} as Node;
		this.nodes.push(node);
		return node;
	}

	connect(from: string, to: string, kind: Edge['kind'] = 'child', reason?: string) {
		// Avoid duplicates.
		if (this.edges.some((e) => (e.from === from && e.to === to) || (e.from === to && e.to === from))) {
			return;
		}
		this.edges.push({ from, to, kind, reason });
	}

	findByTitle(title: string) {
		const t = title.toLowerCase().trim();
		return (
			this.nodes.find((n) => n.title.toLowerCase().trim() === t) ??
			this.nodes.find((n) => n.title.toLowerCase().includes(t) || t.includes(n.title.toLowerCase()))
		);
	}

	rate(id: string, rating: Rating | null) {
		const n = this.nodes.find((x) => x.id === id);
		if (n) n.rating = rating;
	}

	remove(id: string) {
		this.nodes = this.nodes.filter((n) => n.id !== id);
		this.edges = this.edges.filter((e) => e.from !== id && e.to !== id);
	}

	ingestRecommendations(
		parentId: string,
		recs: (Recommendation & { imageUrl?: string | null })[]
	) {
		const parent = this.nodes.find((n) => n.id === parentId);
		if (!parent) return [];
		const out: Node[] = [];
		const count = recs.length;
		const radius = 280 + Math.random() * 60;
		const baseAngle = Math.random() * Math.PI * 2;
		recs.forEach((r, i) => {
			const angle = baseAngle + (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
			const jitter = (Math.random() - 0.5) * 80;
			const x = parent.x + Math.cos(angle) * (radius + jitter);
			const y = parent.y + Math.sin(angle) * (radius + jitter);
			const node = this.add({
				title: r.title,
				creator: r.creator,
				domain: r.domain,
				year: r.year ?? null,
				reason: r.reason,
				imageUrl: r.imageUrl ?? null,
				rating: null,
				x,
				y,
				parentId,
				depth: parent.depth + 1
			});
			this.connect(parentId, node.id, 'child');
			out.push(node);
		});
		return out;
	}

	ingestBridges(fromId: string, bridges: { existingTitle: string; reason: string }[]) {
		let created = 0;
		for (const b of bridges) {
			const target = this.findByTitle(b.existingTitle);
			if (!target || target.id === fromId) continue;
			const beforeLen = this.edges.length;
			this.connect(fromId, target.id, 'bridge', b.reason);
			if (this.edges.length > beforeLen) created++;
		}
		return created;
	}

	lovedTitles(): string[] {
		return this.nodes
			.filter((n) => n.rating === 'core' || n.rating === 'love')
			.map((n) => `${n.title}${n.creator ? ` (${n.creator})` : ''}`);
	}

	dislikedTitles(): string[] {
		return this.nodes
			.filter((n) => n.rating === 'dislike' || n.rating === 'exile')
			.map((n) => `${n.title}${n.creator ? ` (${n.creator})` : ''}`);
	}

	allTitles(): string[] {
		return this.nodes.map((n) => n.title);
	}

	// ─── Persistence ───────────────────────────────────────────────────────────

	/** Start a fresh exploration and assign it a new ID. */
	startNew() {
		this.nodes = [];
		this.edges = [];
		this.dna = {};
		this.explorationId = uid();
	}

	/** Save current state to localStorage. */
	save() {
		if (!this.explorationId || this.nodes.length === 0) return;
		const save: ExplorationSave = {
			meta: {
				id: this.explorationId,
				name: this.explorationName,
				createdAt: this.nodes[0]?.createdAt ?? Date.now(),
				updatedAt: Date.now(),
				nodeCount: this.nodes.length,
				seedTitles: this.nodes
					.filter((n) => n.parentId === null)
					.map((n) => n.title)
			},
			nodes: this.nodes,
			edges: this.edges,
			dna: { ...this.dna }
		};
		saveExploration(save);
	}

	/** Load an exploration from localStorage into the graph. */
	load(id: string): boolean {
		const save = loadExploration(id);
		if (!save) return false;
		// Reset velocities on load so physics starts fresh from saved positions
		this.nodes = save.nodes.map((n) => ({ ...n, vx: 0, vy: 0 }));
		this.edges = save.edges;
		this.dna = save.dna ?? {};
		this.explorationId = id;
		return true;
	}

	step(dt = 1) {
		const nodes = this.nodes;
		const n = nodes.length;
		if (n === 0) return;

		for (const a of nodes) {
			if (a === this.anchorNode) continue;
			for (const b of nodes) {
				if (a === b) continue;
				const dx = a.x - b.x;
				const dy = a.y - b.y;
				const d2 = dx * dx + dy * dy + 0.01;
				const d = Math.sqrt(d2);
				const minDist = 220;
				if (d < minDist * 2) {
					const force = (minDist * 90) / d2;
					a.vx += (dx / d) * force * dt;
					a.vy += (dy / d) * force * dt;
				}
			}
		}

		for (const e of this.edges) {
			const a = nodes.find((x) => x.id === e.from);
			const b = nodes.find((x) => x.id === e.to);
			if (!a || !b) continue;
			const dx = b.x - a.x;
			const dy = b.y - a.y;
			const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
			const rest = 300;
			const force = (d - rest) * 0.01;
			const fx = (dx / d) * force;
			const fy = (dy / d) * force;
			if (a !== this.anchorNode) {
				a.vx += fx * dt;
				a.vy += fy * dt;
			}
			if (b !== this.anchorNode) {
				b.vx -= fx * dt;
				b.vy -= fy * dt;
			}
		}

		for (const node of nodes) {
			if (node === this.anchorNode) continue;
			const w = ratingWeight(node.rating);
			const dx = node.x;
			const dy = node.y;
			const d = Math.sqrt(dx * dx + dy * dy) + 0.01;

			if (w >= 2) {
				const pull = w >= 3 ? 0.012 : 0.006;
				node.vx -= (dx / d) * d * pull * dt;
				node.vy -= (dy / d) * d * pull * dt;
			} else if (w < 0) {
				const push = w === -3 ? 0.9 : 0.25;
				node.vx += (dx / d) * push * dt * 8;
				node.vy += (dy / d) * push * dt * 8;
			}
		}

		const damping = 0.82;
		for (const node of nodes) {
			if (node === this.anchorNode) {
				node.vx = 0;
				node.vy = 0;
				continue;
			}
			node.vx *= damping;
			node.vy *= damping;
			const maxSpeed = 18;
			const sp = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
			if (sp > maxSpeed) {
				node.vx = (node.vx / sp) * maxSpeed;
				node.vy = (node.vy / sp) * maxSpeed;
			}
			node.x += node.vx * dt;
			node.y += node.vy * dt;
		}
	}
}

export const graph = new Graph();
