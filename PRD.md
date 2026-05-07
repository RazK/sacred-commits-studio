# Sacred Commits — Product Requirements Document

> **Version:** 0.2  
> **Status:** Draft  
> **Last Updated:** May 2026

---

## Vision & Core Concept

**Sacred Commits** is an interactive visualization platform that maps the evolution of ancient texts using the metaphor of version control — specifically Git. Centuries of collaborative scholarship are reimagined as a codebase: each scholar is a contributor, each commentary is a commit, each textual tradition is a branch, and each interpretive dispute is a merge conflict.

The platform launches with the Talmud (Mishna + Gemara) as its first corpus, with a broader vision to support any ancient text with a complex transmission history — the Torah, the New Testament, the Quran, the Iliad, the Epic of Gilgamesh, and beyond.

The project answers a fundamental question: *how did these texts become what they are today? Who contributed what, when, and how did interpretations diverge and converge across geography and time?*

---

## Problem Statement

The world's great ancient texts — the Talmud, the Bible, the Quran, the Iliad — are among the most complex collaborative documents in human history, developed over centuries by hundreds of scholars across multiple regions. Yet today:

- Their textual histories are inaccessible to non-specialists
- The relationships between parallel versions and traditions are rarely visualized
- Scholarly contributions are buried in dense commentary layers with no intuitive interface
- Textual variants across manuscripts are known only to academics

Sacred Commits solves this by giving anyone — scholars, historians, developers, and curious learners — an intuitive visual interface to explore these texts as living, evolving documents.

**MVP corpus: the Talmud** (Mishna + Gemara, starting with Tractate Berakhot). The architecture is designed from day one to support additional corpora.

---

## The Git Metaphor

The core conceit of this project is mapping ancient textual concepts to Git concepts. The table below shows the mapping using the Talmud as the first example corpus:

| Git Concept | Ancient Text Equivalent | Talmud Example |
|---|---|---|
| Repository | A single ancient text or corpus | The Talmud as a whole |
| Branch | A distinct textual tradition | Babylonian vs. Jerusalem Talmud |
| Commit | A scholarly addition or ruling | A rabbinic statement or commentary |
| Author / Git User | Individual scholar | Rashi, Maimonides, Rabbi Akiva |
| Commit Timestamp | Scholar's historical period | Tannaim, Amoraim, Rishonim |
| File / Module | A section or book | Tractate (e.g., Berakhot) |
| Diff | Textual variant between traditions | Bavli vs. Yerushalmi on same passage |
| Merge Conflict | Disputed interpretation | Resolved differently by different communities |
| Fork | Divergence into separate traditions | Ashkenazi vs. Sephardic readings |
| Pull Request | Commentary on a prior text | Rashi commenting on Gemara |
| Git Blame | Contribution layer view | Who wrote which layer of a passage |

Since no actual Git repo exists for these texts, we generate one programmatically using open data sources — populating commits, authors, and timestamps from real historical data.

---

## Data Sources

### Primary: Sefaria API

[Sefaria](https://www.sefaria.org) is a free, open-source digital library of Jewish texts with a fully documented public API. It provides:

- Full text of the Babylonian Talmud (Bavli) and Jerusalem Talmud (Yerushalmi) in Hebrew and English
- Rashi's commentary, Tosafot, and dozens of other classical commentators — all linked to source text
- Cross-references and connections between passages
- Multiple translations and scholarly editions

**API base URL:** `https://www.sefaria.org/api/`  
**License:** Creative Commons Attribution-NonCommercial 4.0

### Secondary: Manuscript Variants

The National Library of Israel's [Treasury of Talmudic Manuscripts](https://www.nli.org.il) provides digital copies of major manuscripts including the Kaufmann Mishnah and key Bavli/Yerushalmi manuscripts — enabling true textual diff comparisons between versions.

---

## Core Features

### 1. Contribution View (Git Blame)

The primary view overlays a passage of Talmud with color-coded annotations showing who contributed which layer:

- **Base layer** — Original Mishna text (Rabbi Yehuda HaNasi, ~200 CE)
- **Gemara layer** — Amoraim discussions (~200–500 CE)
- **Rashi layer** — Commentary highlighted in a distinct color (~1040–1105 CE)
- **Tosafot / Rishonim** — Additional commentary layers

Hover over any segment to see: author, era, geographic origin, and a link to the Sefaria source.

### 2. Version Diff View

Side-by-side comparison of the same passage across different versions:

- **Bavli vs. Yerushalmi** — the two canonical branches
- Standard diff coloring: green for additions, red for removals, yellow for changes
- Manuscript variant layer (e.g., Kaufmann Mishnah vs. standard printed edition)
- Toggle between unified diff and split diff views

### 3. Commit History Timeline

A Git log-style view showing the chronological development of a selected tractate or passage:

- Vertical timeline from ~200 BCE to ~1500 CE
- Each commit: author name, era, geographic location, short description
- Filter by era (Tannaim / Amoraim / Geonim / Rishonim), geography, or tractate
- Click any commit to jump to the Contribution View for that addition

### 4. Influence Network Graph

A force-directed graph showing relationships between rabbis and texts:

- **Nodes** = individual rabbis or tractates
- **Edges** = direct quotation, commentary relationship, or textual influence
- **Node size** = volume of contribution
- **Edge weight** = frequency of citation
- Reveals intellectual communities and the most interconnected tractates

### 5. Tractate Explorer

A file-browser metaphor (like a GitHub repo view) for navigating the Talmud:

- 6 Orders (Sedarim) as top-level folders
- 63 Tractates as subfolders
- Individual Mishna and Gemara chapters as files
- Each file shows: contributor count, last modified era, commentary count, variant count

---

## MVP Scope

To keep the first version focused and deliverable:

| Dimension | MVP Decision |
|---|---|
| Tractates | Start with **Tractate Berakhot** (first and most studied) |
| Branches | Bavli vs. Yerushalmi on the same passages |
| Contributors | Rashi, Tosafot, Maimonides + original Tanna/Amora attributions |
| Languages | English (via Sefaria) with Hebrew original toggle |
| Views | Contribution View + Diff View |
| Data | Live Sefaria API + programmatically generated mock Git repo |
| Platform | Web app (React + D3.js) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript |
| Visualization | D3.js (graphs, timelines), custom diff renderer |
| Data | Sefaria REST API |
| Mock Repo | Generated JSON simulating Git objects (commits, trees, blobs) |
| Styling | Tailwind CSS |
| Hosting | Vercel / GitHub Pages |

---

## Repo Structure

Two repos, clear separation of concerns:

### `sacred-commits-studio` — the studio (develop here)
```
sacred-commits-studio/
├── CLAUDE.md               ← operational guide for Claude Code
├── PRD.md                  ← this document
├── README.md
├── data/
│   └── mock-repo/          ← author/branch definitions (source of truth)
├── scripts/
│   ├── sefaria-client.js   ← fetches text from Sefaria API
│   └── generate-repo.js    ← generates the product repo as a real Git repo
└── src/                    ← React visualization app
```

### `sacred-commits` — the product (generated, never hand-edited)
```
sacred-commits/
├── berakhot/
│   ├── chapter-01-mishna.md
│   ├── chapter-01-gemara.md
│   └── chapter-01-rashi.md
└── README.md               ← auto-generated
```
This repo has real Git commits authored by historical rabbis. Running `git log` shows 1,300 years of scholarship. Running `git diff bavli yerushalmi` shows actual textual differences between traditions.

---

## Development Phases

### Phase 1 — Data & Mock Repo (Week 1–2)
- Pull Tractate Berakhot from Sefaria API
- Build mock Git repo JSON with rabbis as authors, passages as commits
- Map historical dates to commit timestamps
- Generate Bavli and Yerushalmi as two divergent branches

### Phase 2 — Contribution View (Week 3–4)
- Build text display with color-coded contributor layers
- Implement hover tooltips: author bio, era, geography, Sefaria link
- Add contributor legend and filter controls

### Phase 3 — Diff View (Week 5–6)
- Build side-by-side Bavli vs. Yerushalmi diff
- Implement diff highlighting
- Add manuscript variant layer toggle

### Phase 4 — Polish & Expand (Week 7+)
- Add commit history timeline
- Expand to additional tractates
- Add influence network graph
- Mobile responsiveness

---

## Success Metrics

- A scholar can identify Rashi's contribution to any passage in under 3 clicks
- Any passage can be diffed between Bavli and Yerushalmi in one interaction
- The visualization is legible to someone with zero prior Talmud knowledge
- A developer familiar with Git immediately understands the interface without explanation

---

## Open Questions

- [ ] Should Hebrew text be the default, with English as a toggle?
- [ ] How granular should attribution be — by sentence, paragraph, or sugya?
- [ ] Should the mock Git repo be downloadable as a real `.git` repo for developers?
- [ ] **V2 corpora:** Torah, New Testament, Quran, Iliad — which comes next after Talmud?
- [ ] What open data sources exist for other corpora? (Sefaria covers Jewish texts; what's the equivalent for Quran, NT manuscripts?)
- [ ] V2: User accounts so scholars can annotate and contribute corrections?
- [ ] Long term: could this become an open standard for encoding textual transmission history?
