<script lang="ts">
	import { browser } from '$app/environment';
	import Canvas from '$lib/components/Canvas.svelte';
	import SeedInput from '$lib/components/SeedInput.svelte';
	import ControlBar from '$lib/components/ControlBar.svelte';
	import NodeList from '$lib/components/NodeList.svelte';
	import ExplorationPicker from '$lib/components/ExplorationPicker.svelte';
	import { graph } from '$lib/graph.svelte';
	import { listExplorations } from '$lib/storage';
	import type { Domain, Recommendation, Bridge } from '$lib/types';

	let loading = $state(false);
	let error = $state<string | null>(null);

	// Show picker on load if there are saved explorations
	let showPicker = $state(browser && listExplorations().length > 0);

	function handleResume(id: string) {
		graph.load(id);
		showPicker = false;
	}

	function handleNew() {
		graph.startNew();
		showPicker = false;
	}

	// ─── Auto-save ───────────────────────────────────────────────────────────
	// Debounced on every edit (graph.revision), plus a final save on leaving so
	// the latest positions stick.
	let saveTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		graph.revision;
		if (!browser || !graph.explorationId || graph.nodes.length === 0) return;
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			graph.save();
			saveTimer = null;
		}, 2000);
	});

	// ─── Translation ─────────────────────────────────────────────────────────
	type TranslateResponse = {
		seedDomain?: Domain | null;
		seedCreator?: string;
		seedImageUrl?: string | null;
		dna: string;
		recommendations: (Recommendation & { imageUrl?: string | null })[];
		bridges?: Bridge[];
	};

	/** POST to /api/translate with the user's taste so far; owns loading + error. */
	async function requestTranslation(body: Record<string, unknown>): Promise<TranslateResponse | null> {
		loading = true;
		error = null;
		try {
			const res = await fetch('/api/translate', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					loves: graph.lovedTitles(),
					dislikes: graph.dislikedTitles(),
					avoidTitles: graph.allTitles(),
					...body
				})
			});
			if (!res.ok) {
				const text = await res.text();
				let msg = text || 'translation failed';
				try {
					msg = JSON.parse(text).message ?? msg;
				} catch {
					/* not json */
				}
				throw new Error(msg);
			}
			return (await res.json()) as TranslateResponse;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong';
			console.error(e);
			return null;
		} finally {
			loading = false;
		}
	}

	/** Expand an existing card: more recommendations, and bridges to the rest of the map. */
	async function translate(seedId: string) {
		const seed = graph.byId.get(seedId);
		if (!seed) return;
		graph.loadingId = seedId;
		const data = await requestTranslation({
			seedTitle: seed.title,
			seedCreator: seed.creator,
			seedDomain: seed.domain,
			classify: false,
			findBridges: true,
			existingItems: graph.allTitles().filter((t) => t !== seed.title)
		});
		graph.loadingId = null;
		if (!data) return;
		graph.dna[seed.id] = data.dna;
		graph.ingestRecommendations(seed.id, data.recommendations);
		if (data.bridges?.length) graph.ingestBridges(seed.id, data.bridges);
	}

	/** Add a typed seed to the map (starting an exploration if there isn't one). */
	async function submitSeed(text: string) {
		if (!graph.explorationId) graph.startNew();
		const isFirstSeed = graph.nodes.length === 0;
		const data = await requestTranslation({
			seedTitle: text,
			classify: true,
			existingItems: graph.allTitles(),
			findBridges: !isFirstSeed,
			fetchSeedThumb: true
		});
		if (!data) return;

		const pos = placementForNewSeed();
		const seed = graph.add({
			title: text,
			creator: data.seedCreator,
			domain: data.seedDomain ?? 'other',
			year: null,
			reason: data.dna,
			imageUrl: data.seedImageUrl ?? null,
			rating: isFirstSeed ? 'love' : null,
			x: pos.x,
			y: pos.y,
			parentId: null,
			depth: 0,
			seed: true
		});
		graph.dna[seed.id] = data.dna;
		graph.ingestRecommendations(seed.id, data.recommendations);
		if (!isFirstSeed && data.bridges?.length) graph.ingestBridges(seed.id, data.bridges);
	}

	function placementForNewSeed() {
		if (graph.nodes.length === 0) return { x: 0, y: 0 };
		let cx = 0, cy = 0, maxR = 0;
		for (const n of graph.nodes) {
			cx += n.x;
			cy += n.y;
			const r = Math.sqrt(n.x * n.x + n.y * n.y);
			if (r > maxR) maxR = r;
		}
		cx /= graph.nodes.length;
		cy /= graph.nodes.length;
		const angle = Math.random() * Math.PI * 2;
		const dist = maxR + 380 + Math.random() * 120;
		return { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist };
	}

	const isCentered = $derived(graph.nodes.length === 0);
</script>

<svelte:window onpagehide={() => graph.save()} />

<svelte:head>
	<title>Taste Translator</title>
</svelte:head>

{#if showPicker}
	<ExplorationPicker onResume={handleResume} onNew={handleNew} />
{/if}

<Canvas onExpand={translate} />

<SeedInput {loading} onSubmit={submitSeed} centered={isCentered} {error} />

<ControlBar onNewExploration={() => (showPicker = true)} />

<NodeList />

{#if loading}
	<div class="translating" aria-live="polite">
		<span class="dot" aria-hidden="true"></span>
		<span class="dot" aria-hidden="true"></span>
		<span class="dot" aria-hidden="true"></span>
		<span class="txt">reading aesthetic DNA…</span>
	</div>
{/if}

<style>
	.translating {
		position: fixed;
		bottom: 7.5rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 40;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 1rem;
		background: var(--color-bg);
		border: 1px solid var(--color-accent);
		border-radius: 999px;
		white-space: nowrap;
		font-size: var(--text-sm);
		line-height: var(--leading-sm);
	}
	@media (min-width: 40rem) {
		.translating {
			bottom: 4.5rem;
		}
	}
	.dot {
		width: 0.375rem;
		height: 0.375rem;
		border-radius: 999px;
		background: var(--color-accent);
		animation: pulse 1.4s infinite ease-in-out both;
	}
	.dot:nth-child(2) {
		animation-delay: 0.2s;
	}
	.dot:nth-child(3) {
		animation-delay: 0.4s;
	}
	@keyframes pulse {
		0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
		40% { transform: scale(1); opacity: 1; }
	}
	@media (prefers-reduced-motion: reduce) {
		.dot {
			animation: none;
		}
	}
	.txt {
		font-style: italic;
		font-family: var(--font-display);
	}
</style>
