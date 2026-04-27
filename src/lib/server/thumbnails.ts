// Lightweight image lookup via Wikipedia's REST summary endpoint.
// No API key required. Fails quietly — nodes without a match just render without a thumbnail.

const CACHE = new Map<string, string | null>();

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
			headers: { 'User-Agent': 'TasteTranslator/1.0 (local)' }
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

async function wikiThumb(pageTitle: string): Promise<string | null> {
	const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
	try {
		const res = await fetch(url, {
			headers: { 'User-Agent': 'TasteTranslator/1.0 (local)' }
		});
		if (!res.ok) return null;
		const data = (await res.json()) as {
			thumbnail?: { source?: string };
			originalimage?: { source?: string };
			type?: string;
		};
		if (data.type === 'disambiguation') return null;
		return data.thumbnail?.source ?? data.originalimage?.source ?? null;
	} catch {
		return null;
	}
}

export async function fetchThumb(q: ThumbQuery): Promise<string | null> {
	const key = `${q.title}|${q.creator ?? ''}|${q.domain ?? ''}`;
	if (CACHE.has(key)) return CACHE.get(key) ?? null;

	const candidates: string[] = [];
	const disc = disambiguator(q.domain);
	const base = q.creator ? `${q.title} ${q.creator}` : q.title;
	if (disc) candidates.push(`${base} ${disc}`);
	candidates.push(base);
	if (q.creator) candidates.push(q.title);

	for (const c of candidates) {
		const page = await wikiSearch(c);
		if (!page) continue;
		const thumb = await wikiThumb(page);
		if (thumb) {
			CACHE.set(key, thumb);
			return thumb;
		}
	}
	CACHE.set(key, null);
	return null;
}

export async function fetchThumbs<T extends ThumbQuery>(
	items: T[]
): Promise<(string | null)[]> {
	return Promise.all(items.map(fetchThumb));
}
