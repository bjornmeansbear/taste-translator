<script lang="ts">
	import { listExplorations, deleteExploration, formatRelativeTime } from '$lib/storage';
	import type { ExplorationMeta } from '$lib/storage';

	type Props = {
		onResume: (id: string) => void;
		onNew: () => void;
	};

	let { onResume, onNew }: Props = $props();

	let explorations = $state<ExplorationMeta[]>(listExplorations());

	function handleDelete(e: MouseEvent, id: string) {
		e.stopPropagation();
		if (!confirm('Delete this exploration?')) return;
		deleteExploration(id);
		explorations = listExplorations();
		// If that was the last one, dismiss and start new
		if (explorations.length === 0) onNew();
	}

</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label="Your explorations">
	<div class="picker">
		<div class="picker-header">
			<h2 class="picker-title">
				<span class="mark" aria-hidden="true">◉</span>
				Your Explorations
			</h2>
			<p class="picker-sub">Pick up where you left off, or start something new.</p>
		</div>

		<div class="explorations">
			{#each explorations as exp (exp.id)}
				<!-- Using div+role to allow a nested button for delete -->
				<div
					class="exp-card"
					role="button"
					tabindex="0"
					onclick={() => onResume(exp.id)}
					onkeydown={(e) => e.key === 'Enter' && onResume(exp.id)}
				>
					<div class="exp-body">
						<div class="exp-name">{exp.name}</div>
						<div class="exp-meta">
							<span>{exp.nodeCount} nodes</span>
							<span aria-hidden="true">·</span>
							<span>{formatRelativeTime(exp.updatedAt)}</span>
						</div>
					</div>
					<button
						class="del-btn"
						onclick={(e) => handleDelete(e, exp.id)}
						title="Delete exploration"
						aria-label="Delete {exp.name}"
					>
						<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
							<path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
						</svg>
					</button>
				</div>
			{/each}
		</div>

		<button class="new-btn" onclick={onNew}>
			<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
				<path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
			</svg>
			New exploration
		</button>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: var(--color-overlay);
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.picker {
		width: min(30rem, 100%);
		background: var(--color-bg);
		border: 2px solid var(--color-border);
		padding: 1.5rem;
	}
	@media (min-width: 40rem) {
		.picker {
			padding: 2.25rem;
		}
	}

	.picker-header {
		margin-bottom: 1.5rem;
	}

	.picker-title {
		display: flex;
		align-items: baseline;
		gap: 0.625rem;
		font-family: var(--font-display);
		font-size: var(--text-lg);
		line-height: var(--leading-lg);
		font-weight: 600;
		margin: 0 0 0.375rem;
	}

	.mark {
		color: var(--color-accent);
	}

	.picker-sub {
		font-family: var(--font-display);
		font-style: italic;
		font-size: var(--text-sm);
		line-height: var(--leading-sm);
		color: var(--color-text-muted);
		margin: 0;
	}

	/* A ruled list: the rows share borders instead of floating as cards. */
	.explorations {
		display: flex;
		flex-direction: column;
		border-top: 1px solid var(--color-border);
		margin-bottom: 1.5rem;
		max-height: 22.5rem;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--color-text-muted) transparent;
	}

	.exp-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem 0.25rem 0.75rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
		cursor: pointer;
		text-align: left;
	}
	.exp-card:hover {
		background: var(--color-tint);
	}
	.exp-card:focus-visible {
		outline-offset: -0.25rem;
	}

	.exp-body {
		flex: 1;
		min-width: 0;
	}

	.exp-name {
		font-family: var(--font-display);
		font-size: var(--text-base);
		line-height: var(--leading-base);
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.exp-meta {
		font-size: var(--text-xs);
		line-height: var(--leading-xs);
		color: var(--color-text-muted);
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	/* 44px touch target, drawn small. */
	.del-btn {
		flex-shrink: 0;
		width: 2.75rem;
		height: 2.75rem;
		border: 1px solid transparent;
		background: transparent;
		color: var(--color-text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	.del-btn:hover {
		color: var(--color-danger);
		border-color: var(--color-danger);
	}
	.del-btn:active {
		background: var(--color-danger);
		color: var(--color-bg);
	}

	.new-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.6875rem;
		background: var(--color-accent);
		border: 1px solid var(--color-accent);
		color: var(--color-bg);
		font-size: var(--text-base);
		line-height: var(--leading-base);
		font-weight: bold;
		cursor: pointer;
	}
	.new-btn:active {
		background: var(--color-accent-hover);
		border-color: var(--color-accent-hover);
	}
</style>
