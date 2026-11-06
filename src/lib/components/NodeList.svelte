<script lang="ts">
	import { graph } from '$lib/graph.svelte';
	import { collection, asText, asMarkdown } from '$lib/collection.svelte';
	import { findLinks, bookshopAffiliateId } from '$lib/links';
	import { domainOf, ratingFor } from '$lib/types';

	let open = $state(false);
	let tab = $state<'all' | 'kept'>('all');
	let copied = $state(false);

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

	function removeNode(id: string, title: string) {
		if (!confirm(`Remove "${title}" from this map?`)) return;
		graph.remove(id);
	}

	async function copyList() {
		try {
			await navigator.clipboard.writeText(asText(collection.items));
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			alert("Couldn't copy here. Try Download instead.");
		}
	}

	function downloadList() {
		const blob = new Blob([asMarkdown(collection.items)], { type: 'text/markdown' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `wjunderkammer-finds-${new Date().toISOString().slice(0, 10)}.md`;
		a.click();
		URL.revokeObjectURL(a.href);
	}
</script>

<!-- Toggle button -->
<button
	class="list-toggle"
	class:is-open={open}
	onclick={() => (open = !open)}
	title={open ? 'Close the list' : 'All nodes and kept finds'}
	aria-label={open ? 'Close the list' : 'All nodes and kept finds'}
	aria-expanded={open}
>
	<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
		<path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
	</svg>
	{#if collection.items.length > 0 && !open}
		<span class="kept-count" aria-hidden="true">{collection.items.length}</span>
	{/if}
</button>

{#if open}
	<div class="node-list">
		<div class="tabs" role="tablist" aria-label="Lists">
			<button
				role="tab"
				class="tab"
				aria-selected={tab === 'all'}
				aria-controls="list-panel"
				onclick={() => (tab = 'all')}
			>
				All nodes <span class="tab-count">{graph.nodes.length}</span>
			</button>
			<button
				role="tab"
				class="tab"
				aria-selected={tab === 'kept'}
				aria-controls="list-panel"
				onclick={() => (tab = 'kept')}
			>
				Kept <span class="tab-count">{collection.items.length}</span>
			</button>
		</div>

		<div class="list-scroll" id="list-panel" role="tabpanel">
			{#if tab === 'all'}
				<ul class="rows">
					{#each sorted as node (node.id)}
						{@const isSeed = node.parentId === null}
						{@const kept = collection.has(node)}
						<li class="row" class:is-seed={isSeed} class:is-exiled={node.rating === 'exile' && !graph.showExiled}>
							<button class="row-main" onclick={() => focusNode(node.id)} title="Show on the map">
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
							<button
								class="row-btn keep-btn"
								class:is-kept={kept}
								onclick={() => collection.toggle(node)}
								aria-pressed={kept}
								aria-label={kept ? `Unkeep ${node.title}` : `Keep ${node.title}`}
								title={kept ? 'Kept: tap to unkeep' : 'Keep'}
							>
								{kept ? '★' : '☆'}
							</button>
							<button
								class="row-btn"
								onclick={() => removeNode(node.id, node.title)}
								aria-label="Remove {node.title} from the map"
								title="Remove from the map"
							>
								✕
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<div class="kept-intro">
					<p>
						Wjunderkammer is for finding things. Keep the ones that catch your eye, then take the list with you
						to your notes, a reading list or wherever you keep things.
					</p>
					<p class="muted">
						Your list is saved only in this browser: no account, nothing sent anywhere. Clearing your browser data
						clears it.
					</p>
					{#if collection.items.length > 0}
						<div class="export">
							<button class="export-btn" onclick={copyList}>{copied ? 'Copied' : 'Copy as text'}</button>
							<button class="export-btn" onclick={downloadList}>Download Markdown</button>
						</div>
						<p class="visually-hidden" aria-live="polite">{copied ? 'List copied' : ''}</p>
					{/if}
				</div>

				{#if collection.items.length === 0}
					<p class="empty">Nothing kept yet. Tap ☆ on a card, or in All nodes, to keep it.</p>
				{:else}
					<ul class="rows">
						{#each collection.items as item (item.key)}
							<li class="kept-row">
								<div class="kept-head">
									<span class="item-emoji" aria-hidden="true">{domainOf(item.domain).emoji}</span>
									<span class="item-body">
										<span class="item-title wrap">{item.title}</span>
										<span class="item-creator">
											{[item.creator, item.year].filter(Boolean).join(', ') || domainOf(item.domain).label}
										</span>
									</span>
									<button
										class="row-btn"
										onclick={() => collection.remove(item.key)}
										aria-label="Unkeep {item.title}"
										title="Unkeep"
									>
										✕
									</button>
								</div>
								<div class="links">
									{#each findLinks(item) as link (link.url)}
										<a href={link.url} target="_blank" rel="noopener noreferrer{link.affiliate ? ' sponsored' : ''}"
											>{link.label}</a
										>
									{/each}
								</div>
							</li>
						{/each}
					</ul>
					{#if bookshopAffiliateId}
						<p class="disclosure">
							Book links go to Bookshop.org, which supports independent bookstores. Wjunderkammer earns a small
							commission on books bought through them.
						</p>
					{/if}
				{/if}
			{/if}
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
	/* How many finds are kept: a badge-scale pill, so it may be round. */
	.kept-count {
		position: absolute;
		top: -0.5rem;
		right: -0.5rem;
		min-width: 1.125rem;
		padding: 0 0.25rem;
		border-radius: 999px;
		background: var(--color-accent);
		color: var(--color-bg);
		font-size: var(--text-2xs);
		line-height: 1.125rem;
		font-weight: bold;
		text-align: center;
		font-feature-settings: 'tnum';
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
			width: 19.5rem;
		}
	}

	.tabs {
		display: flex;
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}
	.tab {
		flex: 1;
		padding: 0.5625rem 0.75rem;
		background: transparent;
		border: none;
		color: var(--color-text);
		cursor: pointer;
		font-size: var(--text-xs);
		line-height: var(--leading-xs);
		font-weight: bold;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		text-align: left;
	}
	.tab + .tab {
		border-left: 1px solid var(--color-border);
	}
	.tab:hover {
		background: var(--color-tint);
	}
	/* The open tab is held down: inverted, like the other pressed controls. */
	.tab[aria-selected='true'] {
		background: var(--color-text);
		color: var(--color-bg);
	}
	.tab:focus-visible {
		outline-offset: -0.25rem;
	}
	.tab-count {
		font-weight: normal;
		letter-spacing: 0;
		font-feature-settings: 'tnum';
	}

	.list-scroll {
		overflow-y: auto;
		flex: 1;
		scrollbar-width: thin;
		scrollbar-color: var(--color-text-muted) transparent;
	}

	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.row {
		display: flex;
		align-items: stretch;
	}
	.row + .row,
	.kept-row + .kept-row {
		border-top: 1px solid var(--color-tint);
	}

	.row-main {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.25rem 0.375rem 0.75rem;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		color: var(--color-text);
	}
	.row-main:hover,
	.row-btn:hover {
		background: var(--color-tint);
	}
	.row-main:focus-visible,
	.row-btn:focus-visible {
		outline-offset: -0.25rem;
	}
	.row.is-exiled .item-title {
		color: var(--color-text-muted);
		text-decoration: line-through;
	}

	/* Keep and Remove: square, at least 36px tall for a thumb. */
	.row-btn {
		flex-shrink: 0;
		width: 2.25rem;
		min-height: 2.25rem;
		background: transparent;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		font-size: var(--text-sm);
	}
	.keep-btn {
		color: var(--color-text);
	}
	.keep-btn.is-kept {
		color: var(--color-accent);
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
	.item-title.wrap {
		white-space: normal;
	}
	.row.is-seed .item-title {
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

	/* ── Kept tab ── */
	.kept-intro {
		padding: 0.75rem;
		border-bottom: 1px solid var(--color-border);
		font-size: var(--text-xs);
		line-height: var(--leading-xs);
	}
	.kept-intro p {
		margin: 0;
	}
	.kept-intro p + p {
		margin-top: 0.375rem;
	}
	.muted {
		color: var(--color-text-muted);
	}

	.export {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-top: 0.75rem;
	}
	.export-btn {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		color: var(--color-text);
		padding: 0.25rem 0.75rem;
		min-height: 2.25rem;
		font-size: var(--text-xs);
		line-height: var(--leading-xs);
		cursor: pointer;
	}
	.export-btn:hover {
		background: var(--color-tint);
	}
	.export-btn:active {
		background: var(--color-text);
		color: var(--color-bg);
	}

	.empty {
		margin: 0;
		padding: 0.75rem;
		font-size: var(--text-sm);
		line-height: var(--leading-sm);
		color: var(--color-text-muted);
	}

	.kept-row {
		padding: 0.375rem 0 0.5rem 0.75rem;
	}
	.kept-head {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}
	.kept-head .item-emoji {
		padding-top: 0.125rem;
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 0 0.75rem;
		padding: 0.125rem 0.75rem 0 1.625rem;
		font-size: var(--text-xs);
		line-height: var(--leading-xs);
	}
	.links a {
		color: var(--color-text);
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}
	.links a:hover {
		color: var(--color-accent);
	}

	.disclosure {
		margin: 0;
		padding: 0.75rem;
		border-top: 1px solid var(--color-border);
		font-size: var(--text-2xs);
		line-height: var(--leading-2xs);
		color: var(--color-text-muted);
	}
</style>
