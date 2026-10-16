<script lang="ts">
	type Props = {
		loading: boolean;
		onSubmit: (text: string) => void;
		centered: boolean;
		error?: string | null;
	};

	let { loading, onSubmit, centered, error }: Props = $props();

	let value = $state('');

	function submit() {
		const t = value.trim();
		if (!t || loading) return;
		onSubmit(t);
		value = '';
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			submit();
		}
	}

	const placeholders = [
		'In the Mood for Love',
		'Arvo Pärt',
		'Bauhaus',
		'Didion, The White Album',
		'Laphroaig 10',
		'Kubrick',
		'Björk — Vespertine',
		'Yohji Yamamoto',
		'Tarkovsky',
		'Joan Didion'
	];
	let ph = $state(placeholders[Math.floor(Math.random() * placeholders.length)]);
</script>

<div class="seed-wrap" class:centered>
	<div class="seed-card">
		{#if centered}
			<div class="brand">
				<div class="mark" aria-hidden="true">◉</div>
				<h1 class="title">Taste Translator</h1>
			</div>
			<p class="tagline">A living map of your aesthetic universe.</p>
		{/if}
		<div class="input-row">
			<input
				type="text"
				class="seed-input"
				placeholder={centered ? `Type anything you love — e.g. "${ph}"` : 'Add another seed…'}
				bind:value
				onkeydown={onKey}
				disabled={loading}
				aria-label="Type anything you love"
			/>
			<button class="send" onclick={submit} disabled={loading || !value.trim()} aria-label="Translate">
				{#if loading}
					<span class="spinner" aria-hidden="true"></span>
				{:else}
					<span class="arrow">↯</span>
				{/if}
			</button>
		</div>
		{#if error}
			<div class="error" role="alert">{error}</div>
		{/if}
		{#if centered}
			<div class="hint">
				Film · Book · Album · Band · Painting · Architect · TV · Fashion · Food
			</div>
		{/if}
	</div>
</div>

<style>
	.seed-wrap {
		position: fixed;
		z-index: 30;
		left: 50%;
		transform: translateX(-50%);
		top: 1rem;
		width: min(35rem, calc(100vw - 2rem));
		transition:
			top 700ms cubic-bezier(0.2, 0.9, 0.2, 1),
			width 700ms cubic-bezier(0.2, 0.9, 0.2, 1);
	}

	.seed-wrap.centered {
		top: 20vh;
		width: min(39rem, calc(100vw - 2rem));
	}

	/* Phone, once the map exists: leave the top-right corner to the list button. */
	@media (max-width: 39.99rem) {
		.seed-wrap:not(.centered) {
			left: calc(50% - 1.5rem);
			width: calc(100vw - 5rem);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.seed-wrap {
			transition: none;
		}
	}

	.seed-card {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		padding: 0.75rem;
	}

	/* The landing state earns the thick frame. */
	.centered .seed-card {
		border-width: 2px;
		padding: 1.5rem;
	}

	.brand {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
	}
	.mark {
		font-size: var(--text-lg);
		line-height: var(--leading-lg);
		color: var(--color-accent);
	}
	.title {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		line-height: var(--leading-xl);
		font-weight: 600;
		margin: 0;
	}

	.tagline {
		font-family: var(--font-display);
		font-style: italic;
		font-size: var(--text-base);
		line-height: var(--leading-base);
		color: var(--color-text-muted);
		margin: 0 0 1.5rem;
	}

	.input-row {
		display: flex;
		align-items: stretch;
	}

	.seed-input {
		flex: 1;
		min-width: 0;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-right: none;
		padding: 0.6875rem 0.875rem;
		color: var(--color-text);
		/* 16px keeps iOS from zooming in on focus. */
		font-size: var(--text-base);
		line-height: var(--leading-base);
		font-family: inherit;
	}
	.seed-input::placeholder {
		color: var(--color-text-muted);
		opacity: 1;
	}
	.seed-input:disabled {
		background: var(--color-tint);
	}

	.send {
		background: var(--color-accent);
		color: var(--color-bg);
		border: 1px solid var(--color-accent);
		width: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: var(--text-md);
		font-weight: bold;
	}
	.send:active:not(:disabled) {
		background: var(--color-accent-hover);
		border-color: var(--color-accent-hover);
	}
	/* Disabled is shown by the rule alone, not a faded pink: the glyph keeps
	   full contrast so it never drops below AA. */
	.send:disabled {
		background: var(--color-bg);
		border-color: var(--color-border);
		color: var(--color-text-muted);
		cursor: not-allowed;
	}

	.spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid var(--color-tint);
		border-top-color: var(--color-text);
		border-radius: 999px;
		animation: spin 800ms linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation-duration: 2400ms;
		}
	}

	.error {
		margin-top: 0.75rem;
		font-size: var(--text-sm);
		line-height: var(--leading-sm);
		color: var(--color-danger);
	}

	.hint {
		margin-top: 1.125rem;
		font-size: var(--text-2xs);
		line-height: var(--leading-2xs);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-muted);
		text-align: center;
	}
</style>
