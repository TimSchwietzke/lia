# lia

An offline exam trainer. Every course is a question bank file (`.json` or `.zip`); the app never
needs to change for a new course. See [QUESTION_FORMAT.md](QUESTION_FORMAT.md) for the bank format
and [SPEC.md](SPEC.md) for the full specification and milestones.

## Development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev        # dev server on http://localhost:5173
npm test           # unit tests
npm run lint       # oxlint + prettier check
npm run build      # type check + production build
```

In the dev build, progress lives in the browser (IndexedDB), and the banks in `subjects/` are loaded
alongside the ones added by drag and drop. Only the two example banks in `subjects/` are tracked by git.

## Code map

| Path                  | What it does                                                                           |
| --------------------- | -------------------------------------------------------------------------------------- |
| `src/bank/`           | Bank schema (Zod), loading `.json`/`.zip` files, readable errors                       |
| `src/practice/`       | Question selection, grading per question type, stats behind the dashboard              |
| `src/storage/`        | The storage interface and its IndexedDB implementation                                 |
| `src/state/store.ts`  | App state (Zustand); the only code that talks to storage                               |
| `src/lib/migrate.ts`  | Version migrations for banks and saved data                                            |
| `src/styles/`         | Design tokens (dark and light neumorphic palettes) and base styles                     |
| `src/ui/`             | Primitives (`Key`, `Panel`, `Chip`, `Bar`, `Segmented`), Markdown/KaTeX/code rendering |
| `src/views/overview/` | The dashboard tiles                                                                    |
| `src/views/`          | Header, Courses page, practice setup and session, one component per question type      |
| `src/i18n/`           | UI strings in English and German                                                       |

The visual reference is `design/dashboard-reference.dc.html`; the Design section of `SPEC.md` explains
the raised / sunk / key grammar the components follow.
