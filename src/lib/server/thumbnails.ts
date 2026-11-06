// Lightweight image lookup via Wikipedia's REST summary endpoint.
// No API key required. Fails quietly — nodes without a match just render without a thumbnail.

import { USER_AGENT } from './user-agent';

const CACHE = new Map<string, WikiMatch>();

export interface ThumbQuery {
	title: string;
	creator?: string;
	domain?: string;
}

function disambiguator(domain?: string): string {
	switch (domain) {
		case 'film':
			return 'film';
		case 'tv':
			return 'TV series';
		case 'music':
			return 'album';
		case 'book':
			return 'book';
		case 'visual-art':
			return 'painting';
		case 'architecture':
			return 'building';
		default:
			return '';
	}
}

async function wikiSearch(query: string): Promise<string | null> {
	const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
		query
	)}&srlimit=1&format=json&origin=*`;
	try {
		const res = await fetch(url, {
			headers: { 'User-Agent': USER_AGENT }
		});
		if (!res.ok) return null;
		const data = (await res.json()) as {
			query?: { search?: { title: string }[] };
		};
		return data.query?.search?.[0]?.title ?? null;
	} catch {
		return null;
	}
}

/** A page's image, or null; undefined when the page is a disambiguation page or missing. */
async function wikiThumb(pageTitle: string): Promise<string | null | undefined> {
	const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
	try {
		const res = await fetch(url, {
			headers: { 'User-Agent': USER_AGENT }
		});
		if (!res.ok) return undefined;
		const data = (await res.json()) as {
			thumbnail?: { source?: string };
			originalimage?: { source?: string };
			type?: string;
		};
		if (data.type === 'disambiguation') return undefined;
		return data.thumbnail?.source ?? data.originalimage?.source ?? null;
	} catch {
		return undefined;
	}
}

/** Lowercase, no accents, no "(film)"-style suffix, letters and digits only. */
const norm = (s: string) =>
	s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/\(.*?\)/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();

/** Is this Wikipedia page about the item, not just near it? */
function sameThing(page: string, title: string) {
	const p = norm(page);
	const t = norm(title);
	return p.length > 0 && t.length > 0 && (p.includes(t) || t.includes(p));
}

export interface WikiMatch {
	imageUrl: string | null;
	/** The page matched, so a card can link straight to it. */
	wikiTitle: string | null;
}

const NO_MATCH: WikiMatch = { imageUrl: null, wikiTitle: null };

export async function fetchThumb(q: ThumbQuery): Promise<WikiMatch> {
	const key = `${q.title}|${q.creator ?? ''}|${q.domain ?? ''}`;
	const cached = CACHE.get(key);
	if (cached) return cached;

	const candidates: string[] = [];
	const disc = disambiguator(q.domain);
	const base = q.creator ? `${q.title} ${q.creator}` : q.title;
	if (disc) candidates.push(`${base} ${disc}`);
	candidates.push(base);
	if (q.creator) candidates.push(q.title);

	// The first page that is about the item itself is the link. A search can
	// land on the creator's page instead: fine for a picture, wrong for a link.
	let wikiTitle: string | null = null;
	let imageUrl: string | null = null;
	for (const c of candidates) {
		const page = await wikiSearch(c);
		if (!page) continue;
		const thumb = await wikiThumb(page);
		if (thumb === undefined) continue;
		if (!wikiTitle && sameThing(page, q.title)) wikiTitle = page;
		imageUrl ??= thumb;
		if (imageUrl && wikiTitle) break;
	}
	// Misses aren't cached: a rate-limited lookup can succeed next time.
	if (!imageUrl && !wikiTitle) return NO_MATCH;
	const match = { imageUrl, wikiTitle };
	CACHE.set(key, match);
	return match;
}

/** Look up a batch, a few at a time: Wikipedia rate-limits bursts. */
export async function fetchThumbs<T extends ThumbQuery>(items: T[], concurrency = 4): Promise<WikiMatch[]> {
	const out: WikiMatch[] = new Array(items.length);
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const i = next++;
			out[i] = await fetchThumb(items[i]);
		}
	};
	await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
	return out;
}
