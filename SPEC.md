# Project: Exam Trainer (learn it all – lia)

A portable, offline study app for university courses.

## Context

I'm a CS student. For every exam I've been having an LLM generate a standalone HTML quiz app. I want to replace that with ONE app where each course is just a data file ("question bank"). From now on, an LLM should only ever generate question-bank files, never app code. This app fully replaces Anki for me.

Hard requirements:

- 100% offline. No backend, no hosting, no network requests at runtime, no CDN assets (bundle all fonts, KaTeX assets, etc.).
- Portable: I zip the app folder and send it to classmates. They unzip it, double-click the app, and it works. No installation, no terminal, no dev tools.
- Runs on Windows, macOS, and Linux.
- Classmates add courses by dropping files into a folder or via drag & drop. Each person has their own local progress.

## Development environment

- I work in WSL2 (Ubuntu) on Windows 11. The project lives in the Linux filesystem (not under `/mnt/c`).
- I open the Vite dev server in my Windows browser via localhost. Tauri windows show up via WSLg.
- Windows and macOS binaries are built by GitHub Actions, not locally.
- If system packages are needed (e.g. Tauri's Linux dependencies), give me the exact `sudo apt install ...` command and wait for me to run it. Same for anything requiring interactive login.

## Workflow rules

- Before writing code: read this whole file, then propose the project structure, data model, and library choices, and ask me about anything unclear. Wait for my OK.
- Work milestone by milestone. After each milestone: make sure it builds, lint passes, tests pass, commit, push, give me a short summary with how to try it, then STOP and wait for my feedback.
- Prefer well-maintained libraries over hand-rolled solutions. Keep the code clean and typed; I want to be able to read and extend it myself.

## Repository setup (do this first, before any other commit)

- `git init`, then create a `.gitignore` that excludes everything in `subjects/` except the example bank, plus `data/`, build output, and `node_modules/`. This must be part of the very first commit, because real question banks may contain lecture content that must never enter the git history.
- Save this spec as `SPEC.md` in the repo root, so later sessions can re-read it.
- Create a private GitHub repo with `gh repo create` (I'm already logged in with `gh auth login`) and push. I will make it public before M2.

## Tech stack

- React + Vite + TypeScript (strict), wrapped with Tauri as a desktop app
- Zod for validating question banks (clear, human-readable error messages on invalid files)
- All persistence goes through a single storage layer with two implementations: a browser implementation (IndexedDB via Dexie) for development, and a file-based implementation for the Tauri build. UI code never touches storage directly.
- Versioned data format for banks and progress, with migrations, so progress survives app updates
- Stable IDs for all records and `updatedAt` timestamps on every write
- Markdown rendering with math (KaTeX) and syntax-highlighted code blocks
- Animations: Framer Motion (subtle, never slow)
- i18n from day one: UI in English (default) and German, switchable. No hardcoded UI strings. Question content language is independent of UI language.
- Unit tests (Vitest) for the schema, question selection logic, scoring, and migrations

## Portable folder layout (Tauri build)

```
ExamTrainer/
  ExamTrainer(.exe / .app / .AppImage)
  subjects/     <- question banks (.json or .zip), scanned at every app start + "reload" button
  data/         <- progress, settings, backups, exam exports (created automatically)
  README.txt    <- short guide for classmates (EN + DE)
```

- If the app folder is not writable (e.g. Program Files on Windows, or the app bundle on macOS), fall back to the OS's per-user app data folder and show where data is stored.
- Updating = replacing the app file; `subjects/` and `data/` stay untouched.
- Buttons: "Open subjects folder", "Open data folder".

## Question bank format

- One bank per course: a `.json` file, or a `.zip` containing the JSON plus an `images/` folder.
- Two ways to add banks: drop them into `subjects/`, or drag & drop into the running app (which copies them into `subjects/`).
- Updating a bank with the same course ID keeps all progress. Progress is tied to stable question `id`s. Invalid banks are skipped with a readable error shown in the app and never crash it.
- Bank metadata: course id, display name, version, list of topics, optional emoji/color for the course card
- Every question has: `id` (stable, unique), `topic`, `type`, `difficulty` (1–3), optional `tags`, `explanation`, optional `source` (e.g. "Slides 3, slide 12"). All text fields support Markdown + LaTeX + code blocks + image references (relative to the bank's `images/` folder).
- Question types:
  - `single_choice` and `multiple_choice`
  - `flashcard` (front/back, I rate myself: again / hard / good / easy)
  - `cloze` (fill in the blanks, works for prose and for code; per-blank accepted answers, optional case/whitespace-insensitivity)
  - `free_text`: I write an answer, then see a model answer plus a checklist of key points and tick off which I covered -> score = share of key points. Keep grading pluggable.
- Deliverable: `QUESTION_FORMAT.md` — the spec an LLM will read to generate new banks: full schema, one example per question type, rules for writing good questions (plausible distractors, one concept per question, stable ID scheme, citing slides), how to reference images, and how to package a `.zip`. Also ship an example bank with a few questions of every type.

## Design

- Modern, playful but sleek: claymorphism (soft pastel colors, strongly rounded shapes, soft inner/outer shadows, cards that slightly "squish" on interaction)
- Home = dashboard: one clay card per course with progress ring, due count, and quick actions
- Practice view = calm and focused, minimal distractions
- Light and dark mode; the dark mode needs its own tuned clay palette, not inverted colors
- Readability first: good contrast, comfortable font sizes, fully usable with keyboard (number keys for options, Enter to continue, Space to flip cards)
- Target: laptop screens

## Milestones

### M1 – Foundation + free practice (browser dev build)

Schema + validation, storage layer (IndexedDB implementation), drag & drop import, rendering of all content, all question types, attempt log (question id, correct/score, timestamp, duration, mode), free practice mode (pick course, optionally topics and question type, shuffled), basic dashboard, i18n, light/dark clay design, `QUESTION_FORMAT.md` + example bank.

### M2 – Portable Tauri app + cross-platform builds (I make the repo public before this milestone)

Tauri wrapper, file-based storage implementation, the portable folder layout above incl. the fallback data location, runtime scanning of `subjects/`. Verify it runs fully offline.

- Platforms: Windows (portable exe), macOS (universal .app in a .dmg or zip), Linux (AppImage).
- GitHub Actions workflow that builds all three platforms on every tagged release and attaches ready-to-use zips (app + empty `subjects/` + example bank + README) to the GitHub release. No code signing.
- README.txt (EN + DE) for classmates: how to start the app on each OS, including the one-time steps for Windows SmartScreen ("More info" -> "Run anyway"), macOS Gatekeeper (System Settings -> Privacy & Security -> "Open anyway"), and Linux (`chmod +x`).
- BUILDING.md for classmates who prefer to build it themselves (prerequisites per OS, exact commands). Mention that self-built binaries don't trigger the OS warnings.

### M3 – Statistics & weak spots

Per-course/per-topic stats, a "weakest questions" mode across ALL courses (error rate + recency), export/import of all progress as a backup file.

### M4 – Spaced repetition

Use an established algorithm library (e.g. ts-fsrs). Daily "due reviews" across all courses on the dashboard. Map non-flashcard results to review ratings sensibly.

### M5 – Exam simulation

Timed mock exam: choose course, topics, number of questions, time limit. No feedback until submission, then full evaluation. Save the attempt (questions, my answers, key-point ticks, times) as a JSON file in `data/exports/` that I can give to an LLM for grading and to generate follow-up exercises. Document that format in `QUESTION_FORMAT.md`.

### M6 – Anki export

Select questions (by course, topic, tag, or hand-picked with checkboxes) and export them for Anki:

- `flashcard` -> Basic note, `cloze` -> Cloze note (`{{c1::...}}`)
- `single_choice` / `multiple_choice` -> Basic note: question + options on the front, correct answer(s) + explanation on the back
- `free_text` -> Basic note: question on the front, model answer + key points on the back
- Convert LaTeX to Anki's MathJax syntax (`\(...\)` / `\[...\]`), render code blocks as highlighted HTML with inline styles, include images
- Prefer `.apkg` (images included) if a reliable, maintained library exists; otherwise a tab-separated text file plus an images folder with instructions. Tell me which you chose and why.
- Tag notes with course and topic; keep the question `id` in a field so re-exports update notes instead of duplicating them

### M7 – Gamification

XP, levels, daily streak, plus a small meta-game: earn coins, spend them in a shop on upgrades for something that grows over time. Coins must reward real learning: more for due reviews, hard questions, and exam simulations; diminishing returns for repeating easy questions I already know. Before implementing, propose 3 meta-game themes with a short description each and wait for my choice.

## Decisions

Agreed during planning (2026-09-23). Later sessions: treat these as part of the spec.

- **Name:** the app is called **lia** everywhere (window title, wordmark, portable folder `lia/`, binaries `lia.exe` / `lia.app` / `lia.AppImage`). "learn it all" is not shown in the UI.
- **Look:** no vibecoded tells: no filler text, no decorative gradients, no em dashes in UI strings or docs.
- **Bank format:** `format: "lia-bank"`, `formatVersion: 1`, topics are plain strings, course colour is one of six named pastels, strict validation (unknown fields are errors). Full spec in `QUESTION_FORMAT.md`.
- **Example banks:** `subjects/example.json` (all question types) and `subjects/example-images.zip` (with an `images/` folder). Both ship in `subjects/` and are the only tracked files there.
- **Scoring:** single choice all or nothing; multiple choice = share of options judged right, correct only if all; cloze = share of blanks; flashcard again 0 / hard 0.5 / good 1 / easy 1 (only "again" is wrong); free text = share of key points, correct from 75 %.
- **Import:** a bank with an existing course id replaces the old file and keeps progress (notice, no confirm dialog); duplicate course ids on disk: first file wins, the other is shown as an error.
- **Stack:** Vite 8, React 19, TypeScript strict, Zod 4, Dexie 4, Zustand, react-markdown + remark-gfm + remark-math + rehype-katex, Shiki (JS regex engine, bundled languages, Catppuccin themes), fflate, Motion, i18next, lucide-react, Fontsource (Nunito, JetBrains Mono), CSS Modules. Lint: oxlint (the current Vite template default) + Prettier.
- **Highlighted languages:** python, java, c, cpp, csharp, javascript, typescript, sql, bash, haskell, prolog, rust, go, kotlin, json, yaml, html, xml, css, latex, asm.
