# CLAUDE.md — Operational Guide

> **PRD.md is the source of truth** for vision, scope, architecture, phases, and product decisions.
> Read it first. This file only contains what PRD.md doesn't: how to work in this codebase.

---

## Repo Structure

```
sacred-commits-studio/
├── CLAUDE.md                       ← You are here
├── PRD.md                          ← Source of truth, read this first
├── README.md
├── package.json
├── .devcontainer/                  ← Codespaces config
├── data/
│   ├── mock-repo/                  ← Author/branch definitions (hand-curated)
│   │   ├── authors.json            ← Rabbi profiles: id, git_username, color, era, coordinates, bio
│   │   ├── branches.json           ← Branch definitions: id, diverged_from, divergence_year, color
│   │   ├── commits.json            ← Generated. Do not hand-edit.
│   │   ├── diffs.json              ← Generated. Do not hand-edit.
│   │   └── stats.json              ← Generated. Do not hand-edit.
│   └── sefaria/                    ← Gitignored. Regenerate with npm run fetch.
├── scripts/
│   ├── sefaria-client.js           ← Fetches Sefaria API → data/sefaria/
│   └── generate-repo.js            ← Generates the sacred-commits product repo
└── src/                            ← React visualization app
    ├── App.tsx
    ├── api/sefaria.ts
    └── components/
        ├── ContributionView/
        ├── DiffView/
        ├── Timeline/
        └── NetworkGraph/
```

---

## Data Schemas

### authors.json (hand-curated, safe to edit)
```typescript
{
  id: string
  git_username: string
  name: string
  hebrew: string
  era: 'Tannaim' | 'Amoraim' | 'Rishonim'
  born: number             // year CE
  died: number
  active_years: [number, number]
  location: string
  coordinates: [lat, lng]
  color: string            // hex — always use this for UI, never hardcode
  bio: string
}
```

### branches.json (hand-curated, safe to edit)
```typescript
{
  id: string
  display_name: string
  diverged_from: string | null
  divergence_year: number | null
  color: string
  status: 'root' | 'active' | 'annotation-layer'
}
```

---

## Scripts

```bash
npm run fetch       # Pull Berakhot from Sefaria API → data/sefaria/
npm run generate    # Generate sacred-commits product repo from data/
npm run data        # fetch + generate
npm run dev         # Vite dev server on :5173
npm run build       # Production build
```

---

## Coding Rules

- **TypeScript everywhere** in `src/` — no plain `.js`
- **Tailwind** for layout/spacing — **D3** for SVG visualizations
- **Never hardcode** text content, colors, or author names — load from data files
- **Never hand-edit** generated files (`commits.json`, `diffs.json`, `stats.json`) — edit the generator and re-run
- Components live in `src/components/ComponentName/index.tsx`
- Hebrew text needs `dir="rtl"`
- Use `year_ce` for display — `timestamp` is synthetic (year × 31536000), not a real Unix timestamp
- Sefaria API is rate-limited — the 300ms delay in `sefaria-client.js` is intentional, don't remove it
- The Yerushalmi branch has fewer commits than Bavli — handle missing chapters gracefully
