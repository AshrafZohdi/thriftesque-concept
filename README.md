# Thriftesque

Website for Thriftesque, a secondhand clothing shop in Qatar. Built by Nuvai Solutions.

- Photo catalogue of one-of-one pieces, orders sent through WhatsApp
- Team dashboard for adding and managing products, with AI autofill from photos

## Repo layout

| Path | What it is |
| --- | --- |
| `index.html` | Approved concept mockup, live on Vercel as the client demo. Single file, photos embedded. |
| `design/mockup-source.html` | Readable source of the mockup. Open in a browser; photos load from `design/img/`. |
| `design/img/` | 21 sample product photos (CC0, from alexeygrigorev/clothing-dataset-small). |
| `design/seed-products.json` | Sample products matching the photos, for seeding the database. |
| `CLAUDE.md` | Project brief: decisions, stack, data model, constraints. |

The production app (Next.js + Supabase on Cloudflare) is built on the `dev` branch. `main` stays the demo until launch.
