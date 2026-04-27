import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { translateTaste, classifySeed } from '$lib/server/anthropic';
import { fetchThumb, fetchThumbs } from '$lib/server/thumbnails';
import type { Domain } from '$lib/types';

export const POST: RequestHandler = async ({ request }) => {
	let body: {
		seedTitle?: string;
		seedCreator?: string;
		seedDomain?: Domain | null;
		classify?: boolean;
		loves?: string[];
		dislikes?: string[];
		avoidTitles?: string[];
		existingItems?: string[];
		findBridges?: boolean;
		fetchSeedThumb?: boolean;
	};
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	const seedTitle = (body.seedTitle ?? '').trim();
	if (!seedTitle) throw error(400, 'seedTitle required');

	try {
		let seedDomain = body.seedDomain ?? null;
		let seedCreator = body.seedCreator;

		if (body.classify) {
			const meta = await classifySeed(seedTitle);
			seedDomain = meta.domain;
			seedCreator = seedCreator ?? meta.creator;
		}

		const [result, seedThumb] = await Promise.all([
			translateTaste({
				seedTitle,
				seedCreator,
				seedDomain,
				loves: body.loves ?? [],
				dislikes: body.dislikes ?? [],
				avoidTitles: body.avoidTitles ?? [],
				existingItems: body.existingItems ?? [],
				findBridges: body.findBridges ?? false
			}),
			body.fetchSeedThumb
				? fetchThumb({
						title: seedTitle,
						creator: seedCreator,
						domain: seedDomain ?? undefined
					})
				: Promise.resolve(null)
		]);

		const recThumbs = await fetchThumbs(
			result.recommendations.map((r) => ({
				title: r.title,
				creator: r.creator,
				domain: r.domain
			}))
		);

		return json({
			seedDomain,
			seedCreator,
			seedImageUrl: seedThumb,
			dna: result.dna,
			recommendations: result.recommendations.map((r, i) => ({
				...r,
				imageUrl: recThumbs[i]
			})),
			bridges: result.bridges
		});
	} catch (err) {
		console.error('translate error', err);
		const message = err instanceof Error ? err.message : 'translation failed';
		throw error(500, message);
	}
};
