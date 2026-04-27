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

const MODEL = 'claude-opus-4-7';

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

const SYSTEM_PROMPT = `You are the engine behind Taste Translator — a tool that maps a person's aesthetic DNA across creative domains.

Your job: given a seed item (and optionally the wider constellation of what the user loves and hates), read its aesthetic DNA — mood, texture, color, pacing, emotional register, cultural moment, values it embodies — and surface 5 to 8 recommendations that cross at least 3 different creative domains (film, tv, music, book, visual-art, architecture, fashion, food, game, other).

Rules:
- Treat dislikes and "hard nos" as signal, not noise. Avoid recommending things that lean into the qualities the user has rejected.
- Lean toward specific, canonical-but-uncommon choices over obvious greatest-hits. The user wants discovery, not the first Google result.
- Each reason must be one crisp sentence that names the aesthetic bridge — texture, mood, or idea — not a generic "fans of X also like Y".
- Span domains. Don't give 6 films. Cross into music, architecture, food, fashion, visual art.
- Be confident. No hedging.
- Output valid JSON only. No prose outside the tool call.`;

const RECOMMEND_TOOL = {
	name: 'emit_recommendations',
	description:
		'Emit aesthetic recommendations that translate the seed across creative domains, plus bridges to existing items on the user\'s map.',
	input_schema: {
		type: 'object' as const,
		properties: {
			dna: {
				type: 'string',
				description:
					"One or two sentences naming the seed's aesthetic DNA — mood, texture, cultural register."
			},
			recommendations: {
				type: 'array',
				minItems: 5,
				maxItems: 8,
				items: {
					type: 'object',
					properties: {
						title: { type: 'string' },
						creator: {
							type: 'string',
							description:
								'Artist, director, author, architect, chef, studio — whoever made it. Optional for things like cuisines.'
						},
						domain: {
							type: 'string',
							enum: DOMAINS
						},
						year: {
							type: ['integer', 'null'],
							description: 'Year if applicable, else null.'
						},
						reason: {
							type: 'string',
							description:
								'One sentence naming the aesthetic bridge from seed to this item.'
						}
					},
					required: ['title', 'domain', 'reason']
				}
			},
			bridges: {
				type: 'array',
				maxItems: 4,
				description:
					'If the seed shares meaningful aesthetic DNA with items ALREADY on the map, list up to 4 bridges to those existing items by their exact title. Omit or return empty if nothing on the existing map connects.',
				items: {
					type: 'object',
					properties: {
						existingTitle: {
							type: 'string',
							description: 'Exact title of an item already on the map.'
						},
						reason: {
							type: 'string',
							description:
								'One crisp sentence naming the specific aesthetic thread linking the new seed to this existing item.'
						}
					},
					required: ['existingTitle', 'reason']
				}
			}
		},
		required: ['recommendations']
	}
};

export interface TranslateInput {
	seedTitle: string;
	seedCreator?: string;
	seedDomain?: Domain | null;
	loves: string[];
	dislikes: string[];
	avoidTitles: string[];
	existingItems?: string[];
	findBridges?: boolean;
}

export interface TranslateResult {
	dna: string;
	recommendations: Recommendation[];
	bridges: Bridge[];
}

export async function translateTaste(input: TranslateInput): Promise<TranslateResult> {
	const loveLine = input.loves.length
		? `What the user loves: ${input.loves.join('; ')}.`
		: '';
	const hateLine = input.dislikes.length
		? `What the user has rejected: ${input.dislikes.join('; ')}.`
		: '';
	const avoidLine = input.avoidTitles.length
		? `Do NOT repeat these already-mapped items: ${input.avoidTitles.join('; ')}.`
		: '';
	const bridgeLine =
		input.findBridges && input.existingItems?.length
			? `Existing items already on the map: ${input.existingItems.join('; ')}. If any share aesthetic DNA with this new seed, emit up to 4 bridges (exact titles match) in the bridges array.`
			: '';

	const userContent = [
		`Seed item: ${input.seedTitle}${input.seedCreator ? ` — ${input.seedCreator}` : ''}${input.seedDomain ? ` (${input.seedDomain})` : ''}.`,
		loveLine,
		hateLine,
		avoidLine,
		bridgeLine,
		'Emit 5–8 recommendations spanning at least 3 creative domains via the emit_recommendations tool.'
	]
		.filter(Boolean)
		.join('\n');

	const response = await getClient().messages.create({
		model: MODEL,
		max_tokens: 1600,
		system: [
			{
				type: 'text',
				text: SYSTEM_PROMPT,
				cache_control: { type: 'ephemeral' }
			}
		],
		tools: [RECOMMEND_TOOL],
		tool_choice: { type: 'tool', name: 'emit_recommendations' },
		messages: [{ role: 'user', content: userContent }]
	});

	const toolUse = response.content.find((b) => b.type === 'tool_use');
	if (!toolUse || toolUse.type !== 'tool_use') {
		throw new Error('No tool use returned from model');
	}

	const parsed = toolUse.input as {
		dna?: string;
		recommendations: Recommendation[];
		bridges?: Bridge[];
	};

	return {
		dna: parsed.dna ?? '',
		recommendations: (parsed.recommendations ?? []).map((r) => ({
			...r,
			domain: (DOMAINS.includes(r.domain as Domain) ? r.domain : 'other') as Domain
		})),
		bridges: parsed.bridges ?? []
	};
}

export async function classifySeed(
	text: string
): Promise<{ title: string; creator?: string; domain: Domain; year?: number | null }> {
	const response = await getClient().messages.create({
		model: 'claude-haiku-4-5-20251001',
		max_tokens: 300,
		system:
			'You classify a freeform taste seed into structured metadata. Return ONLY a JSON object with keys: title, creator (optional), domain (one of film, tv, music, book, visual-art, architecture, fashion, food, game, other), year (int or null). No prose.',
		messages: [
			{
				role: 'user',
				content: `Classify: "${text}"`
			}
		]
	});

	const text_block = response.content.find((b) => b.type === 'text');
	if (!text_block || text_block.type !== 'text') {
		return { title: text, domain: 'other' };
	}
	const raw = text_block.text.trim();
	const jsonMatch = raw.match(/\{[\s\S]*\}/);
	if (!jsonMatch) return { title: text, domain: 'other' };
	try {
		const parsed = JSON.parse(jsonMatch[0]);
		return {
			title: parsed.title ?? text,
			creator: parsed.creator,
			domain: (DOMAINS.includes(parsed.domain) ? parsed.domain : 'other') as Domain,
			year: parsed.year ?? null
		};
	} catch {
		return { title: text, domain: 'other' };
	}
}
