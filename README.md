# lia

An offline exam trainer. Every course is a question bank file (`.json` or `.zip`); the app never
needs to change for a new course. See [QUESTION_FORMAT.md](QUESTION_FORMAT.md) for the bank format
and [SPEC.md](SPEC.md) for the full specification and milestones.

## Download

Ready-to-use builds for Windows, macOS and Linux are attached to each
[release](https://github.com/TimSchwietzke/lia/releases); every push also produces them as artifacts
of the [Build workflow](https://github.com/TimSchwietzke/lia/actions/workflows/build.yml). Each build
is a portable folder: the app, `subjects/` for question banks and `README.txt` (English and German)
for classmates. To build it yourself, see [BUILDING.md](BUILDING.md).

## Development

Requires Node.js 22 or newer, and Rust for the desktop app.

```bash
npm install
npm run dev        # the UI in the browser, on http://localhost:5173
npm run tauri dev  # the desktop app
npm test           # unit tests (TypeScript)
npm run lint       # oxlint + prettier check
npm run build      # type check + production build of the UI
cd src-tauri && cargo test   # unit tests (Rust)
```

In the browser, progress lives in IndexedDB and the banks in `subjects/` are loaded alongside the ones
added by drag and drop. The desktop app reads and writes files instead: `subjects/` and `data/` next to
the app, or in the repository during `tauri dev`. Only the two example banks in `subjects/` are tracked
by git.

## Code map

| Path                  | What it does                                                                           |
| --------------------- | -------------------------------------------------------------------------------------- |
| `src/bank/`           | Bank schema (Zod), loading `.json`/`.zip` files, readable errors                       |
| `src/practice/`       | Question selection, grading per question type, stats behind the dashboard              |
| `src/storage/`        | The storage interface: IndexedDB (browser) and files (desktop app)                     |
| `src/state/store.ts`  | App state (Zustand); the only code that talks to storage                               |
| `src/lib/migrate.ts`  | Version migrations for banks and saved data                                            |
| `src/styles/`         | Design tokens (dark and light neumorphic palettes) and base styles                     |
| `src/ui/`             | Primitives (`Key`, `Panel`, `Chip`, `Bar`, `Segmented`), Markdown/KaTeX/code rendering |
| `src/views/overview/` | The dashboard tiles                                                                    |
| `src/views/`          | Header, Courses page, practice setup and session, one component per question type      |
| `src/i18n/`           | UI strings in English and German                                                       |
| `src-tauri/`          | The desktop shell (Rust): folder layout, file commands, packaging config               |

The visual reference is `design/dashboard-reference.dc.html`; the Design section of `SPEC.md` explains
the raised / sunk / key grammar the components follow.
