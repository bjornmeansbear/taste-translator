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

	const domainEmoji: Record<string, string> = {
		film: '🎬', tv: '📺', music: '🎵', book: '📖',
		'visual-art': '🎨', architecture: '🏛', fashion: '👗',
		food: '🍷', game: '🎮', other: '✦'
	};
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label="Your explorations">
	<div class="panel">
		<div class="panel-header">
			<div class="panel-title">
				<span class="mark">◉</span>
				Your Explorations
			</div>
			<p class="panel-sub">Pick up where you left off, or start something new.</p>
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
							<span class="dot">·</span>
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
		background: rgba(5, 4, 14, 0.82);
		backdrop-filter: blur(20px);
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}

	.panel {
		width: min(480px, 100%);
		background: linear-gradient(150deg, rgba(18, 16, 32, 0.96), rgba(10, 9, 20, 0.94));
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 20px;
		padding: 32px;
		box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.9);
	}

	.panel-header {
		margin-bottom: 24px;
	}

	.panel-title {
		display: flex;
		align-items: center;
		gap: 10px;
		font-family: 'Fraunces', ui-serif, Georgia, serif;
		font-size: 22px;
		font-weight: 600;
		color: rgba(248, 250, 252, 0.97);
		margin-bottom: 6px;
	}

	.mark {
		color: rgba(244, 114, 182, 0.9);
		filter: drop-shadow(0 0 8px rgba(244, 114, 182, 0.5));
	}

	.panel-sub {
		font-size: 13px;
		color: rgba(148, 163, 184, 0.65);
		font-style: italic;
		font-family: 'Fraunces', ui-serif, Georgia, serif;
		margin: 0;
	}

	.explorations {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 16px;
		max-height: 360px;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: rgba(255,255,255,0.1) transparent;
	}

	.exp-card {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 14px 16px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 12px;
		cursor: pointer;
		text-align: left;
		transition: background 160ms ease, border-color 160ms ease;
		color: inherit;
	}
	.exp-card:hover {
		background: rgba(167, 139, 250, 0.08);
		border-color: rgba(167, 139, 250, 0.3);
	}

	.exp-body {
		flex: 1;
		min-width: 0;
	}

	.exp-name {
		font-size: 15px;
		font-family: 'Fraunces', ui-serif, Georgia, serif;
		color: rgba(248, 250, 252, 0.95);
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-bottom: 4px;
	}

	.exp-meta {
		font-size: 11px;
		color: rgba(148, 163, 184, 0.55);
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.dot { opacity: 0.5; }

	.del-btn {
		flex-shrink: 0;
		width: 24px;
		height: 24px;
		border-radius: 6px;
		border: 1px solid transparent;
		background: transparent;
		color: rgba(148, 163, 184, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
	}
	.del-btn:hover {
		background: rgba(251, 146, 146, 0.12);
		border-color: rgba(251, 146, 146, 0.3);
		color: rgba(251, 146, 146, 0.9);
	}

	.new-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		padding: 12px;
		background: transparent;
		border: 1px dashed rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		color: rgba(148, 163, 184, 0.65);
		font-size: 13px;
		cursor: pointer;
		transition: border-color 160ms ease, color 160ms ease, background 160ms ease;
		letter-spacing: 0.03em;
	}
	.new-btn:hover {
		border-color: rgba(125, 211, 252, 0.4);
		color: rgba(125, 211, 252, 0.9);
		background: rgba(125, 211, 252, 0.05);
	}
</style>
