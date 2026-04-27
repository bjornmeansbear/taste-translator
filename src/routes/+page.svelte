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
	let saveTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		// Track any change by referencing length + edge count
		const _n = graph.nodes.length;
		const _e = graph.edges.length;
		if (!browser || !graph.explorationId || graph.nodes.length === 0) return;
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			graph.save();
			saveTimer = null;
		}, 2000);
	});

	// ─── Translation ─────────────────────────────────────────────────────────
	async function translate(seedId: string) {
		const seed = graph.nodes.find((n) => n.id === seedId);
		if (!seed) return;
		loading = true;
		error = null;
		graph.loadingId = seedId;
		try {
			const res = await fetch('/api/translate', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					seedTitle: seed.title,
					seedCreator: seed.creator,
					seedDomain: seed.domain,
					classify: false,
					loves: graph.lovedTitles(),
					dislikes: graph.dislikedTitles(),
					avoidTitles: graph.allTitles(),
					findBridges: true,
					existingItems: graph.allTitles().filter((t) => t !== seed.title)
				})
			});
			if (!res.ok) {
				const t = await res.text();
				let msg = t || 'translation failed';
				try { msg = JSON.parse(t).message ?? msg; } catch { /* not json */ }
				throw new Error(msg);
			}
			const data = (await res.json()) as {
				dna: string;
				recommendations: (Recommendation & { imageUrl?: string | null })[];
				bridges?: Bridge[];
			};
			graph.dna[seed.id] = data.dna;
			graph.ingestRecommendations(seed.id, data.recommendations);
			if (data.bridges?.length) graph.ingestBridges(seed.id, data.bridges);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong';
			console.error(e);
		} finally {
			loading = false;
			graph.loadingId = null;
		}
	}

	async function submitSeed(text: string) {
		// Ensure we have an active exploration before adding the first node
		if (!graph.explorationId) graph.startNew();

		loading = true;
		error = null;
		try {
			const isFirstSeed = graph.nodes.length === 0;
			const res = await fetch('/api/translate', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					seedTitle: text,
					classify: true,
					loves: graph.lovedTitles(),
					dislikes: graph.dislikedTitles(),
					avoidTitles: graph.allTitles(),
					existingItems: graph.allTitles(),
					findBridges: !isFirstSeed,
					fetchSeedThumb: true
				})
			});
			if (!res.ok) {
				const t = await res.text();
				let msg = t || 'translation failed';
				try { msg = JSON.parse(t).message ?? msg; } catch { /* not json */ }
				throw new Error(msg);
			}
			const data = (await res.json()) as {
				seedDomain: Domain | null;
				seedCreator?: string;
				seedImageUrl?: string | null;
				dna: string;
				recommendations: (Recommendation & { imageUrl?: string | null })[];
				bridges?: Bridge[];
			};

			const seedPos = placementForNewSeed();
			const seed = graph.add({
				title: text,
				creator: data.seedCreator,
				domain: data.seedDomain ?? 'other',
				year: null,
				reason: data.dna,
				imageUrl: data.seedImageUrl ?? null,
				rating: isFirstSeed ? 'love' : null,
				x: seedPos.x,
				y: seedPos.y,
				parentId: null,
				depth: 0,
				seed: true
			});

			graph.dna[seed.id] = data.dna;
			graph.ingestRecommendations(seed.id, data.recommendations);
			if (!isFirstSeed && data.bridges?.length) {
				graph.ingestBridges(seed.id, data.bridges);
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong';
			console.error(e);
		} finally {
			loading = false;
		}
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
		<span class="dot"></span>
		<span class="dot"></span>
		<span class="dot"></span>
		<span class="txt">reading aesthetic DNA…</span>
	</div>
{/if}

<style>
	.translating {
		position: fixed;
		bottom: 20px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 40;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 18px;
		background: rgba(10, 9, 20, 0.85);
		backdrop-filter: blur(18px);
		border: 1px solid rgba(167, 139, 250, 0.3);
		border-radius: 999px;
		font-size: 12px;
		letter-spacing: 0.1em;
		color: rgba(226, 232, 240, 0.9);
		box-shadow: 0 10px 30px -10px rgba(167, 139, 250, 0.3);
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: rgba(244, 114, 182, 0.9);
		animation: pulse 1.4s infinite ease-in-out both;
	}
	.dot:nth-child(2) {
		animation-delay: 0.2s;
		background: rgba(167, 139, 250, 0.9);
	}
	.dot:nth-child(3) {
		animation-delay: 0.4s;
		background: rgba(125, 211, 252, 0.9);
	}
	@keyframes pulse {
		0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
		40% { transform: scale(1); opacity: 1; }
	}
	.txt {
		font-style: italic;
		font-family: 'Fraunces', ui-serif, Georgia, serif;
	}
</style>
