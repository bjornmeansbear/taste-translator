<script lang="ts">
	import { graph } from '$lib/graph.svelte';
	import { domainOf, ratingFor } from '$lib/types';

	let open = $state(false);


	const sorted = $derived(
		[...graph.nodes].sort((a, b) => {
			// Seeds first, then alphabetical
			if ((a.parentId === null) !== (b.parentId === null)) return a.parentId === null ? -1 : 1;
			return a.title.localeCompare(b.title);
		})
	);

	function focusNode(id: string) {
		graph.focusId = id;
	}

</script>

<!-- Toggle button -->
<button
	class="list-toggle"
	class:is-open={open}
	onclick={() => (open = !open)}
	title={open ? 'Close node list' : 'Show all nodes'}
	aria-label={open ? 'Close node list' : 'Show all nodes'}
	aria-expanded={open}
>
	<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
		<path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
	</svg>
</button>

{#if open}
	<div class="node-list" role="listbox" aria-label="All nodes">
		<div class="list-header">
			<span class="list-title">All Nodes</span>
			<span class="list-count">{graph.nodes.length}</span>
		</div>
		<div class="list-scroll">
			{#each sorted as node (node.id)}
				{@const isSeed = node.parentId === null}
				<button
					class="list-item"
					class:is-seed={isSeed}
					class:is-exiled={node.rating === 'exile' && !graph.showExiled}
					onclick={() => focusNode(node.id)}
					role="option"
					aria-selected="false"
				>
					<span class="item-emoji" aria-hidden="true">{domainOf(node.domain).emoji}</span>
					<span class="item-body">
						<span class="item-title">{node.title}</span>
						{#if node.creator}
							<span class="item-creator">{node.creator}</span>
						{/if}
					</span>
					{#if node.rating}
						<span class="item-rating" title={ratingFor(node.rating)?.label}>{ratingFor(node.rating)?.emoji}</span>
					{/if}
					{#if isSeed}
						<span class="seed-badge">seed</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>
{/if}

<style>
	.list-toggle {
		position: fixed;
		top: 1rem;
		right: 1rem;
		width: 2.25rem;
		height: 2.25rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		color: var(--color-text);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 35;
	}
	.list-toggle:hover {
		background: var(--color-tint);
	}
	/* Open = held down: inverted. */
	.list-toggle.is-open {
		background: var(--color-text);
		color: var(--color-bg);
	}

	/* Mobile: the panel spans the gutters. Tablet up: a fixed-width column. */
	.node-list {
		position: fixed;
		top: 3.75rem;
		right: 1rem;
		left: 1rem;
		max-height: calc(100vh - 9rem);
		display: flex;
		flex-direction: column;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		z-index: 34;
	}
	@media (min-width: 40rem) {
		.node-list {
			left: auto;
			width: 17.25rem;
		}
	}

	.list-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 0.5625rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.list-title {
		font-size: var(--text-xs);
		line-height: var(--leading-xs);
		font-weight: bold;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.list-count {
		font-size: var(--text-xs);
		line-height: var(--leading-xs);
		color: var(--color-text-muted);
		font-feature-settings: 'tnum';
	}

	.list-scroll {
		overflow-y: auto;
		flex: 1;
		scrollbar-width: thin;
		scrollbar-color: var(--color-text-muted) transparent;
	}

	.list-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.375rem 0.75rem;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		color: var(--color-text);
	}
	.list-item + .list-item {
		border-top: 1px solid var(--color-tint);
	}
	.list-item:hover {
		background: var(--color-tint);
	}
	.list-item:focus-visible {
		outline-offset: -0.25rem;
	}
	.list-item.is-exiled .item-title {
		color: var(--color-text-muted);
		text-decoration: line-through;
	}

	.item-emoji {
		font-size: var(--text-sm);
		flex-shrink: 0;
		width: 1.125rem;
		text-align: center;
	}

	.item-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.item-title {
		font-family: var(--font-display);
		font-size: var(--text-sm);
		line-height: var(--leading-sm);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.list-item.is-seed .item-title {
		font-weight: 600;
	}

	.item-creator {
		font-size: var(--text-2xs);
		line-height: var(--leading-2xs);
		color: var(--color-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-style: italic;
	}

	.item-rating {
		font-size: var(--text-sm);
		flex-shrink: 0;
	}

	.seed-badge {
		font-size: var(--text-2xs);
		line-height: var(--leading-2xs);
		font-weight: bold;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		padding: 0 0.5rem;
		flex-shrink: 0;
	}
</style>
