// The things you've kept: one list across every map, saved only in this
// browser. No account and no server; Copy and Download are how it leaves.
import { browser } from '$app/environment';
import type { Domain, Node } from './types';
import { DOMAINS, domainOf } from './types';
import { findLinks } from './links';

export interface KeptItem {
	key: string;
	title: string;
	creator?: string;
	domain: Domain;
	year?: number | null;
	reason?: string;
	imageUrl?: string | null;
	wikiTitle?: string | null;
	isbn?: string | null;
	keptAt: number;
}

const STORAGE_KEY = 'wjk-kept';

/** Same title and creator = the same thing, whichever map it turned up on. */
export const keyFor = (n: { title: string; creator?: string }) =>
	`${n.title.trim().toLowerCase()}|${(n.creator ?? '').trim().toLowerCase()}`;

function read(): KeptItem[] {
	if (!browser) return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as KeptItem[]) : [];
	} catch {
		return [];
	}
}

class Collection {
	items = $state<KeptItem[]>(read());

	keys = $derived(new Set(this.items.map((i) => i.key)));

	has(n: { title: string; creator?: string }) {
		return this.keys.has(keyFor(n));
	}

	toggle(n: Node) {
		const key = keyFor(n);
		if (this.keys.has(key)) {
			this.items = this.items.filter((i) => i.key !== key);
		} else {
			this.items = [
				{
					key,
					title: n.title,
					creator: n.creator,
					domain: n.domain,
					year: n.year,
					reason: n.reason,
					imageUrl: n.imageUrl,
					wikiTitle: n.wikiTitle,
					isbn: n.isbn,
					keptAt: Date.now()
				},
				...this.items
			];
		}
		this.persist();
	}

	remove(key: string) {
		this.items = this.items.filter((i) => i.key !== key);
		this.persist();
	}

	private persist() {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
		} catch {
			// Private window or full storage: the list still works until reload.
		}
	}
}

export const collection = new Collection();

// ─── Export ────────────────────────────────────────────────────────────────

const today = () => new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

const byline = (i: KeptItem) =>
	[i.creator, i.year].filter(Boolean).join(', ');

/** Kept items grouped by kind, in the order the app lists kinds. */
function grouped(items: KeptItem[]) {
	const order = Object.keys(DOMAINS) as Domain[];
	return order
		.map((d) => ({ domain: d, items: items.filter((i) => i.domain === d) }))
		.filter((g) => g.items.length > 0);
}

/** A plain list for pasting into notes, a message or an email. */
export function asText(items: KeptItem[]): string {
	const lines = [`My Wjunderkammer finds (${today()})`, ''];
	for (const i of items) {
		const meta = [domainOf(i.domain).label, i.year].filter(Boolean).join(', ');
		lines.push(`${i.title}${i.creator ? ` — ${i.creator}` : ''} (${meta})`);
		if (i.reason) lines.push(`  ${i.reason}`);
		lines.push(`  ${findLinks(i)[0].url}`, '');
	}
	return lines.join('\n').trimEnd() + '\n';
}

/** Markdown with every link, grouped by kind: for a notes app, Obsidian, a blog. */
export function asMarkdown(items: KeptItem[]): string {
	const out = [`# My Wjunderkammer finds`, '', `Kept as of ${today()}. ${items.length} things.`, ''];
	for (const g of grouped(items)) {
		const label = domainOf(g.domain).label;
		out.push(`## ${label[0].toUpperCase()}${label.slice(1)}`, '');
		for (const i of g.items) {
			const by = byline(i);
			out.push(`- **${i.title}**${by ? ` — ${by}` : ''}  `);
			if (i.reason) out.push(`  ${i.reason}  `);
			out.push(`  ${findLinks(i).map((l) => `[${l.label}](${l.url})`).join(' · ')}`);
		}
		out.push('');
	}
	return out.join('\n');
}
