export type Domain =
	| 'film'
	| 'tv'
	| 'music'
	| 'book'
	| 'visual-art'
	| 'architecture'
	| 'fashion'
	| 'food'
	| 'game'
	| 'other';

export type Rating =
	| 'core' // ❤️ Part of me
	| 'love' // 👍 Really like
	| 'like' // 🙂 Like
	| 'meh' // 😐 Meh
	| 'dislike' // 👎 Not for me
	| 'exile'; // 🚫 Hard no

export const RATINGS: { value: Rating; emoji: string; label: string; weight: number }[] = [
	{ value: 'core', emoji: '❤️', label: 'Part of me', weight: 3 },
	{ value: 'love', emoji: '👍', label: 'Really like', weight: 2 },
	{ value: 'like', emoji: '🙂', label: 'Like', weight: 1 },
	{ value: 'meh', emoji: '😐', label: 'Meh', weight: 0 },
	{ value: 'dislike', emoji: '👎', label: 'Not for me', weight: -1 },
	{ value: 'exile', emoji: '🚫', label: 'Hard no', weight: -3 }
];

export interface Node {
	id: string;
	title: string;
	creator?: string;
	domain: Domain;
	year?: number | null;
	reason?: string;
	rating: Rating | null;
	x: number;
	y: number;
	vx: number;
	vy: number;
	parentId: string | null;
	depth: number;
	createdAt: number;
	imageUrl?: string | null;
	expanding?: boolean;
	seed?: boolean;
}

export type EdgeKind = 'child' | 'bridge' | 'manual';

export interface Edge {
	from: string;
	to: string;
	kind?: EdgeKind;
	reason?: string;
}

export interface Recommendation {
	title: string;
	creator?: string;
	domain: Domain;
	year?: number | null;
	reason: string;
}

export interface Bridge {
	existingTitle: string;
	reason: string;
}
