<script lang="ts">
	import type { Node, Rating } from '$lib/types';
	import { RATINGS, domainOf, ratingFor } from '$lib/types';
	import { graph } from '$lib/graph.svelte';

	type Props = {
		node: Node;
		onExpand: (id: string) => void;
		onConnectStart: (id: string, e: PointerEvent) => void;
		isDragging?: boolean;
		selected?: boolean;
		onSelect?: (id: string, fromKeyboard: boolean) => void;
	};

	let { node, onExpand, onConnectStart, isDragging = false, selected = false, onSelect }: Props =
		$props();

	let hovered = $state(false);
	let menuOpen = $state(false);

	// Controls show on hover (mouse) or selection (tap, keyboard focus).
	const active = $derived(hovered || selected);

	$effect(() => {
		if (!active) menuOpen = false;
	});

	// The rating menu closes on Esc or on any press outside it — hover-out alone
	// never happens on a touch screen, so it can't be the only way out.
	let cardEl: HTMLDivElement;
	function closeMenuOnOutside(e: PointerEvent) {
		if (!menuOpen) return;
		const t = e.target as HTMLElement;
		if (t.closest('.rating-menu, .rate-btn') && cardEl.contains(t)) return;
		menuOpen = false;
	}
	// Capture phase, so it runs before the canvas's Esc (deselect) and can claim
	// the key: Esc closes the innermost thing only.
	function closeMenuOnEsc(e: KeyboardEvent) {
		if (!menuOpen || e.key !== 'Escape') return;
		e.preventDefault();
		menuOpen = false;
		cardEl.querySelector<HTMLButtonElement>('.rate-btn')?.focus();
	}

	const ratingInfo = $derived(ratingFor(node.rating));
	const domain = $derived(domainOf(node.domain));



	function setRating(r: Rating) {
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

<svelte:window onpointerdowncapture={closeMenuOnOutside} onkeydowncapture={closeMenuOnEsc} />

<!-- Focusable on purpose: focusing a card selects it and reveals its rate /
     translate / connect controls, the keyboard path to everything hover shows.
     It holds buttons, so it can't itself be a button. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	bind:this={cardEl}
	class="node-card"
	class:is-seed={node.parentId === null}
	class:is-core={node.rating === 'core'}
	class:is-love={node.rating === 'love'}
	class:is-dislike={node.rating === 'dislike'}
	class:is-exile={node.rating === 'exile'}
	class:exile-shown={node.rating === 'exile' && graph.showExiled}
	class:active
	class:selected
	class:menu-open={menuOpen}
	class:is-dragging={isDragging}
	data-node-id={node.id}
	style="left: {node.x}px; top: {node.y}px;"
	onpointerenter={(e) => {
		// Hover is a mouse thing; touch fires enter without a matching leave.
		if (e.pointerType !== 'mouse') return;
		cancelClose();
		hovered = true;
	}}
	onpointerleave={(e) => {
		if (e.pointerType === 'mouse') scheduleClose();
	}}
	role="group"
	aria-label={node.title}
	tabindex="0"
	onfocusin={(e) => {
		// Keyboard focus pans the map to the card; a mouse/tap focus must not.
		const viaKeyboard = (e.target as HTMLElement).matches(':focus-visible');
		if (!selected || viaKeyboard) onSelect?.(node.id, viaKeyboard);
	}}
>
	<div class="card-inner">
		<div class="top-row">
			{#if node.imageUrl}
				<div class="thumb" style="background-image: url('{node.imageUrl}');" aria-hidden="true"></div>
			{:else}
				<div class="thumb thumb-placeholder" aria-hidden="true">
					{domain.emoji}
				</div>
			{/if}
			<div class="top-text">
				<div class="domain-row">
					<span class="domain-label">{domain.label}</span>
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
		{#if node.reason && active}
			<div class="reason">{node.reason}</div>
		{/if}
	</div>

	{#if active}
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

	{#if active}
		<div class="actions">
			<button
				class="act-btn rate-btn"
				onclick={(e) => {
					e.stopPropagation();
					menuOpen = !menuOpen;
				}}
				title="Rate"
				aria-label="Rate this"
				aria-haspopup="menu"
				aria-expanded={menuOpen}
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
		<div class="rating-menu" role="menu" aria-label="Rate {node.title}">
			{#each RATINGS as r (r.value)}
				<button
					class="rating-opt"
					class:active={node.rating === r.value}
					onclick={(e) => {
						e.stopPropagation();
						setRating(r.value);
					}}
					title={r.label}
					role="menuitemradio"
					aria-checked={node.rating === r.value}
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
		width: 12.5rem;
		user-select: none;
		cursor: default;
		transition: opacity 700ms ease;
		pointer-events: auto;
		z-index: 10;
	}
	.node-card.active {
		z-index: 50;
	}
	.node-card.menu-open {
		z-index: 1000;
	}
	.node-card.is-dragging {
		z-index: 200;
		cursor: grabbing !important;
	}

	/* A card is a bordered panel: rule and ground, no shadow or blur.
	   Hover and drag thicken the rule with an outline so nothing shifts. */
	.card-inner {
		position: relative;
		padding: 0.75rem 0.875rem;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}
	/* Active cards show the action buttons, which hang 14px below the card but
	   are 28px tall: the padding clears the 14px inside the card plus a gap. */
	.active .card-inner {
		outline: 1px solid var(--color-border);
		padding-bottom: 1.5rem;
	}
	/* Selected: the rule doubles, like a held-down card. */
	.selected .card-inner {
		outline: 2px solid var(--color-border);
	}
	.node-card:focus-visible {
		outline-offset: 6px;
	}
	.is-dragging .card-inner {
		outline: 2px solid var(--color-accent);
	}

	/* Seed: the thick frame. */
	.is-seed .card-inner {
		border-width: 2px;
	}
	/* Part of me: pink rule on the pale pink tint. */
	.is-core .card-inner {
		border: 2px solid var(--color-accent);
		background: var(--color-core-bg);
	}
	/* Really like: pink rule on the ordinary ground. */
	.is-love .card-inner {
		border-color: var(--color-accent);
	}
	/* Not for me: dashed ink rule, muted text — still AA, never faded out. */
	.is-dislike .card-inner {
		border-style: dashed;
		border-color: var(--color-text-muted);
		color: var(--color-text-muted);
	}
	.is-dislike .thumb {
		filter: grayscale(1);
	}
	.is-exile {
		opacity: 0;
		pointer-events: none;
	}
	/* Shown exiles: dotted rule and struck title, so the state reads without
	   leaning on a fade. */
	.is-exile.exile-shown {
		opacity: 1;
		pointer-events: auto;
	}
	.is-exile .card-inner {
		border-style: dotted;
		border-color: var(--color-text-muted);
		color: var(--color-text-muted);
	}
	.is-exile .title {
		text-decoration: line-through;
	}
	.is-exile .thumb {
		filter: grayscale(1);
		opacity: 0.5;
	}

	.top-row {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.top-text {
		flex: 1;
		min-width: 0;
	}

	.thumb {
		width: 2.625rem;
		height: 2.625rem;
		background-color: var(--color-tint);
		background-size: cover;
		background-position: center;
		flex-shrink: 0;
		border: 1px solid var(--color-border);
	}
	.is-seed .thumb {
		width: 3rem;
		height: 3rem;
	}
	.thumb-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-md);
	}

	.domain-row {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: var(--text-2xs);
		line-height: var(--leading-2xs);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}

	.title {
		font-family: var(--font-display);
		font-size: var(--text-base);
		line-height: var(--leading-xs);
		font-weight: 500;
		margin-top: 0.125rem;
	}

	.is-seed .title {
		font-size: var(--text-md);
		line-height: var(--leading-md);
		font-weight: 600;
	}

	.creator {
		font-size: var(--text-xs);
		line-height: var(--leading-xs);
		color: var(--color-text-muted);
		margin-top: 0.25rem;
		font-style: italic;
	}

	.reason {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--color-border);
		font-size: var(--text-xs);
		line-height: var(--leading-xs);
	}

	/* Small round controls hanging off the card are badge-scale, so they may
	   be circles; they still press by inverting, never by lifting. */
	.link-handle {
		position: absolute;
		top: 50%;
		right: -0.875rem;
		transform: translateY(-50%);
		width: 1.625rem;
		height: 1.625rem;
		border-radius: 999px;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: crosshair;
		z-index: 6;
	}
	.link-handle:hover {
		background: var(--color-text);
		color: var(--color-bg);
	}

	.rating-badge {
		position: absolute;
		top: -0.625rem;
		right: -0.625rem;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 999px;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-2xs);
		z-index: 3;
	}

	.actions {
		position: absolute;
		bottom: -0.875rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		z-index: 4;
	}

	.act-btn {
		width: 1.75rem;
		height: 1.75rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		color: var(--color-text);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-sm);
		cursor: pointer;
	}
	.act-btn + .act-btn {
		border-left: none;
	}
	.act-btn:hover {
		background: var(--color-tint);
	}
	.act-btn:active {
		background: var(--color-text);
		color: var(--color-bg);
	}
	/* Translate is the card's one primary action: the accent. */
	.expand-btn {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: var(--color-bg);
		font-weight: bold;
	}
	.expand-btn:hover {
		background: var(--color-accent-hover);
		border-color: var(--color-accent-hover);
	}

	.rating-menu {
		position: absolute;
		/* Open upward from the action buttons — pointer travels into the card body,
		   never crossing a dead gap. bottom: 44px clears the action buttons (28px)
		   plus the 14px they hang below the card, plus a 2px buffer. */
		bottom: 44px;
		left: 50%;
		transform: translateX(-50%);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		z-index: 10;
		min-width: 10rem;
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
		gap: 0.625rem;
		padding: 0.375rem 0.625rem;
		background: transparent;
		border: none;
		color: var(--color-text);
		font-size: var(--text-sm);
		line-height: var(--leading-sm);
		cursor: pointer;
		text-align: left;
	}
	.rating-opt + .rating-opt {
		border-top: 1px solid var(--color-border);
	}
	.rating-opt:hover {
		background: var(--color-tint);
	}
	/* Selected = inverted, like a chip held down. */
	.rating-opt.active {
		background: var(--color-text);
		color: var(--color-bg);
	}
	.emoji {
		font-size: var(--text-sm);
		width: 1.125rem;
		text-align: center;
	}
	.lbl {
		flex: 1;
	}
</style>
