// Where to go next with a find: read about it, watch it, hear it, buy it,
// visit it. Plain search links (no keys, nothing to break), plus a direct
// Wikipedia page when the thumbnail lookup found one.
import { env } from '$env/dynamic/public';
import type { Domain } from './types';

export interface FindLink {
	label: string;
	url: string;
	/** True when the link can earn a commission, so it can be disclosed. */
	affiliate?: boolean;
}

export interface Findable {
	title: string;
	creator?: string;
	domain: Domain;
	wikiTitle?: string | null;
	isbn?: string | null;
}

/** Your Bookshop.org affiliate ID, if set in .env. Unset: plain links. */
export const bookshopAffiliateId = (env.PUBLIC_BOOKSHOP_AFFILIATE_ID ?? '').trim();

const q = (s: string) => encodeURIComponent(s.trim());

function wikipedia(item: Findable, query: string): FindLink {
	// No matched page: search with the creator too, so a common title like
	// "Nostalgia" lists Tarkovsky's film instead of jumping to the emotion.
	const url = item.wikiTitle
		? `https://en.wikipedia.org/wiki/${encodeURIComponent(item.wikiTitle.replaceAll(' ', '_'))}`
		: `https://en.wikipedia.org/w/index.php?search=${q(query)}`;
	return { label: 'Wikipedia', url };
}

function bookshop(item: Findable, query: string): FindLink {
	if (bookshopAffiliateId && item.isbn) {
		return { label: 'Bookshop', url: `https://bookshop.org/a/${bookshopAffiliateId}/${item.isbn}`, affiliate: true };
	}
	return { label: 'Bookshop', url: `https://bookshop.org/search?keywords=${q(item.isbn ?? query)}` };
}

/** The links for one find, most useful first. */
export function findLinks(item: Findable): FindLink[] {
	const query = [item.title, item.creator].filter(Boolean).join(' ');
	const maps = { label: 'Maps', url: `https://www.google.com/maps/search/?api=1&query=${q(query)}` };

	const byDomain: Partial<Record<Domain, FindLink[]>> = {
		book: [bookshop(item, query)],
		music: [
			{ label: 'Bandcamp', url: `https://bandcamp.com/search?q=${q(query)}` },
			{ label: 'Discogs', url: `https://www.discogs.com/search/?q=${q(query)}&type=all` }
		],
		film: [
			{ label: 'JustWatch', url: `https://www.justwatch.com/us/search?q=${q(item.title)}` },
			{ label: 'Letterboxd', url: `https://letterboxd.com/search/films/${q(item.title)}/` }
		],
		tv: [{ label: 'JustWatch', url: `https://www.justwatch.com/us/search?q=${q(item.title)}` }],
		game: [{ label: 'Steam', url: `https://store.steampowered.com/search/?term=${q(item.title)}` }],
		architecture: [maps],
		food: [maps],
		'visual-art': [{ label: 'Arts & Culture', url: `https://artsandculture.google.com/search?q=${q(query)}` }]
	};

	return [...(byDomain[item.domain] ?? []), wikipedia(item, query)];
}
