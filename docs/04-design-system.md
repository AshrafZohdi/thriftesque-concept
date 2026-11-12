# Design system

Source: option F, `design/options/f-sky.html` (chosen by the client, D-029). Tokens live in `app/globals.css` as Tailwind 4
`@theme` variables. Components never use raw colours (`scripts/check-tokens.mjs`).

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--color-ink` | `#0d0d0f` | text, frame lines, primary buttons, dark bands |
| `--color-bg` | `#f4f7fb` | page background |
| `--color-surface` | `#ffffff` | cards, sheets, inputs |
| `--color-soft` | `#4f5563` | secondary text |
| `--color-lime` | `#d6f84c` | ticker strip, price chips, locks, "Scroll down" bar |
| `--color-sky1` / `--color-sky2` | `#8ecbff` / `#d9efff` | sky backdrop (hero, look boards, builder stage) |
| `--color-band-grey` | `#8a8f99` | grey words in the black band |
| `--color-wa` | `#1a8048` | Send order on WhatsApp |
| chrome gradient | `#f7fbff` `#9fb0cc` `#ffffff` `#5b6d8e` `#dfe9f8` | the chrome heart and star (SVG) |

Type: Anton (headlines, uppercase), Space Mono 400/700 (labels, buttons, receipt, uppercase), Instrument Sans 400 to 700 (body).
Body is 16px. Inputs are always 16px. Corners are square everywhere (no radius), and frames are 1px ink lines.

## Contrast (WCAG 2.2 AA), measured 2026-11-12

| Pair | Ratio |
| --- | --- |
| ink on background / surface | 18.07 / 19.42 |
| soft on background / surface | 6.95 / 7.47 |
| ink on lime, lime on ink | 16.08 |
| band grey on ink | 5.98 |
| ink on sky1 | 11.22 |
| white on WhatsApp green | 4.97 |

All pass. Focus ring: 3px ink outline (18:1 on the background).

## Components

Lime ticker strip, framed header (logo cell, nav, black Bag cell), sky hero with a floating cut-out and chrome shapes, black word
band, look boards (collage of cut-outs with lime price tags), outfit builder (vertical cut-out stack with arrows, lock, Shuffle),
category chips, Hide sold toggle, framed product card (sky-tinted photo, lime price chip), product sheet, bag drawer with
receipt, toast.

Interaction rules carried over: `[hidden]{display:none!important}`, iOS-safe scroll lock, `:active` feedback instead of hover-only
effects, hover motion only under `(hover:hover)`, reduced motion turns off the tickers, floating shapes and slide animations, and
focus returns to the trigger when an overlay closes.

The previous palette (the approved concept mockup) and its contrast results are in git history for this file.
