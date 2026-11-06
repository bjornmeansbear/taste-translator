// Finds an English-language ISBN for a book through Open Library's search API
// (no key needed), so a book card can link straight to its Bookshop.org page.
// Fails quietly: a book without one links to a Bookshop search instead.

import { USER_AGENT } from './user-agent';

const CACHE = new Map<string, string>();

/** ISBN-13s in the 978-0 and 978-1 groups are English-language editions. */
const isEnglishIsbn13 = (isbn: string) => /^978[01]\d{9}$/.test(isbn);

export async function fetchIsbn(title: string, creator?: string): Promise<string | null> {
	const key = `${title}|${creator ?? ''}`.toLowerCase();
	const cached = CACHE.get(key);
	if (cached) return cached;

	const q = [title, creator].filter(Boolean).join(' ');
	const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=3&fields=isbn`;
	let isbn: string | null = null;
	try {
		const res = await fetch(url, {
			headers: { 'User-Agent': USER_AGENT },
			signal: AbortSignal.timeout(4000)
		});
		if (res.ok) {
			const data = (await res.json()) as { docs?: { isbn?: string[] }[] };
			for (const doc of data.docs ?? []) {
				isbn = doc.isbn?.find(isEnglishIsbn13) ?? null;
				if (isbn) break;
			}
		}
	} catch {
		// Slow or down: no ISBN, the link falls back to a search.
	}
	if (isbn) CACHE.set(key, isbn); // misses can succeed next time
	return isbn;
}
