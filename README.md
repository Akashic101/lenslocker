# LensLocker
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Akashic101/lenslocker)

LensLocker is a self-hosted web app for **organizing camera RAW files and their metadata** — it is not a general-purpose photo library for JPEG/PNG consumer snapshots. Uploads are restricted to **RAW and similar sensor formats** (plus DNG/TIFF where supported), along with generated **preview images** for the grid and detail views. You get a searchable gallery, albums, hardware (cameras/lenses) tracking, an optional "needs attention" dashboard, and statistics derived from EXIF metadata.

**What it is not:** a replacement for Apple Photos, Google Photos, Immich, or Photoprism. There is no intent to store phone screenshots or edited exports unless you deliberately treat those as part of this workflow.

---

## Features at a glance

- **RAW-first uploads** — the server and UI both enforce allowed extensions (CR2, CR3, NEF, ARW, RAF, DNG, TIFF). JPEG/PNG are not accepted as RAW uploads.
- **SQLite + local files** — metadata and auth live in SQLite; originals and previews live on disk paths you control.
- **Previews** — configurable pipeline (formats, sizes, quality) under **Settings → Upload**.
- **Albums, starring, archive** — multi-select on the dashboard for quick actions.
- **RAW batch uploads** — upload as many files as you want, with a live estimate of the remaining time.
- **Gallery sort** — sort by date/time, ISO, file size, and more.
- **Personalization** — choose your preferred language, theme, and time format.
- **Progressive Web App** — install to your home screen in a single click on any OS or platform.
- **Hardware catalog** — track cameras, lenses, and accessories; suggestions can be populated automatically from upload metadata.
- **Backups (two kinds)** — see [Backing up your data](#backing-up-your-data): **photo files** on disk, and the **built-in settings/database backup** from the UI (plain ZIP or optional password-protected `.llbak`).

---

## Requirements

- [Docker](https://docs.docker.com/get-docker/) and the Compose plugin — required for the Docker Compose setup. The image includes **Perl** so ExifTool can process RAW files.
- [Bun](https://bun.sh) — required for bare-metal setups (development or production without Docker).

---

## Docker Compose (recommended)

Docker Compose is the easiest way to run LensLocker. The container entrypoint runs `bun run db:push` before starting the app, so the SQLite database is created and kept up to date automatically.

### Local trial

Create a `docker-compose.yml` with the following contents, then run `docker compose up -d` and open [http://localhost:3000](http://localhost:3000).

```yaml
services:
  lenslocker:
    image: akashic/lenslocker:latest
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      DATABASE_URL: /data/lenslocker.db
      TRANSFORMED_MEDIA_ROOT: /data/transformed
      RAW_UPLOAD_ROOT: /data/uploads/raw
      RAW_IMPORT_ROOT: /data/uploads/import
      LENSLOCKER_BACKUP_ROOT: /data/backups
      ORIGIN: ${ORIGIN:-http://localhost:3000}
      # CHANGE THIS before exposing the app to a network — use a random string of 32+ characters.
      BETTER_AUTH_SECRET: 'CHANGE_ME_use_a_long_random_string_here'
      NODE_ENV: production
      HOST: 0.0.0.0
      PORT: '3000'
    volumes:
      - ./data:/data
```

> **Note:** `BETTER_AUTH_SECRET` must be changed to a long random string before the app is reachable by anyone other than yourself. Anyone who knows the secret could forge session tokens.

### Production

Create a `.env` file in the same directory as `docker-compose.yml` (start from [.env.example](.env.example)) and set at minimum:

- `BETTER_AUTH_SECRET` — a random string of 32 or more characters.
- `ORIGIN` — the public URL users will access the app from (e.g. `https://photos.example.com`).

Docker Compose reads `.env` automatically and uses it to override the defaults in `docker-compose.yml`.

### Data directories

The host folder `./data` (next to `docker-compose.yml`) is bind-mounted to `/data` inside the container:

| Purpose                    | Path inside container  | Host path (default)     |
| -------------------------- | ---------------------- | ----------------------- |
| SQLite database            | `/data/lenslocker.db`  | `./data/lenslocker.db`  |
| Uploaded RAW files         | `/data/uploads/raw`    | `./data/uploads/raw`    |
| Import inbox (disk import) | `/data/uploads/import` | `./data/uploads/import` |
| Generated previews         | `/data/transformed`    | `./data/transformed`    |
| Settings ZIP backups       | `/data/backups`        | `./data/backups`        |

---

## Bare-metal

Use this setup if you want to run the app directly on the host without Docker.

### Local development

1. Clone the repository and install dependencies:

```sh
 bun install
```

2. Copy the environment template and fill in the required values:

```sh
 cp .env.example .env
```

At minimum, set `DATABASE_URL` (e.g. `local.db`). For anything exposed beyond localhost, also set `ORIGIN` and `BETTER_AUTH_SECRET` (see [.env.example](.env.example)). 3. Apply the database schema:

```sh
 bun run db:push
```

4. Start the development server:

```sh
 bun dev
```

5. Open the app at the default Vite port: [http://localhost:5173](http://localhost:5173).

### Production

This project uses [@sveltejs/adapter-node](https://svelte.dev/docs/kit/adapter-node), which produces a Node-compatible server under `build/`.

1. Build the app:

```sh
 bun run build
```

2. Run `bun run db:push` once before the first start, and again whenever the schema changes.
3. Start the production server:

```sh
 bun run start
```

Key environment variables to set for production:

- `ORIGIN` — the public URL users will access the app from (required by Better Auth).
- `BETTER_AUTH_SECRET` — a random string of 32 or more characters.
- `DATABASE_URL`, `RAW_UPLOAD_ROOT`, `RAW_IMPORT_ROOT`, `TRANSFORMED_MEDIA_ROOT` — point these at persistent directories on the host. See [Environment variables](#environment-variables).

To smoke-check a production build locally before deploying:

```sh
bun run preview
```

---

## Environment variables

See [.env.example](.env.example) for full descriptions. Summary:

| Variable                 | Purpose                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | SQLite database file path (required).                                                                                                                   |
| `ORIGIN`                 | Public site URL; required in production for auth.                                                                                                       |
| `BETTER_AUTH_SECRET`     | Session/crypto secret. Must be set to a long random string for any deployment beyond localhost.                                                         |
| `RAW_UPLOAD_ROOT`        | Absolute path for uploaded RAW files. Default: `<cwd>/data/uploads/raw` (organized into year/month subfolders).                                         |
| `RAW_IMPORT_ROOT`        | Inbox for **Import from disk** on `/upload`. Defaults to `<cwd>/data/uploads/import`. Files are moved into `RAW_UPLOAD_ROOT` after a successful import. |
| `TRANSFORMED_MEDIA_ROOT` | Absolute path for generated previews (e.g. `upload-previews/…`). Default: `<cwd>/static/transformed`.                                                   |
| `LENSLOCKER_BACKUP_ROOT` | Directory where **Settings → Backup** ZIP files are written and listed. Default: project directory if unset.                                            |

After changing Better Auth configuration in code, regenerate the auth schema and push the updated schema to the database:

```sh
bun run auth:schema && bun run db:push
```

---

## Working on the codebase

| Command                 | Use                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `bun run dev`           | Development server with HMR.                                                                                          |
| `bun run build`         | Production build.                                                                                                     |
| `bun run start`         | Run the production server (`node build` via package script).                                                          |
| `bun run check`         | Svelte check + TypeScript.                                                                                            |
| `bun run lint`          | Prettier + ESLint.                                                                                                    |
| `bun run format`        | Auto-format with Prettier.                                                                                            |
| `bun run test`          | Unit tests (Vitest, server project, run mode).                                                                        |
| `bun run test:coverage` | Same with **v8 coverage** (`coverage/` + `coverage/lcov.info`). Uses `--project server` so Playwright is not started. |
| `bun run test:unit`     | Vitest in watch mode (all projects).                                                                                  |
| `bun run db:push`       | Apply Drizzle schema to SQLite (dev/prod).                                                                            |
| `bun run db:studio`     | Open Drizzle Studio (inspect DB).                                                                                     |

Other libraries in daily use include **TypeScript**, **Tailwind CSS**, **Paraglide** (inlang), **Flowbite**, and **Lucide** icons via `@lucide/svelte`. The sections below cover the three pieces that hold the app together: the UI framework, the database layer, and authentication.

---

## Contributing

Pull requests are welcome. Keep changes focused on a single concern, match existing patterns (TypeScript, formatting, naming), and run `bun run lint`, `bun run check`, and `bun run test` locally before opening a PR.

### Test coverage

Vitest (with the **server** project) enforces at least **95% coverage** for statements, branches, functions, and lines on the files included in the report (`src/lib/**/*.ts`, excluding tests, generated Paraglide output, and `src/lib/server/`). Thresholds are defined in `[vite.config.ts](vite.config.ts)`. Check coverage locally with:

```sh
bun run test:coverage
```

### Continuous integration

`[.github/workflows/ci.yml](.github/workflows/ci.yml)` runs on pushes and pull requests to `main` (and can be triggered manually). It installs with a frozen lockfile, runs `bun run lint` (Prettier + ESLint), `bun run test:unit -- --run --coverage --project server` (same thresholds as above), then `bun run build`. PRs should pass this workflow before review.

### Use of AI

Using AI coding assistants (Cursor, Copilot, chat tools, and similar) is acceptable. You must disclose this in the PR description (or clearly in commit messages when it materially shaped the change) so reviewers know how the patch was produced.

You remain responsible for correctness, security, and fit with this codebase. Obvious slop like generic filler, unreviewed hallucinations, noisy refactors, or copy-paste that does not match project style will not be accepted.

---

## Better Auth, Drizzle, and SvelteKit

LensLocker is a [SvelteKit](https://kit.svelte.dev) app on [Svelte 5](https://svelte.dev). Routes under `src/routes/` define pages and server endpoints; `+page.server.ts` / `+layout.server.ts` load data and enforce access, while `+server.ts` files implement JSON APIs (gallery, uploads, settings). This split keeps heavy work on the server and leaves the UI as thin, typed Svelte components.

**Drizzle ORM** ([docs](https://orm.drizzle.team)) models every table in TypeScript under `src/lib/server/db/`. App tables (uploads, albums, hardware, settings) share a single **SQLite** file (`DATABASE_URL`) with the Better Auth tables. Schema changes are applied with `bun run db:push`. Server code imports a shared `db` client and uses Drizzle's query builder for type-safe SQL. Use `bun run db:studio` to inspect rows without writing ad hoc scripts.

**Better Auth** ([docs](https://www.better-auth.com)) is configured in `[src/lib/server/auth.ts](src/lib/server/auth.ts)`. It uses Drizzle's `drizzleAdapter` with `provider: 'sqlite'` so sessions and users live in that same database file. The [SvelteKit integration](https://www.better-auth.com/docs/integrations/svelte-kit) wires cookies via `sveltekitCookies` and `getRequestEvent`. In production, `ORIGIN` (public URL) and `BETTER_AUTH_SECRET` must be set; locally, the dev server falls back to `http://localhost:5173` when `ORIGIN` is unset. If you change plugins or auth options in code, regenerate the auth schema and push again:

```sh
bun run auth:schema && bun run db:push
```

Together, this stack means one binary, one SQLite file, and cookie-based sign-in — with no separate auth database or query layer for users.

---

## Editing translations

LensLocker uses [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) with an [inlang](https://inlang.com) project under `project.inlang/`.

- **Configured locales** are defined in `[project.inlang/settings.json](project.inlang/settings.json)` (`baseLocale`, `locales`). Currently **English (`en`)** and **German (`de`)** are enabled.
- **Message files** are per-locale JSON files: `[messages/en.json](messages/en.json)`, `[messages/de.json](messages/de.json)`.
- In code, messages are imported from `$lib/paraglide/messages.js` (generated — do not edit by hand).

**To add or change copy:**

1. Add or edit keys in `messages/en.json` (the source of truth for new strings).
2. Mirror the keys in `messages/de.json` (and any other active locales), or use machine translation as a starting point:

```sh
 bun run translate
```

This runs `inlang machine translate` for the `project.inlang` project. No Google API key is required, though providing one gives more control and better reliability. 3. Run `bun run check` to confirm Paraglide codegen and types are still aligned.

**To add a new language:** add the locale to `project.inlang/settings.json`, create `messages/<locale>.json`, then run the dev server or build so Paraglide regenerates. Wire the locale into any language-selection UI (e.g. settings) if it is not already handled automatically.

See `[project.inlang/README.md](project.inlang/README.md)` for more detail.

---

## Backing up your data

There are two separate concerns: your **original image files and previews** (large, on disk), and the **built-in ZIP backup** from the app (database and related metadata — not the RAW bytes themselves).

### 1. Photos and previews (RAW + generated files)

To survive disk loss or migrate to a new server, copy:

1. **RAW originals** — the directory set by `RAW_UPLOAD_ROOT` (default `data/uploads/raw/`, organized by year/month).
2. **Transformed previews** — the directory set by `TRANSFORMED_MEDIA_ROOT` (default `static/transformed/`, including `upload-previews/` for thumbnails and full-screen previews).
3. **The SQLite file** pointed to by `DATABASE_URL` — without it you lose all metadata, albums, users, and the paths that tie files together.

With the default Docker Compose setup, all three live under the `./data` folder. Backing up that entire folder gives you a complete file-level backup.

**To restore:** copy those three items back to the same paths (or update the env vars to point at the new paths) and ensure file permissions match the process user.

### 2. Built-in backup (Settings → Backup)

The **Backup** tab in Settings lets you:

- **Create a backup** — without a password, this downloads a ZIP named `LensLocker-backup-yyyy-mm-dd-hh-mm-<n>.zip`. With an optional export password, it downloads an encrypted `.llbak` file instead. Both formats contain app settings, albums, album membership, hardware items, and related rows. Neither format includes the RAW files or generated previews.
- **Import a backup** — upload a `.zip` or `.llbak` file. Encrypted backups require the password used at export time. Follow any warnings shown in the UI before confirming.
- **List, download, or delete** previously created archives stored under `LENSLOCKER_BACKUP_ROOT`.

Use the built-in backup for configuration and catalog portability between instances, and pair it with a file-level backup (above) for a complete disaster-recovery setup.

---

## Danger zone

- `bun run wipe:uploads -- --yes` — permanently deletes all RAW files, generated previews, and related database rows under the configured roots. Only use this for intentional resets.

---

## Usage of AI

This project is not AI-generated slop. AI was used sparingly during development in the Cursor IDE, primarily for writing boilerplate, unblocking tricky bugs, and getting a second opinion on Svelte, Drizzle, or Better Auth patterns. The vast majority of the code was written by hand.

Testing was done with photos shot on a Sony A6000 and Sony A7R III. If uploads from other cameras fail or produce unexpected results, please open an issue.
