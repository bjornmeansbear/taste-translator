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

/** Domain marker (emoji for now — see NOTES.md, ink icons later) and short label. */
export const DOMAINS: Record<Domain, { emoji: string; label: string }> = {
	film: { emoji: '🎬', label: 'film' },
	tv: { emoji: '📺', label: 'tv' },
	music: { emoji: '🎵', label: 'music' },
	book: { emoji: '📖', label: 'book' },
	'visual-art': { emoji: '🎨', label: 'art' },
	architecture: { emoji: '🏛', label: 'arch' },
	fashion: { emoji: '👗', label: 'fashion' },
	food: { emoji: '🍷', label: 'food' },
	game: { emoji: '🎮', label: 'game' },
	other: { emoji: '✦', label: 'other' }
};

export const domainOf = (d: string) => DOMAINS[d as Domain] ?? DOMAINS.other;

export const ratingFor = (r: Rating | null | undefined) => (r ? RATINGS.find((x) => x.value === r) : undefined);

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
