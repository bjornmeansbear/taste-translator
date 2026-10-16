<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { graph } from '$lib/graph.svelte';
	import type { Edge } from '$lib/types';
	import NodeCard from './NodeCard.svelte';
	import Legend from './Legend.svelte';

	type Props = {
		onExpand: (id: string) => void;
	};

	let { onExpand }: Props = $props();

	const MIN_SCALE = 0.18;
	const MAX_SCALE = 2.5;
	const HALF = 20000; // half-size of the edge layer, in world px

	let wrapper: HTMLDivElement;
	let viewport = $state({ x: 0, y: 0, scale: 1 });
	// Where the viewport is easing to; null when it's at rest.
	let viewportTarget = $state<{ x: number; y: number; scale: number } | null>(null);

	// Pointer gestures: pan the canvas, drag a card, or drag a new link.
	let panning = $state(false);
	let panStart = { x: 0, y: 0, vx: 0, vy: 0 };
	let draggingNode = $state<{ id: string; startCx: number; startCy: number; startNx: number; startNy: number } | null>(
		null
	);
	let connecting = $state<{ from: string; x: number; y: number; hoverId: string | null } | null>(null);

	// Tap-to-select: hover can't reach the card controls on a touch screen, so a
	// tap (press and release without moving) selects a card and shows them.
	// A tap on empty canvas or Esc clears it. Keyboard focus selects too.
	let selectedId = $state<string | null>(null);
	let downAt = { x: 0, y: 0 };
	const TAP_SLOP = 6;

	// Presses on these belong to their own controls, not to the canvas: capturing
	// the pointer here would swallow their clicks.
	const NOT_CANVAS = '.link-handle, .actions, .rating-menu, .canvas-controls, dialog';

	function clientToWorld(cx: number, cy: number) {
		const rect = wrapper.getBoundingClientRect();
		return {
			x: (cx - rect.left - viewport.x) / viewport.scale,
			y: (cy - rect.top - viewport.y) / viewport.scale
		};
	}

	/** The viewport that puts world point (x, y) at the centre of the screen. */
	function centerOn(x: number, y: number, scale = viewport.scale) {
		const rect = wrapper.getBoundingClientRect();
		return { x: rect.width / 2 - x * scale, y: rect.height / 2 - y * scale, scale };
	}

	function centerOnSeed() {
		const seed = graph.anchorNode;
		if (seed) viewportTarget = centerOn(seed.x, seed.y);
	}

	function fitAll() {
		if (graph.nodes.length === 0) return;
		const xs = graph.nodes.map((n) => n.x);
		const ys = graph.nodes.map((n) => n.y);
		const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
		const pad = 160;
		const rect = wrapper.getBoundingClientRect();
		const fit = Math.min(rect.width / (maxX - minX + pad * 2), rect.height / (maxY - minY + pad * 2));
		viewportTarget = centerOn((minX + maxX) / 2, (minY + maxY) / 2, Math.min(2, Math.max(MIN_SCALE, fit)));
	}

	onMount(() => {
		let raf = 0;
		const LERP = 0.14;
		const tick = () => {
			graph.step(1);
			const t = viewportTarget;
			if (t) {
				viewport.x += (t.x - viewport.x) * LERP;
				viewport.y += (t.y - viewport.y) * LERP;
				viewport.scale += (t.scale - viewport.scale) * LERP;
				const settled =
					Math.abs(viewport.x - t.x) < 0.5 &&
					Math.abs(viewport.y - t.y) < 0.5 &&
					Math.abs(viewport.scale - t.scale) < 0.001;
				if (settled) {
					viewport = { ...t };
					viewportTarget = null;
				}
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		const onResize = () => fitAll();
		window.addEventListener('resize', onResize);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', onResize);
		};
	});

	// Snap (no animation) to the anchor whenever there's a new one: the first
	// seed of a fresh map, or a different exploration loaded.
	$effect(() => {
		const seed = graph.anchorNode;
		if (seed) untrack(() => (viewport = centerOn(seed.x, seed.y)));
	});

	// Something asked to bring a card into view (node list, keyboard, touch).
	$effect(() => {
		const id = graph.focusId;
		if (!id) return;
		untrack(() => {
			const node = graph.byId.get(id);
			if (node) viewportTarget = centerOn(node.x, node.y, Math.max(0.75, Math.min(1.5, viewport.scale)));
			graph.focusId = null;
		});
	});

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		viewportTarget = null; // the user takes over
		const rect = wrapper.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;
		const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, viewport.scale * (e.deltaY > 0 ? 0.92 : 1.08)));
		// Zoom about the pointer: the world point under it stays put.
		const wx = (mx - viewport.x) / viewport.scale;
		const wy = (my - viewport.y) / viewport.scale;
		viewport = { x: mx - wx * scale, y: my - wy * scale, scale };
	}

	function onPointerDown(e: PointerEvent) {
		const target = e.target as HTMLElement;
		if (target.closest(NOT_CANVAS)) return;
		viewportTarget = null; // the user takes over
		downAt = { x: e.clientX, y: e.clientY };

		const id = (target.closest('[data-node-id]') as HTMLElement | null)?.dataset.nodeId;
		const node = id ? graph.byId.get(id) : undefined;
		if (node) {
			draggingNode = { id: node.id, startCx: e.clientX, startCy: e.clientY, startNx: node.x, startNy: node.y };
		} else {
			panning = true;
			panStart = { x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y };
		}
		wrapper.setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (connecting) {
			const w = clientToWorld(e.clientX, e.clientY);
			const el = document.elementFromPoint(e.clientX, e.clientY);
			const id = (el?.closest('[data-node-id]') as HTMLElement | null)?.dataset.nodeId ?? null;
			connecting = { ...connecting, x: w.x, y: w.y, hoverId: id !== connecting.from ? id : null };
		} else if (draggingNode) {
			const node = graph.byId.get(draggingNode.id);
			if (!node) return;
			node.x = draggingNode.startNx + (e.clientX - draggingNode.startCx) / viewport.scale;
			node.y = draggingNode.startNy + (e.clientY - draggingNode.startCy) / viewport.scale;
			node.vx = 0;
			node.vy = 0;
		} else if (panning) {
			viewport.x = panStart.vx + (e.clientX - panStart.x);
			viewport.y = panStart.vy + (e.clientY - panStart.y);
		}
	}

	function onPointerUp(e: PointerEvent) {
		if (connecting?.hoverId) graph.connect(connecting.from, connecting.hoverId, 'manual');
		connecting = null;

		const tapped = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < TAP_SLOP;
		if (draggingNode && tapped) {
			selectedId = draggingNode.id;
			// On touch, bring the card and its controls fully on screen.
			if (e.pointerType !== 'mouse') graph.focusId = draggingNode.id;
		} else if (draggingNode) {
			graph.revision++; // a card was moved by hand: worth saving
		} else if (panning && tapped) {
			selectedId = null;
		}
		draggingNode = null;
		panning = false;
		if (wrapper.hasPointerCapture(e.pointerId)) wrapper.releasePointerCapture(e.pointerId);
	}

	function handleConnectStart(fromId: string, e: PointerEvent) {
		const w = clientToWorld(e.clientX, e.clientY);
		connecting = { from: fromId, x: w.x, y: w.y, hoverId: null };
		wrapper.setPointerCapture(e.pointerId);
	}

	function onKey(e: KeyboardEvent) {
		if (e.key !== 'Escape' || e.defaultPrevented) return;
		if (connecting) connecting = null;
		else selectedId = null;
	}

	/** A gently bowed line; the bow is seeded by the ids so it never jitters. */
	function edgePath(ax: number, ay: number, bx: number, by: number, seed: string): string {
		const dx = bx - ax;
		const dy = by - ay;
		const dist = Math.sqrt(dx * dx + dy * dy) || 1;
		const offset = ((hash(seed) % 40) - 20) * 0.6;
		const mx = (ax + bx) / 2 + (-dy / dist) * offset;
		const my = (ay + by) / 2 + (dx / dist) * offset;
		return `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`;
	}

	function hash(s: string) {
		let h = 0;
		for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
		return Math.abs(h);
	}

	/**
	 * How an edge is drawn. One variable per channel (RULES.md "Data on screen"):
	 * hue = preference (pink if you love an end, ink from a seed, gray otherwise),
	 * dash = kind, weight = strength. Opacity only fades rejected work; everything
	 * else stays opaque so the line colors hold their measured contrast. Widths
	 * and dashes are divided by the zoom so the line work is constant on screen.
	 */
	function edgeLook(e: Edge) {
		const a = graph.byId.get(e.from);
		const b = graph.byId.get(e.to);
		if (!a || !b) return null;
		const either = (r: string) => a.rating === r || b.rating === r;
		const px = 1 / viewport.scale;
		const loved = either('core') || either('love');
		return {
			a,
			b,
			cls: loved ? 'edge edge-love' : a.parentId === null || b.parentId === null ? 'edge edge-seed' : 'edge',
			width: (either('core') ? 2 : either('love') ? 1.5 : 1) * px,
			opacity: either('exile') ? (graph.showExiled ? 0.15 : 0) : either('dislike') ? 0.35 : 1,
			dash: e.kind === 'bridge' ? `${6 * px} ${6 * px}` : e.kind === 'manual' ? `${px} ${4 * px}` : undefined
		};
	}

	// Dot grid: the 6px rhythm on the canvas, one dot per 24 world px (4 units),
	// so panning and zooming read against something. Thins by halves when the
	// dots would crowd closer than 18 screen px.
	const grid = $derived.by(() => {
		let step = 24;
		while (step * viewport.scale < 18) step *= 2;
		const size = step * viewport.scale;
		return { size, x: viewport.x % size, y: viewport.y % size };
	});
</script>

<svelte:window onkeydown={onKey} />

<div
	class="canvas-wrapper"
	style:background-size="{grid.size}px {grid.size}px"
	style:background-position="{grid.x}px {grid.y}px"
	onscroll={() => {
		// Focusing a card can make the browser scroll this box to it; the
		// viewport transform does the moving here, so undo that.
		wrapper.scrollTop = 0;
		wrapper.scrollLeft = 0;
	}}
	bind:this={wrapper}
	onwheel={onWheel}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
	class:panning
	class:connecting={!!connecting}
	class:dragging-node={!!draggingNode}
	role="application"
>
	<div
		class="world"
		style="transform: translate({viewport.x}px, {viewport.y}px) scale({viewport.scale});"
	>
		<svg
			class="edges"
			width={HALF * 2}
			height={HALF * 2}
			viewBox="{-HALF} {-HALF} {HALF * 2} {HALF * 2}"
			style="left: {-HALF}px; top: {-HALF}px;"
			aria-hidden="true"
		>
			{#each graph.edges as e (e.from + '-' + e.to)}
				{@const look = edgeLook(e)}
				{#if look}
					<path
						d={edgePath(look.a.x, look.a.y, look.b.x, look.b.y, e.from + e.to)}
						class={look.cls}
						stroke-width={look.width}
						fill="none"
						opacity={look.opacity}
						stroke-linecap="round"
						stroke-dasharray={look.dash}
					>
						{#if e.reason}
							<title>{e.reason}</title>
						{/if}
					</path>
				{/if}
			{/each}

			{#if connecting}
				{@const from = graph.byId.get(connecting.from)}
				{#if from}
					<path
						d={edgePath(from.x, from.y, connecting.x, connecting.y, connecting.from + 'drag')}
						class="edge edge-love"
						stroke-width={2 / viewport.scale}
						fill="none"
						stroke-linecap="round"
						stroke-dasharray="{6 / viewport.scale} {6 / viewport.scale}"
					/>
				{/if}
			{/if}
		</svg>

		{#each graph.nodes as node (node.id)}
			<NodeCard
				{node}
				{onExpand}
				onConnectStart={handleConnectStart}
				isDragging={draggingNode?.id === node.id}
				selected={selectedId === node.id}
				onSelect={(id, fromKeyboard) => {
					selectedId = id;
					if (fromKeyboard) graph.focusId = id;
				}}
			/>
		{/each}
	</div>

	<!-- Recenter / fit-all buttons -->
	{#if graph.nodes.length > 0}
		<div class="canvas-controls">
			<button class="ctrl-btn" onclick={centerOnSeed} title="Recenter on first seed" aria-label="Recenter on first seed">
				<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
					<circle cx="8" cy="8" r="2.5" fill="currentColor" />
					<path d="M8 1v2.5M8 10.5V13M1 8h2.5M10.5 8H13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
					<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.2" />
				</svg>
			</button>
			<button class="ctrl-btn" onclick={fitAll} title="Fit all nodes in view" aria-label="Fit all nodes in view">
				<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
					<path d="M1 5V2h3M12 2h3v3M15 11v3h-3M4 14H1v-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="square" fill="none" />
					<rect x="4.5" y="4.5" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1" />
				</svg>
			</button>
			<Legend
				class="size-6 border border-t-0 border-border bg-bg text-text hover:bg-tint active:bg-text active:text-bg"
			/>
		</div>
	{/if}

	<div class="zoom-indicator">
		<span class="lbl">zoom</span>
		<span class="val">{Math.round(viewport.scale * 100)}%</span>
	</div>

	{#if connecting}
		<div class="connect-hint">drag to another node · esc to cancel</div>
	{/if}
</div>

<style>
	/* The grid is texture, not chrome: dots at ~25% ink, quieter than the
	   faintest edge, hard-edged (no soft falloff). */
	.canvas-wrapper {
		--dot: color-mix(in oklab, var(--color-text) 25%, transparent);
		background-image: radial-gradient(circle, var(--dot) 1px, transparent 1.5px);
		position: fixed;
		inset: 0;
		overflow: hidden;
		cursor: grab;
		touch-action: none;
		z-index: 1;
	}
	.canvas-wrapper.panning {
		cursor: grabbing;
	}
	.canvas-wrapper.connecting {
		cursor: crosshair;
	}
	.canvas-wrapper.dragging-node {
		cursor: grabbing;
	}

	.world {
		position: absolute;
		top: 0;
		left: 0;
		width: 0;
		height: 0;
		transform-origin: 0 0;
		will-change: transform;
	}

	.edges {
		position: absolute;
		pointer-events: none;
		overflow: visible;
	}

	.edge {
		stroke: var(--color-edge);
	}
	.edge-seed {
		stroke: var(--color-edge-seed);
	}
	.edge-love {
		stroke: var(--color-edge-love);
	}

	/* Chrome over the canvas: solid ground, 1px rule, no blur or shadow. */
	.canvas-controls {
		position: fixed;
		/* Clears the control bar, which wraps to two rows on a phone. */
		bottom: 7.5rem;
		right: 1rem;
		display: flex;
		flex-direction: column;
		z-index: 30;
	}
	@media (min-width: 40rem) {
		.canvas-controls {
			bottom: 4.5rem;
		}
	}

	.ctrl-btn {
		width: 2.25rem;
		height: 2.25rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		color: var(--color-text);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	.ctrl-btn + .ctrl-btn {
		border-top: none;
	}
	.ctrl-btn:hover {
		background: var(--color-tint);
	}
	.ctrl-btn:active {
		background: var(--color-text);
		color: var(--color-bg);
	}

	.zoom-indicator {
		display: none;
		position: fixed;
		bottom: 1.5rem;
		right: 1rem;
		gap: 0.5rem;
		align-items: baseline;
		font-size: var(--text-2xs);
		line-height: var(--leading-2xs);
		color: var(--color-text-muted);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		pointer-events: none;
	}
	.zoom-indicator .val {
		font-feature-settings: 'tnum';
		color: var(--color-text);
	}
	@media (min-width: 40rem) {
		.zoom-indicator {
			display: flex;
		}
	}

	.connect-hint {
		position: fixed;
		top: 5.25rem;
		left: 50%;
		transform: translateX(-50%);
		padding: 0.375rem 0.875rem;
		font-size: var(--text-xs);
		line-height: var(--leading-xs);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		white-space: nowrap;
		color: var(--color-accent);
		background: var(--color-bg);
		border: 1px solid var(--color-accent);
		border-radius: 999px;
		pointer-events: none;
		z-index: 40;
	}
</style>
