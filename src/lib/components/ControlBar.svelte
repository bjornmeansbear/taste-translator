<script lang="ts">
	import { graph } from '$lib/graph.svelte';
	import { RATINGS } from '$lib/types';
	import { listExplorations } from '$lib/storage';

	type Props = {
		onNewExploration?: () => void;
	};
	let { onNewExploration }: Props = $props();

	const counts = $derived.by(() => {
		const c: Record<string, number> = { total: graph.nodes.length };
		for (const r of RATINGS) c[r.value] = 0;
		for (const n of graph.nodes) {
			if (n.rating) c[n.rating] = (c[n.rating] ?? 0) + 1;
		}
		return c;
	});

	function reset() {
		if (!confirm('Clear the whole map?')) return;
		graph.nodes = [];
		graph.edges = [];
		graph.dna = {};
	}
</script>

{#if graph.nodes.length > 0}
	<div class="control-bar">
		<!-- Exploration name -->
		<span class="exp-name" title={graph.explorationName}>{graph.explorationName}</span>
		<span class="sep">·</span>

		<div class="counts">
			{#each RATINGS as r (r.value)}
				{#if counts[r.value]}
					<span class="chip" title={r.label}>
						<span class="emoji">{r.emoji}</span>
						<span class="n">{counts[r.value]}</span>
					</span>
				{/if}
			{/each}
			<span class="chip muted">{counts.total} nodes</span>
		</div>

		<label class="toggle">
			<input type="checkbox" bind:checked={graph.showExiled} />
			<span class="track"><span class="thumb"></span></span>
			<span class="lbl">Show Exiled</span>
		</label>

		{#if onNewExploration}
			<button class="new-exp" onclick={onNewExploration} title="Start a new exploration">New</button>
		{/if}

		<button class="reset" onclick={reset} title="Reset map">Reset</button>
	</div>
{/if}

<style>
	.control-bar {
		position: fixed;
		bottom: 20px;
		left: 22px;
		z-index: 30;
		display: flex;
		gap: 14px;
		align-items: center;
		padding: 8px 12px;
		border-radius: 999px;
		background: rgba(10, 9, 20, 0.75);
		backdrop-filter: blur(18px);
		border: 1px solid rgba(255, 255, 255, 0.07);
		box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.6);
		font-size: 12px;
		color: rgba(226, 232, 240, 0.85);
		max-width: calc(100vw - 200px);
	}

	.exp-name {
		font-family: 'Fraunces', ui-serif, Georgia, serif;
		font-size: 12px;
		color: rgba(248, 250, 252, 0.75);
		font-style: italic;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 180px;
		flex-shrink: 1;
	}

	.sep {
		color: rgba(148, 163, 184, 0.3);
		flex-shrink: 0;
	}

	.counts {
		display: flex;
		gap: 6px;
		align-items: center;
		flex-shrink: 0;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.04);
		font-size: 11px;
	}
	.chip .emoji {
		font-size: 11px;
	}
	.chip.muted {
		color: rgba(148, 163, 184, 0.6);
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		user-select: none;
		flex-shrink: 0;
	}
	.toggle input {
		display: none;
	}
	.track {
		width: 32px;
		height: 18px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.1);
		position: relative;
		transition: background 200ms ease;
	}
	.thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 14px;
		height: 14px;
		background: rgba(226, 232, 240, 0.9);
		border-radius: 50%;
		transition: transform 200ms ease, background 200ms ease;
	}
	.toggle input:checked + .track {
		background: rgba(167, 139, 250, 0.6);
	}
	.toggle input:checked + .track .thumb {
		transform: translateX(14px);
		background: white;
	}

	.new-exp {
		background: transparent;
		border: 1px solid rgba(125, 211, 252, 0.25);
		color: rgba(125, 211, 252, 0.75);
		border-radius: 999px;
		padding: 3px 10px;
		font-size: 11px;
		cursor: pointer;
		transition: border-color 200ms ease, color 200ms ease;
		flex-shrink: 0;
	}
	.new-exp:hover {
		border-color: rgba(125, 211, 252, 0.6);
		color: rgba(125, 211, 252, 0.95);
	}

	.reset {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(226, 232, 240, 0.7);
		border-radius: 999px;
		padding: 3px 10px;
		font-size: 11px;
		cursor: pointer;
		transition: border-color 200ms ease, color 200ms ease;
		flex-shrink: 0;
	}
	.reset:hover {
		border-color: rgba(251, 146, 146, 0.6);
		color: rgba(251, 146, 146, 0.9);
	}
</style>
