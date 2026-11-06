import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';
import type { Recommendation, Domain, Bridge } from '$lib/types';

function getClient() {
	if (!env.ANTHROPIC_API_KEY) {
		throw new Error(
			'Missing ANTHROPIC_API_KEY. Add it to a .env file in the project root and restart the dev server.'
		);
	}
	return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 3 });
}

// Haiku with thinking on for the translation: in side-by-side tests it matched
// Sonnet's picks at about a tenth of the cost (~0.1¢ a search). Thinking off
// was cheaper but noticeably weaker. Haiku also does the one-line lookup.
const TRANSLATE_MODEL = 'claude-haiku-5-5';
const CLASSIFY_MODEL = 'claude-haiku-5-5';

// How much of the map goes into each request. The map grows with every click;
// without a cap every translation costs more than the last. Most recent wins.
const MAX_LOVES = 20;
const MAX_DISLIKES = 20;
const MAX_MAP_TITLES = 60;

const DOMAINS: Domain[] = [
	'film',
	'tv',
	'music',
	'book',
	'visual-art',
	'architecture',
	'fashion',
	'food',
	'game',
	'other'
];

const SYSTEM_PROMPT = `You are the engine behind Wjunderkammer — a tool that maps a person's aesthetic DNA across creative domains.

Your job: given a seed item (and optionally the wider constellation of what the user loves and hates), read its aesthetic DNA — mood, texture, color, pacing, emotional register, cultural moment, values it embodies — and surface 5 to 8 recommendations that cross at least 3 different creative domains (film, tv, music, book, visual-art, architecture, fashion, food, game, other).

Rules:
- Treat dislikes and "hard nos" as signal, not noise. Avoid recommending things that lean into the qualities the user has rejected.
- Lean toward specific, canonical-but-uncommon choices over obvious greatest-hits. The user wants discovery, not the first Google result.
- Each reason must be one crisp sentence that names the aesthetic bridge — texture, mood, or idea — not a generic "fans of X also like Y".
- Span domains. Don't give 6 films. Cross into music, architecture, food, fashion, visual art.
- Be confident. No hedging.
- Emit 5 to 8 recommendations, and at most 4 bridges.`;

/** The response shape, enforced by structured outputs (every object closed). */
const RECOMMEND_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	properties: {
		dna: {
			type: 'string',
			description: "One or two sentences naming the seed's aesthetic DNA — mood, texture, cultural register."
		},
		recommendations: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				properties: {
					title: { type: 'string' },
					creator: {
						type: 'string',
						description:
							'Artist, director, author, architect, chef, studio — whoever made it. Optional for things like cuisines.'
					},
					domain: { type: 'string', enum: DOMAINS },
					year: { anyOf: [{ type: 'integer' }, { type: 'null' }], description: 'Year if applicable, else null.' },
					reason: { type: 'string', description: 'One sentence naming the aesthetic bridge from seed to this item.' }
				},
				required: ['title', 'domain', 'reason']
			}
		},
		bridges: {
			type: 'array',
			description:
				'Up to 4 links from the seed to items ALREADY on the map, by their exact title. Empty if nothing on the map connects.',
			items: {
				type: 'object',
				additionalProperties: false,
				properties: {
					existingTitle: { type: 'string', description: 'Exact title of an item already on the map.' },
					reason: {
						type: 'string',
						description: 'One crisp sentence naming the aesthetic thread linking the new seed to this item.'
					}
				},
				required: ['existingTitle', 'reason']
			}
		}
	},
	required: ['dna', 'recommendations']
};

export interface TranslateInput {
	seedTitle: string;
	seedCreator?: string;
	seedDomain?: Domain | null;
	loves: string[];
	dislikes: string[];
	/** Every title already on the map (minus the seed): not repeated, and the bridge candidates. */
	mapTitles: string[];
	findBridges?: boolean;
}

export interface TranslateResult {
	dna: string;
	recommendations: Recommendation[];
	bridges: Bridge[];
}

const recent = (list: string[], n: number) => list.slice(-n);

// Dollars per million tokens [input, output], from Anthropic's price list (Oct 2026).
// Update these if prices change.
const PRICES: Record<string, [number, number]> = {
	'claude-sonnet-5-5': [2, 10],
	'claude-sonnet-5': [2, 10], // the refusal fallback
	'claude-haiku-5-5': [0.1, 0.5]
};

/** One terminal line per call, so the cost of a search is visible while you use it. */
function logUsage(
	label: string,
	model: string,
	usage: { input_tokens: number; output_tokens: number },
	startedAt: number
) {
	const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
	const price = PRICES[model];
	const cost = price
		? `$${((usage.input_tokens * price[0] + usage.output_tokens * price[1]) / 1e6).toFixed(4)}`
		: 'cost unknown';
	console.log(
		`[usage] ${label} · ${model} · ${usage.input_tokens} in / ${usage.output_tokens} out · ${cost} · ${seconds}s`
	);
}

export async function translateTaste(input: TranslateInput): Promise<TranslateResult> {
	const loves = recent(input.loves, MAX_LOVES);
	const dislikes = recent(input.dislikes, MAX_DISLIKES);
	const mapTitles = recent(input.mapTitles, MAX_MAP_TITLES);

	// Each title goes in once: the map list both blocks repeats and offers bridges.
	const userContent = [
		`Seed item: ${input.seedTitle}${input.seedCreator ? ` — ${input.seedCreator}` : ''}${input.seedDomain ? ` (${input.seedDomain})` : ''}.`,
		loves.length ? `What the user loves: ${loves.join('; ')}.` : '',
		dislikes.length ? `What the user has rejected: ${dislikes.join('; ')}.` : '',
		mapTitles.length ? `Already on the map — do not recommend any of these again: ${mapTitles.join('; ')}.` : '',
		input.findBridges && mapTitles.length
			? 'If any item already on the map shares aesthetic DNA with this seed, add up to 4 bridges to it, using its exact title.'
			: 'Leave bridges empty.',
		'Recommend 5 to 8 items spanning at least 3 creative domains.'
	]
		.filter(Boolean)
		.join('\n');

	// Thinking on: it's what makes Haiku's picks interpretive rather than
	// literal. It's billed as output, so max_tokens leaves room for it.
	// Structured outputs keep the JSON shape. Haiku has no server-side
	// fallback; a refusal is caught below.
	const startedAt = Date.now();
	const response = await getClient().messages.create({
		model: TRANSLATE_MODEL,
		max_tokens: 16000,
		thinking: { type: 'adaptive' },
		// High so it reliably thinks; at medium it sometimes barely did and the picks went flat.
		output_config: { effort: 'high', format: { type: 'json_schema', schema: RECOMMEND_SCHEMA } },
		system: SYSTEM_PROMPT,
		messages: [{ role: 'user', content: userContent }]
	});
	logUsage('translate', response.model, response.usage, startedAt);

	if (response.stop_reason === 'refusal') {
		throw new Error('The translator passed on this one. Try a different seed.');
	}
	const text = response.content.find((b) => b.type === 'text');
	if (!text || text.type !== 'text') throw new Error('The translator returned nothing. Try again.');

	const parsed = JSON.parse(text.text) as {
		dna: string;
		recommendations: Recommendation[];
		bridges?: Bridge[];
	};

	return {
		dna: parsed.dna,
		recommendations: parsed.recommendations.slice(0, 8).map((r) => ({
			...r,
			domain: (DOMAINS.includes(r.domain as Domain) ? r.domain : 'other') as Domain
		})),
		bridges: (parsed.bridges ?? []).slice(0, 4)
	};
}

const CLASSIFY_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	properties: {
		title: { type: 'string' },
		creator: { anyOf: [{ type: 'string' }, { type: 'null' }] },
		domain: { type: 'string', enum: DOMAINS },
		year: { anyOf: [{ type: 'integer' }, { type: 'null' }] }
	},
	required: ['title', 'creator', 'domain', 'year']
};

/** What a typed seed is (domain, creator), for its card and thumbnail. Never fails. */
export async function classifySeed(
	text: string
): Promise<{ title: string; creator?: string; domain: Domain; year?: number | null }> {
	const fallback = { title: text, domain: 'other' as Domain };
	const startedAt = Date.now();
	const response = await getClient().messages.create({
		model: CLASSIFY_MODEL,
		max_tokens: 1000,
		// A lookup needs no reasoning; thinking is billed as output.
		thinking: { type: 'disabled' },
		output_config: { format: { type: 'json_schema', schema: CLASSIFY_SCHEMA } },
		system: 'You classify a freeform taste seed (a film, record, book, place, dish…) into structured metadata.',
		messages: [{ role: 'user', content: `Classify: "${text}"` }]
	});
	logUsage('classify', response.model, response.usage, startedAt);

	const block = response.content.find((b) => b.type === 'text');
	if (response.stop_reason === 'refusal' || !block || block.type !== 'text') return fallback;
	try {
		const parsed = JSON.parse(block.text);
		return {
			title: parsed.title || text,
			creator: parsed.creator ?? undefined,
			domain: (DOMAINS.includes(parsed.domain) ? parsed.domain : 'other') as Domain,
			year: parsed.year ?? null
		};
	} catch {
		return fallback;
	}
}
