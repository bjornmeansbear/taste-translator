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
				<div class="mark">◉</div>
				<div class="title">Taste Translator</div>
			</div>
			<div class="tagline">A living map of your aesthetic universe.</div>
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
			<div class="error">{error}</div>
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
		top: 24px;
		width: min(560px, calc(100vw - 32px));
		transition:
			top 700ms cubic-bezier(0.2, 0.9, 0.2, 1),
			width 700ms cubic-bezier(0.2, 0.9, 0.2, 1);
	}

	.seed-wrap.centered {
		top: 28vh;
		width: min(620px, calc(100vw - 32px));
	}

	.seed-card {
		background: linear-gradient(
			150deg,
			rgba(18, 16, 32, 0.78),
			rgba(10, 9, 20, 0.66)
		);
		backdrop-filter: blur(22px) saturate(140%);
		-webkit-backdrop-filter: blur(22px) saturate(140%);
		border: 1px solid rgba(255, 255, 255, 0.09);
		border-radius: 18px;
		padding: 14px;
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.05) inset,
			0 20px 60px -20px rgba(0, 0, 0, 0.8);
	}

	.centered .seed-card {
		padding: 28px 28px 22px;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 6px;
	}
	.mark {
		font-size: 22px;
		color: rgba(244, 114, 182, 0.9);
		filter: drop-shadow(0 0 10px rgba(244, 114, 182, 0.6));
	}
	.title {
		font-family: 'Fraunces', ui-serif, Georgia, serif;
		font-size: 26px;
		font-weight: 600;
		letter-spacing: 0.005em;
		color: rgba(248, 250, 252, 0.97);
	}

	.tagline {
		font-size: 13px;
		color: rgba(203, 213, 225, 0.65);
		margin-bottom: 22px;
		font-style: italic;
		font-family: 'Fraunces', ui-serif, Georgia, serif;
	}

	.input-row {
		display: flex;
		gap: 10px;
		align-items: stretch;
	}

	.seed-input {
		flex: 1;
		background: rgba(8, 7, 16, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		padding: 12px 16px;
		color: rgba(248, 250, 252, 0.95);
		font-size: 14px;
		outline: none;
		transition: border-color 200ms ease, background 200ms ease;
		font-family: inherit;
	}
	.seed-input::placeholder {
		color: rgba(148, 163, 184, 0.5);
	}
	.seed-input:focus {
		border-color: rgba(167, 139, 250, 0.6);
		background: rgba(8, 7, 16, 0.9);
	}
	.seed-input:disabled {
		opacity: 0.6;
	}

	.send {
		background: linear-gradient(135deg, rgba(167, 139, 250, 0.95), rgba(244, 114, 182, 0.9));
		color: rgba(10, 9, 20, 0.95);
		border: none;
		border-radius: 12px;
		width: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 18px;
		font-weight: 700;
		transition: transform 150ms ease, opacity 200ms ease, filter 200ms ease;
		box-shadow: 0 8px 24px -8px rgba(167, 139, 250, 0.6);
	}
	.send:hover:not(:disabled) {
		transform: translateY(-1px);
		filter: brightness(1.1);
	}
	.send:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
	.arrow {
		transform: rotate(0deg);
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(10, 9, 20, 0.3);
		border-top-color: rgba(10, 9, 20, 0.95);
		border-radius: 50%;
		animation: spin 800ms linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error {
		margin-top: 10px;
		font-size: 12px;
		color: rgba(251, 146, 146, 0.9);
	}

	.hint {
		margin-top: 16px;
		font-size: 10px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(148, 163, 184, 0.4);
		text-align: center;
	}
</style>
