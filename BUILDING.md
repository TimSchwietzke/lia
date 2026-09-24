# Building lia yourself

The [releases](https://github.com/TimSchwietzke/lia/releases) have ready-made builds. Building it
yourself takes a few minutes and has one advantage: an app you built on your own computer does not
trigger the Windows SmartScreen or macOS Gatekeeper warnings, because those only apply to
downloaded files.

## Prerequisites

Everyone needs [git](https://git-scm.com/), [Node.js](https://nodejs.org/) 22 or newer and
[Rust](https://rustup.rs/) (install it with rustup).

**Windows 10/11**

- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/): in the
  installer, select "Desktop development with C++".
- WebView2 is already part of Windows 10 and 11.

**macOS 12 or newer**

```bash
xcode-select --install
```

**Linux (Debian, Ubuntu and derivatives)**

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev xdg-utils
```

Other distributions: see the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

## Build

```bash
git clone https://github.com/TimSchwietzke/lia.git
cd lia
npm ci
```

Then, depending on your system:

| System  | Command                                     | Result                                                |
| ------- | ------------------------------------------- | ----------------------------------------------------- |
| Windows | `npm run tauri build -- --no-bundle`        | `src-tauri\target\release\lia.exe`                    |
| macOS   | `npm run tauri build -- --bundles app`      | `src-tauri/target/release/bundle/macos/lia.app`       |
| Linux   | `npm run tauri build -- --bundles appimage` | `src-tauri/target/release/bundle/appimage/*.AppImage` |

## Set up the portable folder

Put the app into a folder of its own and create a `subjects` folder next to it. Question banks go
into `subjects`; lia creates `data` for your progress on first start. The example banks are in the
repository's `subjects` folder. See `README.txt` for how to use lia.

## Development

`npm run tauri dev` starts the desktop app with live reload. It uses the repository's `subjects/`
folder and a git-ignored `data/` folder. `npm run dev` runs the same UI in the browser, with
progress stored in the browser instead of files.
