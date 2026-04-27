<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { graph } from '$lib/graph.svelte';
	import NodeCard from './NodeCard.svelte';

	type Props = {
		onExpand: (id: string) => void;
	};

	let { onExpand }: Props = $props();

	let wrapper: HTMLDivElement;
	let viewport = $state({
		x: 0,
		y: 0,
		scale: 1
	});

	// Smooth viewport animation target
	let viewportTarget = $state<{ x: number; y: number; scale: number } | null>(null);

	let panning = $state(false);
	let panStart = { x: 0, y: 0, vx: 0, vy: 0 };

	// Node drag state
	let draggingNode = $state<{
		id: string;
		startCx: number;
		startCy: number;
		startNx: number;
		startNy: number;
	} | null>(null);

	// Drag-to-connect state
	let connecting = $state<{ from: string; x: number; y: number; hoverId: string | null } | null>(
		null
	);

	function clientToWorld(cx: number, cy: number) {
		const rect = wrapper.getBoundingClientRect();
		return {
			x: (cx - rect.left - viewport.x) / viewport.scale,
			y: (cy - rect.top - viewport.y) / viewport.scale
		};
	}

	function centerOnSeed() {
		const seed = graph.anchorNode;
		if (!seed || !wrapper) return;
		const rect = wrapper.getBoundingClientRect();
		viewportTarget = {
			x: rect.width / 2 - seed.x * viewport.scale,
			y: rect.height / 2 - seed.y * viewport.scale,
			scale: viewport.scale
		};
	}

	function fitAll() {
		if (graph.nodes.length === 0 || !wrapper) return;
		const rect = wrapper.getBoundingClientRect();
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		for (const n of graph.nodes) {
			if (n.x < minX) minX = n.x;
			if (n.y < minY) minY = n.y;
			if (n.x > maxX) maxX = n.x;
			if (n.y > maxY) maxY = n.y;
		}
		const pad = 160;
		const contentW = maxX - minX + pad * 2;
		const contentH = maxY - minY + pad * 2;
		const scale = Math.min(2.0, Math.max(0.18, Math.min(rect.width / contentW, rect.height / contentH)));
		const cx = (minX + maxX) / 2;
		const cy = (minY + maxY) / 2;
		viewportTarget = {
			x: rect.width / 2 - cx * scale,
			y: rect.height / 2 - cy * scale,
			scale
		};
	}

	onMount(() => {
		let raf = 0;
		const LERP = 0.14;
		const tick = () => {
			graph.step(1);
			// Smooth viewport animation toward target
			if (viewportTarget) {
				viewport.x += (viewportTarget.x - viewport.x) * LERP;
				viewport.y += (viewportTarget.y - viewport.y) * LERP;
				viewport.scale += (viewportTarget.scale - viewport.scale) * LERP;
				if (
					Math.abs(viewport.x - viewportTarget.x) < 0.5 &&
					Math.abs(viewport.y - viewportTarget.y) < 0.5 &&
					Math.abs(viewport.scale - viewportTarget.scale) < 0.001
				) {
					viewport.x = viewportTarget.x;
					viewport.y = viewportTarget.y;
					viewport.scale = viewportTarget.scale;
					viewportTarget = null;
				}
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		// Initial center (snap, no animation)
		const seed = graph.anchorNode;
		if (seed && wrapper) {
			const rect = wrapper.getBoundingClientRect();
			viewport.x = rect.width / 2 - seed.x * viewport.scale;
			viewport.y = rect.height / 2 - seed.y * viewport.scale;
		}
		const onResize = () => { if (graph.nodes.length > 0) fitAll(); };
		window.addEventListener('resize', onResize);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', onResize);
		};
	});

	let didInitialCenter = false;
	$effect(() => {
		if (!browser) return;
		if (!didInitialCenter && graph.anchorNode) {
			didInitialCenter = true;
			queueMicrotask(() => {
				const seed = graph.anchorNode;
				if (!seed || !wrapper) return;
				const rect = wrapper.getBoundingClientRect();
				viewport.x = rect.width / 2 - seed.x * viewport.scale;
				viewport.y = rect.height / 2 - seed.y * viewport.scale;
			});
		}
	});

	// Watch graph.focusId and animate to that node
	$effect(() => {
		const id = graph.focusId;
		if (!id || !wrapper) return;
		const node = graph.byId.get(id);
		if (!node) return;
		const rect = wrapper.getBoundingClientRect();
		const targetScale = Math.max(0.75, Math.min(1.5, viewport.scale));
		viewportTarget = {
			x: rect.width / 2 - node.x * targetScale,
			y: rect.height / 2 - node.y * targetScale,
			scale: targetScale
		};
		queueMicrotask(() => { graph.focusId = null; });
	});

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		viewportTarget = null; // cancel animation on user scroll
		const rect = wrapper.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;
		const dir = e.deltaY > 0 ? 0.92 : 1.08;
		const newScale = Math.min(2.5, Math.max(0.18, viewport.scale * dir));
		const wx = (mx - viewport.x) / viewport.scale;
		const wy = (my - viewport.y) / viewport.scale;
		viewport.scale = newScale;
		viewport.x = mx - wx * newScale;
		viewport.y = my - wy * newScale;
	}

	function onPointerDown(e: PointerEvent) {
		viewportTarget = null; // cancel animation on any pointer input
		const target = e.target as HTMLElement;

		// Let the link-handle handle itself (it captures pointer for connect)
		if (target.closest('.link-handle')) return;
		// Let action buttons / rating menu be
		if (target.closest('.actions, .rating-menu')) return;

		// Node card body → start node drag
		const card = target.closest('[data-node-id]') as HTMLElement | null;
		if (card) {
			const id = card.dataset.nodeId!;
			const node = graph.byId.get(id);
			if (node) {
				draggingNode = { id, startCx: e.clientX, startCy: e.clientY, startNx: node.x, startNy: node.y };
				try { wrapper.setPointerCapture(e.pointerId); } catch { /* ignore */ }
				return;
			}
		}

		// Canvas background → pan
		panning = true;
		panStart = { x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (connecting) {
			const w = clientToWorld(e.clientX, e.clientY);
			connecting.x = w.x;
			connecting.y = w.y;
			const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
			const card = el?.closest('[data-node-id]') as HTMLElement | null;
			const id = card?.dataset.nodeId ?? null;
			connecting.hoverId = id && id !== connecting.from ? id : null;
			return;
		}
		if (draggingNode) {
			const node = graph.byId.get(draggingNode.id);
			if (node) {
				const dx = (e.clientX - draggingNode.startCx) / viewport.scale;
				const dy = (e.clientY - draggingNode.startCy) / viewport.scale;
				node.x = draggingNode.startNx + dx;
				node.y = draggingNode.startNy + dy;
				node.vx = 0;
				node.vy = 0;
			}
			return;
		}
		if (!panning) return;
		viewport.x = panStart.vx + (e.clientX - panStart.x);
		viewport.y = panStart.vy + (e.clientY - panStart.y);
	}

	function onPointerUp(e: PointerEvent) {
		if (connecting) {
			if (connecting.hoverId && connecting.hoverId !== connecting.from) {
				graph.connect(connecting.from, connecting.hoverId, 'manual');
			}
			connecting = null;
		}
		draggingNode = null;
		panning = false;
		try {
			(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
	}

	function handleConnectStart(fromId: string, e: PointerEvent) {
		const w = clientToWorld(e.clientX, e.clientY);
		connecting = { from: fromId, x: w.x, y: w.y, hoverId: null };
		try {
			wrapper.setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && connecting) connecting = null;
	}

	function edgePath(ax: number, ay: number, bx: number, by: number, seedA: string, seedB: string): string {
		const dx = bx - ax;
		const dy = by - ay;
		const dist = Math.sqrt(dx * dx + dy * dy) || 1;
		const h = hash(seedA + seedB);
		const offset = ((h % 40) - 20) * 0.6;
		const mx = (ax + bx) / 2 + (-dy / dist) * offset;
		const my = (ay + by) / 2 + (dx / dist) * offset;
		return `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`;
	}

	function hash(s: string) {
		let h = 0;
		for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
		return Math.abs(h);
	}

	function edgeOpacity(fromId: string, toId: string, kind?: string): number {
		const a = graph.byId.get(fromId);
		const b = graph.byId.get(toId);
		if (!a || !b) return 0;
		if (!graph.showExiled && (a.rating === 'exile' || b.rating === 'exile')) return 0;
		if (a.rating === 'exile' || b.rating === 'exile') return 0.06;
		if (a.rating === 'dislike' || b.rating === 'dislike') return 0.18;
		if (a.rating === 'core' || b.rating === 'core') return 0.85;
		if (a.rating === 'love' || b.rating === 'love') return 0.6;
		if (kind === 'bridge' || kind === 'manual') return 0.5;
		return 0.35;
	}

	function edgeColor(fromId: string, toId: string, kind?: string): string {
		const a = graph.byId.get(fromId);
		const b = graph.byId.get(toId);
		if (!a || !b) return 'rgba(255,255,255,0.5)';
		if (a.rating === 'core' || b.rating === 'core') return 'rgba(244,114,182,0.9)';
		if (a.rating === 'love' || b.rating === 'love') return 'rgba(167,139,250,0.8)';
		if (kind === 'manual') return 'rgba(252,211,77,0.85)';
		if (kind === 'bridge') return 'rgba(134,239,172,0.7)';
		if (a.parentId === null || b.parentId === null) return 'rgba(125,211,252,0.8)';
		return 'rgba(203,213,225,0.6)';
	}

	function edgeDash(kind?: string): string | undefined {
		if (kind === 'bridge') return '5 4';
		return undefined;
	}

	const isDraggingNode = $derived(!!draggingNode);
	const HALF = 20000;
</script>

<svelte:window onkeydown={onKey} />

<div
	class="canvas-wrapper"
	bind:this={wrapper}
	onwheel={onWheel}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
	class:panning
	class:connecting={!!connecting}
	class:dragging-node={isDraggingNode}
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
			<defs>
				<filter id="edge-glow" x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation="2" result="blur" />
					<feMerge>
						<feMergeNode in="blur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>
			{#each graph.edges as e (e.from + '-' + e.to)}
				{@const a = graph.byId.get(e.from)}
				{@const b = graph.byId.get(e.to)}
				{#if a && b}
					<path
						d={edgePath(a.x, a.y, b.x, b.y, e.from, e.to)}
						stroke={edgeColor(e.from, e.to, e.kind)}
						stroke-width={1.2 / viewport.scale + 0.4}
						fill="none"
						opacity={edgeOpacity(e.from, e.to, e.kind)}
						stroke-linecap="round"
						stroke-dasharray={edgeDash(e.kind)}
						filter="url(#edge-glow)"
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
						d={edgePath(from.x, from.y, connecting.x, connecting.y, connecting.from, 'drag')}
						stroke="rgba(252,211,77,0.9)"
						stroke-width={1.6 / viewport.scale + 0.6}
						fill="none"
						stroke-linecap="round"
						stroke-dasharray="6 4"
						filter="url(#edge-glow)"
					/>
				{/if}
			{/if}
		</svg>

		{#each graph.nodes as node (node.id)}
			<NodeCard
				{node}
				{onExpand}
				onConnectStart={handleConnectStart}
				zoom={viewport.scale}
				isDragging={draggingNode?.id === node.id}
			/>
		{/each}
	</div>

	<!-- Recenter / fit-all buttons -->
	{#if graph.nodes.length > 0}
		<div class="canvas-controls">
			<button class="ctrl-btn" onclick={centerOnSeed} title="Recenter on first seed">
				<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
					<circle cx="8" cy="8" r="2.5" fill="currentColor" />
					<path d="M8 1v2.5M8 10.5V13M1 8h2.5M10.5 8H13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
					<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.2" />
				</svg>
			</button>
			<button class="ctrl-btn" onclick={fitAll} title="Fit all nodes in view">
				<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
					<path d="M1 5V2h3M12 2h3v3M15 11v3h-3M4 14H1v-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none" />
					<rect x="4.5" y="4.5" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1" />
				</svg>
			</button>
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
	.canvas-wrapper {
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

	.canvas-controls {
		position: fixed;
		bottom: 64px;
		right: 22px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		z-index: 30;
	}

	.ctrl-btn {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: rgba(10, 9, 20, 0.78);
		backdrop-filter: blur(14px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(203, 213, 225, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: border-color 180ms ease, color 180ms ease, background 180ms ease;
	}
	.ctrl-btn:hover {
		border-color: rgba(125, 211, 252, 0.5);
		color: rgba(125, 211, 252, 0.95);
		background: rgba(20, 18, 38, 0.9);
	}

	.zoom-indicator {
		position: fixed;
		bottom: 20px;
		right: 22px;
		display: flex;
		gap: 8px;
		align-items: baseline;
		font-size: 10px;
		color: rgba(203, 213, 225, 0.45);
		letter-spacing: 0.2em;
		text-transform: uppercase;
		pointer-events: none;
	}
	.zoom-indicator .val {
		font-feature-settings: 'tnum';
		color: rgba(226, 232, 240, 0.7);
	}

	.connect-hint {
		position: fixed;
		top: 90px;
		left: 50%;
		transform: translateX(-50%);
		padding: 6px 14px;
		font-size: 11px;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		color: rgba(252, 211, 77, 0.9);
		background: rgba(10, 9, 20, 0.8);
		border: 1px solid rgba(252, 211, 77, 0.4);
		border-radius: 999px;
		pointer-events: none;
		z-index: 40;
		backdrop-filter: blur(14px);
	}
</style>
