<script lang="ts">
	// The key: never shown first, always one tap away. Every sample below is
	// drawn with the same tokens the map uses (--color-edge*, --color-core-bg,
	// the accent), so the key can't drift from it. Same pattern as wjeather's.
	import { ratingFor, type Rating } from '$lib/types';

	let { class: className = '' }: { class?: string } = $props();
	const titleId = $props.id();
	let dialog: HTMLDialogElement;

	const emoji = (r: Rating) => ratingFor(r)?.emoji ?? '';
</script>

<button
	type="button"
	class="{className} grid cursor-pointer place-items-center"
	aria-label="Show key"
	aria-haspopup="dialog"
	onclick={() => dialog.showModal()}
>
	<svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
		<circle cx="9" cy="9" r="7.25" />
		<path d="M6.75 7a2.25 2.25 0 1 1 3.2 2.05c-.6.3-.95.8-.95 1.45V11" stroke-linecap="round" />
		<circle cx="9" cy="13.4" r="0.6" fill="currentColor" />
	</svg>
</button>

<!-- Native dialog: focus moves in and stays, Esc closes, focus returns to the
     button. A click on the backdrop (the dialog itself, outside the inner
     panel) closes it too; Esc and the Close button cover keyboards. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	aria-labelledby={titleId}
	class="m-auto max-h-[calc(100dvh-2rem)] w-[min(26rem,calc(100%-2rem))] overflow-y-auto border-2 border-border bg-bg p-0 text-text backdrop:bg-text/50"
	onclick={(e) => {
		if (e.target === dialog) dialog.close();
	}}
>
	<div class="p-4">
		<div class="mb-4 flex items-baseline justify-between gap-4 border-b border-border pb-2">
			<h2 id={titleId} class="m-0 text-lg">Key</h2>
			<button
				type="button"
				class="inline-flex min-h-4 cursor-pointer items-center text-sm underline underline-offset-4"
				onclick={() => dialog.close()}
			>
				Close
			</button>
		</div>

		<p class="mb-4 text-sm">
			Each card is something you've seeded or been recommended. Lines show how they connect and how you feel about
			them.
		</p>

		<h3 class="mb-2 text-xs font-bold uppercase tracking-[0.12em]">Lines</h3>
		<ul class="m-0 mb-4 flex list-none flex-col gap-2 p-0 text-sm">
			<li class="flex items-center gap-3">
				<svg class="shrink-0" width="48" height="12" aria-hidden="true">
					<line x1="0" y1="6" x2="48" y2="6" class="stroke-edge-love" stroke-width="1.5" />
				</svg>
				<span>Pink: you love one end.</span>
			</li>
			<li class="flex items-center gap-3">
				<svg class="shrink-0" width="48" height="12" aria-hidden="true">
					<line x1="0" y1="6" x2="48" y2="6" class="stroke-edge-seed" stroke-width="1" />
				</svg>
				<span>Ink: grows from a seed you typed.</span>
			</li>
			<li class="flex items-center gap-3">
				<svg class="shrink-0" width="48" height="12" aria-hidden="true">
					<line x1="0" y1="6" x2="48" y2="6" class="stroke-edge" stroke-width="1" />
				</svg>
				<span>Gray: a recommendation of a recommendation.</span>
			</li>
			<li class="flex items-center gap-3">
				<svg class="shrink-0" width="48" height="12" aria-hidden="true">
					<line x1="0" y1="6" x2="48" y2="6" class="stroke-edge" stroke-width="1" stroke-dasharray="6 6" />
				</svg>
				<span>Dashed: a bridge the translator found to something already on your map.</span>
			</li>
			<li class="flex items-center gap-3">
				<svg class="shrink-0" width="48" height="12" aria-hidden="true">
					<line
						x1="0"
						y1="6"
						x2="48"
						y2="6"
						class="stroke-edge"
						stroke-width="1"
						stroke-dasharray="1 4"
						stroke-linecap="round"
					/>
				</svg>
				<span>Dotted: a link you drew yourself.</span>
			</li>
			<li class="flex items-center gap-3">
				<svg class="shrink-0" width="48" height="18" aria-hidden="true">
					<g class="stroke-edge-love">
						<line x1="0" y1="3" x2="48" y2="3" stroke-width="1" />
						<line x1="0" y1="9" x2="48" y2="9" stroke-width="1.5" />
						<line x1="0" y1="15" x2="48" y2="15" stroke-width="2" />
					</g>
				</svg>
				<span>Thicker: stronger feeling. Lines to things you've turned down fade.</span>
			</li>
		</ul>

		<h3 class="mb-2 text-xs font-bold uppercase tracking-[0.12em]">Cards</h3>
		<ul class="m-0 flex list-none flex-col gap-2 p-0 text-sm">
			<li class="flex items-center gap-3">
				<span class="block h-4 w-8 shrink-0 border-2 border-border bg-bg" aria-hidden="true"></span>
				<span>Thick frame: a seed you typed.</span>
			</li>
			<li class="flex items-center gap-3">
				<span class="block h-4 w-8 shrink-0 border-2 border-accent bg-core-bg" aria-hidden="true"></span>
				<span>{emoji('core')} Pink fill: part of me.</span>
			</li>
			<li class="flex items-center gap-3">
				<span class="block h-4 w-8 shrink-0 border border-accent bg-bg" aria-hidden="true"></span>
				<span>{emoji('love')} Pink border: really like.</span>
			</li>
			<li class="flex items-center gap-3">
				<span class="block h-4 w-8 shrink-0 border border-border bg-bg" aria-hidden="true"></span>
				<span>{emoji('like')} {emoji('meh')} Plain: like, meh, or not rated yet.</span>
			</li>
			<li class="flex items-center gap-3">
				<span class="block h-4 w-8 shrink-0 border border-dashed border-text-muted bg-bg" aria-hidden="true"></span>
				<span>{emoji('dislike')} Dashed: not for me.</span>
			</li>
			<li class="flex items-center gap-3">
				<span
					class="grid h-4 w-8 shrink-0 place-items-center border border-dotted border-text-muted bg-bg text-2xs text-text-muted line-through"
					aria-hidden="true">Aa</span
				>
				<span>{emoji('exile')} Dotted, struck through: hard no. Hidden unless “Show Exiled” is on.</span>
			</li>
		</ul>
	</div>
</dialog>
