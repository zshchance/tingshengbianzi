<!-- Copilot instructions for contributors and AI coding agents -->
# Project-specific Copilot instructions

These short instructions give an AI coding agent the minimum, actionable knowledge to be productive in this repository.

1. Big picture
- The app is a Wails (Go + frontend) desktop application located under `audio-recognizer/`.
- Frontend: `audio-recognizer/frontend` (built by `npm`/`wails`).
- Backend: Go code under `audio-recognizer/` with main entry in `audio-recognizer/main.go` and Wails bindings in `audio-recognizer/app.go`.
- Models: offline ASR models live in top-level `models/` (e.g. `models/zh-CN`, `models/en-US`).
- Config: runtime configuration in `audio-recognizer/config/` (notably `languages.json` and `default.json`).

2. Key developer workflows (commands you should suggest or run)
- Start dev environment: `./start-dev.sh` (calls `wails dev` and ensures models exist).
- Download models: `./audio-recognizer/scripts/download-models.sh` (downloads Vosk models into `models/`).
- Build (dev): `wails build -debug` or run `./audio-recognizer/scripts/build.sh` for full flow.
- Build (prod): `wails build -production` (CI should run the download-models script first).
- Go tooling: `go mod tidy`, `go test ./...` (unit tests), integration tests may require model files and are typically skipped if models are missing.

3. Project conventions & patterns (explicit, discoverable)
- Wails embedding: static frontend is embedded via `//go:embed all:frontend/dist` in `audio-recognizer/main.go`.
- Add backend RPC/API bindings by adding methods to `App` (in `audio-recognizer/app.go`) and exposing them in `main.go` `Bind` list.
- Audio/recognition modules live under `audio-recognizer/backend/` — look at `backend/audio` (ffmpeg + processor) and `backend/recognition` (Vosk client wrapper).
- Model layout expected by code/scripts: each model dir contains subfolders like `am/`, `conf/`, `graph/`, and must include `am/final.mdl` (see model validation in `scripts/download-models.sh` and recognition client).
- Languages are declared in `audio-recognizer/config/languages.json`; to add a language, add model files under `models/<code>` and add an entry to that JSON.

4. Integration points & external dependencies
- Vosk models (downloaded by `scripts/download-models.sh`). CI must run this before integration tests or production builds.
- FFmpeg is required at runtime for audio conversion; scripts check for `ffmpeg` and fail if missing.
- Wails CLI (`wails`) is required for dev/build commands.

5. What to change and where (common tasks)
- Add new RPC: implement method on `App` (in `audio-recognizer/app.go`), update any frontend calls (`frontend/js/*`), then rebuild frontend (`npm run build`) and run `wails build`.
- Add new model/language: place model under `models/<code>`, ensure structure matches `am/ conf/ graph/`, update `audio-recognizer/config/languages.json` and, if needed, `scripts/download-models.sh` for automated fetch.
- Add tests: unit tests live under `tests/unit` and Go tests go alongside packages. Integration tests under `tests/integration` may require models — assert model presence or skip when missing.

6. Small examples to use when editing code
- Start dev & ensure models:
```
./start-dev.sh
```
- Download models manually (if needed):
```
./audio-recognizer/scripts/download-models.sh
```
- Run Go unit tests:
```
cd audio-recognizer
go test ./...
```

7. Safety checks for PRs the agent might prepare
- Do not assume models exist: ensure code or CI step checks `models/` before running integration tests.
- Prefer `go mod tidy` and `npm install` steps in PRs that change imports/frontend deps.
- Keep Wails bindings backward-compatible: adding a new exported method requires frontend changes and rebuild of `frontend/dist`.

8. Files & locations to inspect first (quicklist)
- `audio-recognizer/main.go`, `audio-recognizer/app.go` — app wiring and bindings
- `audio-recognizer/wails.json` — frontend build commands and settings
- `audio-recognizer/scripts/download-models.sh` and `audio-recognizer/scripts/build.sh` — canonical commands
- `audio-recognizer/backend/` — audio and recognition logic
- `models/` and `audio-recognizer/config/languages.json` — model placement and language config
- `start-dev.sh` — local dev startup sequence

9. When to ask the human
- If a change requires adding or re-downloading large models, ask before running downloads.
- If uncertain which language/model to use for a change, ask which target language to modify/test.

If anything here is unclear or you want the instructions adapted (simpler, more detailed, or in Chinese), tell me which parts to change.
