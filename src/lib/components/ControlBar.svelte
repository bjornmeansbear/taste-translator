<script lang="ts">
	import { graph } from '$lib/graph.svelte';
	import { RATINGS } from '$lib/types';

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
		if (!confirm('Clear the whole map? Its saved copy is deleted too.')) return;
		graph.clear();
	}
</script>

{#if graph.nodes.length > 0}
	<div class="control-bar">
		<!-- Exploration name -->
		<span class="exp-name" title={graph.explorationName}>{graph.explorationName}</span>
		<span class="sep" aria-hidden="true">·</span>

		<div class="counts">
			{#each RATINGS as r (r.value)}
				{#if counts[r.value]}
					<span class="chip" title={r.label}>
						<span class="emoji" aria-hidden="true">{r.emoji}</span>
						<span class="visually-hidden">{r.label}</span>
						<span class="n">{counts[r.value]}</span>
					</span>
				{/if}
			{/each}
			<span class="chip muted">{counts.total} nodes</span>
		</div>

		<label class="toggle">
			<input type="checkbox" class="visually-hidden" bind:checked={graph.showExiled} />
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
	/* Mobile first: a full-width bar along the bottom edge. From tablet up it
	   shrinks to its content at the bottom left. */
	.control-bar {
		position: fixed;
		bottom: 1rem;
		left: 1rem;
		right: 1rem;
		z-index: 30;
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem 0.75rem;
		align-items: center;
		padding: 0.375rem 0.75rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		font-size: var(--text-xs);
		line-height: var(--leading-xs);
		color: var(--color-text);
	}
	@media (min-width: 40rem) {
		.control-bar {
			right: auto;
			flex-wrap: nowrap;
			max-width: calc(100vw - 12rem);
		}
	}

	.exp-name,
	.sep {
		display: none;
	}
	@media (min-width: 40rem) {
		.exp-name,
		.sep {
			display: inline;
		}
	}

	.exp-name {
		font-family: var(--font-display);
		font-style: italic;
		font-size: var(--text-sm);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 11.25rem;
		flex-shrink: 1;
	}

	.sep {
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.counts {
		display: flex;
		gap: 0.375rem;
		align-items: center;
		flex-shrink: 0;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		font-feature-settings: 'tnum';
	}
	.chip.muted {
		border-color: transparent;
		color: var(--color-text-muted);
	}

	/* Switch: a real checkbox under a pill track. On = inverted (ink track,
	   ground thumb), like a pressed button — not an accent fill. */
	.toggle {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		user-select: none;
		flex-shrink: 0;
	}
	.track {
		width: 2rem;
		height: 1.125rem;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: var(--color-bg);
		position: relative;
	}
	.thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 0.75rem;
		height: 0.75rem;
		background: var(--color-text);
		border-radius: 999px;
		transition: transform 150ms ease;
	}
	.toggle input:checked + .track {
		background: var(--color-text);
	}
	.toggle input:checked + .track .thumb {
		transform: translateX(0.875rem);
		background: var(--color-bg);
	}
	.toggle input:focus-visible + .track {
		outline: 0.25rem solid var(--color-accent);
		outline-offset: 2px;
	}
	@media (prefers-reduced-motion: reduce) {
		.thumb {
			transition: none;
		}
	}

	.new-exp,
	.reset {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		color: var(--color-text);
		padding: 0.1875rem 0.75rem;
		font-size: var(--text-xs);
		line-height: var(--leading-xs);
		cursor: pointer;
		flex-shrink: 0;
	}
	.new-exp:hover,
	.reset:hover {
		background: var(--color-tint);
	}
	.new-exp:active,
	.reset:active {
		background: var(--color-text);
		color: var(--color-bg);
	}
	/* Reset is destructive: it says so in the danger ink. */
	.reset {
		color: var(--color-danger);
		border-color: var(--color-danger);
	}
	.reset:active {
		background: var(--color-danger);
		border-color: var(--color-danger);
	}
</style>
