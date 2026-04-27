<script lang="ts">
	import { graph } from '$lib/graph.svelte';
	import { RATINGS } from '$lib/types';

	let open = $state(false);

	const domainEmoji: Record<string, string> = {
		film: '🎬',
		tv: '📺',
		music: '🎵',
		book: '📖',
		'visual-art': '🎨',
		architecture: '🏛',
		fashion: '👗',
		food: '🍷',
		game: '🎮',
		other: '✦'
	};

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

	function ratingEmoji(rating: string | null): string {
		if (!rating) return '';
		return RATINGS.find((r) => r.value === rating)?.emoji ?? '';
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
					<span class="item-emoji">{domainEmoji[node.domain] ?? '✦'}</span>
					<span class="item-body">
						<span class="item-title">{node.title}</span>
						{#if node.creator}
							<span class="item-creator">{node.creator}</span>
						{/if}
					</span>
					{#if node.rating}
						<span class="item-rating" title={node.rating}>{ratingEmoji(node.rating)}</span>
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
		top: 20px;
		right: 22px;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: rgba(10, 9, 20, 0.78);
		backdrop-filter: blur(14px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(203, 213, 225, 0.75);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 35;
		transition: border-color 180ms ease, color 180ms ease, background 180ms ease;
	}
	.list-toggle:hover,
	.list-toggle.is-open {
		border-color: rgba(167, 139, 250, 0.5);
		color: rgba(167, 139, 250, 0.95);
		background: rgba(20, 18, 38, 0.9);
	}

	.node-list {
		position: fixed;
		top: 64px;
		right: 22px;
		width: 260px;
		max-height: calc(100vh - 100px);
		display: flex;
		flex-direction: column;
		background: rgba(10, 9, 20, 0.88);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.09);
		border-radius: 14px;
		box-shadow: 0 20px 60px -15px rgba(0, 0, 0, 0.7);
		z-index: 34;
		overflow: hidden;
	}

	.list-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 14px 10px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		flex-shrink: 0;
	}

	.list-title {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(226, 232, 240, 0.6);
	}

	.list-count {
		font-size: 11px;
		color: rgba(148, 163, 184, 0.5);
		font-feature-settings: 'tnum';
	}

	.list-scroll {
		overflow-y: auto;
		flex: 1;
		padding: 6px;
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
	}
	.list-scroll::-webkit-scrollbar {
		width: 4px;
	}
	.list-scroll::-webkit-scrollbar-track {
		background: transparent;
	}
	.list-scroll::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
	}

	.list-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 7px 8px;
		border-radius: 8px;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: background 140ms ease;
		color: inherit;
	}
	.list-item:hover {
		background: rgba(255, 255, 255, 0.05);
	}
	.list-item.is-seed {
		background: rgba(125, 211, 252, 0.05);
	}
	.list-item.is-seed:hover {
		background: rgba(125, 211, 252, 0.1);
	}
	.list-item.is-exiled {
		opacity: 0.35;
	}

	.item-emoji {
		font-size: 13px;
		flex-shrink: 0;
		width: 18px;
		text-align: center;
	}

	.item-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.item-title {
		font-size: 12px;
		color: rgba(248, 250, 252, 0.9);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-family: 'Fraunces', ui-serif, Georgia, serif;
	}
	.list-item.is-seed .item-title {
		font-weight: 600;
	}

	.item-creator {
		font-size: 10px;
		color: rgba(148, 163, 184, 0.55);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-style: italic;
	}

	.item-rating {
		font-size: 12px;
		flex-shrink: 0;
	}

	.seed-badge {
		font-size: 9px;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(125, 211, 252, 0.7);
		border: 1px solid rgba(125, 211, 252, 0.25);
		border-radius: 4px;
		padding: 1px 5px;
		flex-shrink: 0;
	}
</style>
