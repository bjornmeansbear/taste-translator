<script lang="ts">
	import type { Node } from '$lib/types';
	import { RATINGS } from '$lib/types';
	import { graph } from '$lib/graph.svelte';

	type Props = {
		node: Node;
		onExpand: (id: string) => void;
		onConnectStart: (id: string, e: PointerEvent) => void;
		zoom: number;
		isDragging?: boolean;
	};

	let { node, onExpand, onConnectStart, zoom, isDragging = false }: Props = $props();

	let hovered = $state(false);
	let menuOpen = $state(false);

	const ratingInfo = $derived(
		node.rating ? RATINGS.find((r) => r.value === node.rating) : null
	);

	const isExile = $derived(node.rating === 'exile');
	const isCore = $derived(node.rating === 'core');
	const isLove = $derived(node.rating === 'love');
	const isDislike = $derived(node.rating === 'dislike');
	const isSeed = $derived(node.parentId === null);

	const exileVisible = $derived(isExile && graph.showExiled);

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

	const domainLabel: Record<string, string> = {
		film: 'film',
		tv: 'tv',
		music: 'music',
		book: 'book',
		'visual-art': 'art',
		architecture: 'arch',
		fashion: 'fashion',
		food: 'food',
		game: 'game',
		other: 'other'
	};

	function setRating(r: (typeof RATINGS)[number]['value']) {
		graph.rate(node.id, node.rating === r ? null : r);
		menuOpen = false;
	}

	// Debounced close so the pointer can travel from the card edge into the
	// rating menu without triggering a mouseleave dismissal mid-journey.
	let closeTimer: ReturnType<typeof setTimeout> | null = null;

	function scheduleClose() {
		closeTimer = setTimeout(() => {
			hovered = false;
			menuOpen = false;
			closeTimer = null;
		}, 220);
	}

	function cancelClose() {
		if (closeTimer !== null) {
			clearTimeout(closeTimer);
			closeTimer = null;
		}
	}
</script>

<div
	class="node-card"
	class:is-seed={isSeed}
	class:is-core={isCore}
	class:is-love={isLove}
	class:is-dislike={isDislike}
	class:is-exile={isExile}
	class:exile-shown={exileVisible}
	class:hovered
	class:menu-open={menuOpen}
	class:is-dragging={isDragging}
	data-node-id={node.id}
	style="left: {node.x}px; top: {node.y}px;"
	onmouseenter={() => { cancelClose(); hovered = true; }}
	onmouseleave={scheduleClose}
	role="group"
	aria-label={node.title}
>
	<div class="glow"></div>

	<div class="card-inner">
		<div class="top-row">
			{#if node.imageUrl}
				<div class="thumb" style="background-image: url('{node.imageUrl}');" aria-hidden="true"></div>
			{:else}
				<div class="thumb thumb-placeholder" aria-hidden="true">
					{domainEmoji[node.domain] ?? '✦'}
				</div>
			{/if}
			<div class="top-text">
				<div class="domain-row">
					<span class="domain-label">{domainLabel[node.domain] ?? node.domain}</span>
					{#if node.year}
						<span class="domain-year">· {node.year}</span>
					{/if}
				</div>
				<div class="title" title={node.title}>{node.title}</div>
				{#if node.creator}
					<div class="creator">{node.creator}</div>
				{/if}
			</div>
		</div>
		{#if node.reason && hovered}
			<div class="reason">{node.reason}</div>
		{/if}
	</div>

	{#if hovered}
		<button
			class="link-handle"
			title="Drag to connect to another node"
			aria-label="Create connection"
			onpointerdown={(e) => {
				e.stopPropagation();
				onConnectStart(node.id, e);
			}}
		>
			<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
				<path
					d="M3 8 L13 8 M9 4 L13 8 L9 12"
					stroke="currentColor"
					stroke-width="1.6"
					fill="none"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
	{/if}

	{#if ratingInfo}
		<div class="rating-badge" title={ratingInfo.label}>{ratingInfo.emoji}</div>
	{/if}

	{#if hovered}
		<div class="actions">
			<button
				class="act-btn rate-btn"
				onclick={(e) => {
					e.stopPropagation();
					menuOpen = !menuOpen;
				}}
				title="Rate"
				aria-label="Rate this"
			>
				{ratingInfo ? ratingInfo.emoji : '＋'}
			</button>
			<button
				class="act-btn expand-btn"
				onclick={(e) => {
					e.stopPropagation();
					onExpand(node.id);
				}}
				title="Translate from here"
				aria-label="Translate from here"
			>
				↯
			</button>
		</div>
	{/if}

	{#if menuOpen}
		<div class="rating-menu" role="menu">
			{#each RATINGS as r (r.value)}
				<button
					class="rating-opt"
					class:active={node.rating === r.value}
					onclick={(e) => {
						e.stopPropagation();
						setRating(r.value);
					}}
					title={r.label}
				>
					<span class="emoji">{r.emoji}</span>
					<span class="lbl">{r.label}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.node-card {
		position: absolute;
		transform: translate(-50%, -50%);
		width: 200px;
		user-select: none;
		cursor: default;
		transition:
			opacity 700ms ease,
			filter 700ms ease;
		pointer-events: auto;
		z-index: 10;
	}
	.node-card.hovered {
		z-index: 50;
	}
	.node-card.menu-open {
		z-index: 1000;
	}
	.node-card.is-dragging {
		z-index: 200;
		cursor: grabbing !important;
	}
	.node-card.is-dragging .card-inner {
		border-color: rgba(125, 211, 252, 0.5);
		box-shadow:
			0 0 0 1px rgba(125, 211, 252, 0.2) inset,
			0 20px 50px -10px rgba(0, 0, 0, 0.8);
	}

	.card-inner {
		position: relative;
		padding: 14px 16px 14px 16px;
		border-radius: 14px;
		background: linear-gradient(
			150deg,
			rgba(28, 26, 45, 0.82),
			rgba(18, 16, 32, 0.72)
		);
		backdrop-filter: blur(12px) saturate(140%);
		-webkit-backdrop-filter: blur(12px) saturate(140%);
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.05) inset,
			0 10px 30px -12px rgba(0, 0, 0, 0.6);
		z-index: 2;
	}

	.glow {
		position: absolute;
		inset: -6px;
		border-radius: 22px;
		opacity: 0;
		pointer-events: none;
		transition: opacity 500ms ease;
		z-index: 1;
	}

	.is-core .glow {
		opacity: 1;
		background: radial-gradient(
			circle at 50% 50%,
			rgba(244, 114, 182, 0.45),
			rgba(244, 114, 182, 0) 70%
		);
		filter: blur(14px);
	}
	.is-love .glow {
		opacity: 0.75;
		background: radial-gradient(
			circle at 50% 50%,
			rgba(167, 139, 250, 0.4),
			rgba(167, 139, 250, 0) 70%
		);
		filter: blur(12px);
	}
	.is-seed .glow {
		opacity: 0.9;
		background: radial-gradient(
			circle at 50% 50%,
			rgba(125, 211, 252, 0.4),
			rgba(125, 211, 252, 0) 70%
		);
		filter: blur(18px);
	}

	.is-core .card-inner {
		border-color: rgba(244, 114, 182, 0.55);
		box-shadow:
			0 0 0 1px rgba(244, 114, 182, 0.3) inset,
			0 10px 40px -10px rgba(244, 114, 182, 0.45);
	}
	.is-love .card-inner {
		border-color: rgba(167, 139, 250, 0.45);
	}
	.is-seed .card-inner {
		border-color: rgba(125, 211, 252, 0.45);
		box-shadow:
			0 0 0 1px rgba(125, 211, 252, 0.25) inset,
			0 10px 40px -10px rgba(125, 211, 252, 0.45);
	}

	.is-dislike {
		opacity: 0.45;
		filter: grayscale(0.6);
	}
	.is-exile {
		opacity: 0;
		pointer-events: none;
		filter: grayscale(1) blur(3px);
	}
	.is-exile.exile-shown {
		opacity: 0.15;
		pointer-events: auto;
		filter: grayscale(1) blur(0.5px);
	}

	.hovered .card-inner {
		border-color: rgba(255, 255, 255, 0.2);
	}

	.top-row {
		display: flex;
		gap: 10px;
		align-items: flex-start;
	}

	.top-text {
		flex: 1;
		min-width: 0;
	}

	.thumb {
		width: 42px;
		height: 42px;
		border-radius: 8px;
		background-color: rgba(255, 255, 255, 0.04);
		background-size: cover;
		background-position: center;
		flex-shrink: 0;
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.6);
	}
	.is-seed .thumb {
		width: 48px;
		height: 48px;
	}
	.thumb-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		color: rgba(226, 232, 240, 0.45);
		background:
			radial-gradient(circle at 30% 30%, rgba(167, 139, 250, 0.15), rgba(255, 255, 255, 0.02) 70%);
	}

	.domain-row {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 10px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(226, 232, 240, 0.55);
		margin-bottom: 4px;
	}

	.title {
		font-family: 'Fraunces', ui-serif, Georgia, serif;
		font-size: 15px;
		line-height: 1.2;
		color: rgba(248, 250, 252, 0.95);
		font-weight: 500;
		letter-spacing: 0.01em;
	}

	.is-seed .title {
		font-size: 17px;
		font-weight: 600;
	}

	.creator {
		font-size: 11px;
		color: rgba(203, 213, 225, 0.6);
		margin-top: 3px;
		font-style: italic;
	}

	.reason {
		margin-top: 10px;
		padding-top: 10px;
		border-top: 1px solid rgba(255, 255, 255, 0.07);
		font-size: 11px;
		line-height: 1.45;
		color: rgba(226, 232, 240, 0.75);
	}

	.link-handle {
		position: absolute;
		top: 50%;
		right: -16px;
		transform: translateY(-50%);
		width: 26px;
		height: 26px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.18);
		background: rgba(28, 26, 45, 0.95);
		color: rgba(226, 232, 240, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: crosshair;
		z-index: 6;
		box-shadow: 0 4px 14px -4px rgba(0, 0, 0, 0.7);
		transition: transform 120ms ease, border-color 160ms ease, background 160ms ease;
	}
	.link-handle:hover {
		transform: translateY(-50%) scale(1.08);
		border-color: rgba(125, 211, 252, 0.8);
		background: rgba(42, 38, 62, 0.95);
		color: rgba(125, 211, 252, 1);
	}

	.rating-badge {
		position: absolute;
		top: -8px;
		right: -8px;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: rgba(18, 16, 32, 0.9);
		border: 1px solid rgba(255, 255, 255, 0.15);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		z-index: 3;
	}

	.actions {
		position: absolute;
		bottom: -14px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 6px;
		z-index: 4;
	}

	.act-btn {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: rgba(28, 26, 45, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: rgba(248, 250, 252, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 13px;
		cursor: pointer;
		transition: transform 120ms ease, border-color 200ms ease, background 200ms ease;
		box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.6);
	}
	.act-btn:hover {
		transform: translateY(-1px);
		border-color: rgba(255, 255, 255, 0.3);
		background: rgba(42, 38, 62, 0.95);
	}
	.expand-btn {
		color: rgba(167, 243, 208, 0.95);
	}

	.rating-menu {
		position: absolute;
		/* Open upward from the action buttons — pointer travels into the card body,
		   never crossing a dead gap. bottom: 44px clears the action buttons (28px)
		   plus the 14px they hang below the card, plus a 2px buffer. */
		bottom: 44px;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(10, 9, 20, 0.95);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		padding: 6px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		z-index: 10;
		min-width: 160px;
		box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.7);
	}
	/* Transparent bridge fills the gap between the menu bottom and the action
	   buttons so the pointer never enters a hover-dead zone mid-travel. */
	.rating-menu::after {
		content: '';
		position: absolute;
		top: 100%;
		left: -12px;
		right: -12px;
		height: 50px;
		background: transparent;
	}

	.rating-opt {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 7px 10px;
		border-radius: 6px;
		background: transparent;
		border: none;
		color: rgba(226, 232, 240, 0.85);
		font-size: 12px;
		cursor: pointer;
		text-align: left;
	}
	.rating-opt:hover {
		background: rgba(255, 255, 255, 0.05);
	}
	.rating-opt.active {
		background: rgba(167, 139, 250, 0.15);
		color: rgba(248, 250, 252, 1);
	}
	.emoji {
		font-size: 14px;
		width: 18px;
		text-align: center;
	}
	.lbl {
		flex: 1;
	}
</style>
