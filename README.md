This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, version 3.

---

# Taste Translator

A living map of your aesthetic universe. Type something you love (a film, a record, a building, a whisky) and Claude reads its "aesthetic DNA" and suggests neighbours across every medium. Rate what comes back, and the map pulls what you love in close and pushes what you don't to the edges. Each new seed finds bridges to what's already there.

## Reading the map

The `?` button beside the zoom controls opens the key. In short:

- **Lines:** pink if you love one end, ink from a seed you typed, gray otherwise. Dashed lines are bridges the translator found; dotted ones you drew yourself. Thicker means stronger.
- **Cards:** a thick frame is a seed. Pink border means "really like", pink fill "part of me", dashed "not for me", dotted and struck through "hard no" (hidden unless *Show Exiled* is on).

Hover a card with a mouse, tap it on a touch screen, or Tab to it to rate it, translate from it (↯), or drag a link (→) to another card. Explorations save in your browser as you go.

## Running it

```sh
npm install
cp .env.example .env   # then add your ANTHROPIC_API_KEY
npm run dev
```

`npm run check` type-checks, and `npm run build` builds for Cloudflare Pages (`@sveltejs/adapter-cloudflare`). Set `ANTHROPIC_API_KEY` as a secret in the Pages project.

## Design

The look comes from the Wjerk kit in `~/Code/color-system-and-guidelines`: warm cream ground, brown-black line work, pink as the one accent, structure from rules rather than shadows, and a measured dark mode. `src/lib/kit.css` is a verbatim copy of the kit's `kit.css`, so don't edit it here. Update it in the kit and copy it across. Project tokens (edge colours, the tint, the core-card fill) live in `src/app.css`, each with its measured contrast ratio.

Type is Fraunces (OFL, self-hosted via Fontsource) for titles over the system sans. The app icon, from the kit's icon family, is in `static/` with its source SVG at `TasteTranslator.svg`.

Everything meets WCAG AA: text contrast is computed, not eyeballed, focus is always visible, and every control works by keyboard and touch.

## Stack

SvelteKit (Svelte 5 runes) · Tailwind CSS 4, mapped to the kit's tokens · Anthropic SDK · Cloudflare Pages.
