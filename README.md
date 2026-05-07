# Sacred Commits Studio

> The development studio for [Sacred Commits](https://github.com/razk/sacred-commits) — a Git-inspired platform for visualizing how ancient texts were written, branched, and debated across centuries.

## Quick Start

```bash
npm install
npm run fetch      # Pull Tractate Berakhot from Sefaria API
npm run generate   # Generate the sacred-commits product repo
npm run dev        # Start the visualization app on :5173
```

## What This Does

`npm run generate` produces a real Git repository where:
- Each commit is authored by a historical rabbi with a real `--author` and `--date`
- `main` branch = the Mishna (~200 CE, Rabbi Yehuda HaNasi)
- `bavli` branch = Babylonian Talmud (~220–500 CE)
- `yerushalmi` branch = Jerusalem Talmud (~220–400 CE)
- `rashi-commentary` branch = Rashi's glosses (~1080 CE)
- `tosafot-commentary` branch = Tosafist critical notes (~1150–1300 CE)

Run `git log --all --oneline --graph` in the output repo to see 1,300 years of scholarship.

## See Also

- [PRD.md](PRD.md) — product vision and requirements
- [CLAUDE.md](CLAUDE.md) — operational guide for Claude Code
