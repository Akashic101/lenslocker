# LensLocker

LensLocker is a self-hosted web app for **organizing camera RAW files and their metadata**, not a general-purpose photo library for JPEG/PNG consumer snapshots. Uploads are restricted to **RAW and similar sensor formats** (plus DNG/TIFF where supported), along with generated **preview images** for the grid and detail views. You get a searchable gallery, albums, hardware (cameras/lenses) tracking, optional “needs attention” rules on the dashboard, and statistics derived from EXIF-style metadata.

**What it is not:** a replacement for Apple Photos, Google Photos, Immich or Photoprism. There is no intent to be the canonical store for phone screenshots or edited exports unless you treat those as separate from this workflow.

**Fastest way to run:** clone the repo, then `docker compose up -d` and open [http://localhost:3000](http://localhost:3000). No `.env` file is required for that local trial (Compose builds the image on first run). After you change app code, use `docker compose up -d --build`. Details and production settings are in [Docker](#docker).

---

## Features at a glance

- **RAW-first uploads** — server and UI enforce allowed extensions (e.g. CR2, CR3, NEF, ARW, RAF, DNG, TIFF). JPEG/PNG are not accepted as RAW uploads.
- **SQLite + local files** — metadata and auth live in SQLite; originals and previews live on disk paths you control.
- **Previews** — configurable pipeline (formats, sizes, quality) under **Settings → Upload**.
- **Albums, starring, archive** — bulk actions on the dashboard; album membership is stored in the database.
- **Hardware catalog** — track cameras, lenses, and accessories; suggestions can come from upload metadata.
- **Backups (two kinds)** — see [Backing up your data](#backing-up-your-data) below: **photo files** vs **built-in settings/database backup** (ZIP from the UI).
- **Docker** — clone and `docker compose up -d` to run on port 3000 with no `.env` for a local trial ([Docker](#docker)).

---

## Requirements

- [Docker](https://docs.docker.com/get-docker/) — enough to run the prebuilt stack (`docker compose up -d`); the image includes **Perl** so **ExifTool** can process RAW files.
- [Bun](https://bun.sh) — only if you develop or run the app on the host without Docker (see [Quick start](#quick-start-local-development)).

---

## Quick start (local development)

1. Clone the repository and install dependencies:

   ```sh
   bun install
   ```

2. Copy environment template and fill in secrets:

   ```sh
   cp .env.example .env
   ```

   At minimum set `DATABASE_URL` (e.g. `local.db`) and, for anything exposed beyond localhost, `ORIGIN` and `BETTER_AUTH_SECRET` (see [.env.example](.env.example)).

3. Apply the database schema:

   ```sh
   bun run db:push
   ```

4. Start the dev server:

   ```sh
   bun dev
   ```

   Use `bun dev -- --host` if you need to reach the app from other devices on your LAN (Vite prints the URLs).

5. Open the app in a browser (default Vite port is **5173** unless configured otherwise).

---

## Building and running in production (Node adapter)

This project uses [`@sveltejs/adapter-node`](https://svelte.dev/docs/kit/adapter-node): build outputs a Node-compatible server under `build/`.

```sh
bun run build
bun run start
```

- Set `HOST` / `PORT` if needed (Dockerfile sets `HOST=0.0.0.0` and `PORT=3000`).
- Set **`ORIGIN`** to the public URL users type in the browser (Better Auth uses it).
- Point **`DATABASE_URL`**, **`RAW_UPLOAD_ROOT`**, **`TRANSFORMED_MEDIA_ROOT`**, and optionally **`LENSLOCKER_BACKUP_ROOT`** at persistent directories on the host or in a volume (see [Environment variables](#environment-variables)).

Smoke-check the production build locally:

```sh
bun run preview
```

---

## Docker

From a fresh clone, with **no `.env` file**:

```sh
git clone https://github.com/Akashic101/lenslocker
cd lenslocker
docker compose up -d
```

Then open **http://localhost:3000**. The first run builds the image; later, run **`docker compose up -d --build`** when you want to rebuild after code changes. The container **entrypoint** runs **`bun run db:push`** before **`bun run start`**, so the SQLite database on the volume is created/updated automatically.

**Production or any shared network:** create a `.env` in the same directory as `docker-compose.yml` (start from [.env.example](.env.example)) and set **`BETTER_AUTH_SECRET`** to a long random string (32+ characters) and **`ORIGIN`** to the URL users use (e.g. `https://photos.example.com`). Compose reads `.env` automatically for variable substitution and overrides the defaults in [docker-compose.yml](docker-compose.yml).

The default **`BETTER_AUTH_SECRET`** baked into `docker-compose.yml` is **only for local try-out** on your machine. Anyone who knows it could forge session material, so **never** rely on it if the app is reachable from other people or the public internet.

**Bare-metal / `bun run start` without Docker** does not use that entrypoint: run **`bun run db:push`** once (or when the schema changes) before the first start, as in [Quick start](#quick-start-local-development).

Annotated comments live in [docker-compose.example.yaml](docker-compose.example.yaml); [docker-compose.yml](docker-compose.yml) is the same stack.

The app listens on **port 3000**. In-container paths map onto the **`lenslocker_data`** volume:

| Purpose              | Path inside container |
| -------------------- | --------------------- |
| SQLite database      | `/data/lenslocker.db` |
| Uploaded RAW files   | `/data/uploads/raw`   |
| Generated previews   | `/data/transformed`   |
| Settings ZIP backups | `/data/backups`       |

---

## Environment variables

See [.env.example](.env.example) for descriptions. Summary:

| Variable                  | Purpose                                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`            | SQLite database file path (required).                                                                                                        |
| `ORIGIN`                  | Public site URL; required in production for auth.                                                                                            |
| `BETTER_AUTH_SECRET`      | Session/crypto secret. Docker Compose defaults to a **dev-only** value so `docker compose up` works without `.env`; override for production. |
| `RAW_UPLOAD_ROOT`         | Absolute path for uploaded RAW files. Default: `<cwd>/data/uploads/raw` (with year/month subfolders).                                        |
| `TRANSFORMED_MEDIA_ROOT`  | Absolute path for generated previews (e.g. `upload-previews/…`). Default: `<cwd>/static/transformed`.                                        |
| `LENSLOCKER_BACKUP_ROOT`  | Where **Settings → Backup** ZIP files are written and listed. Default under the project if unset; Docker sets `/data/backups`.               |
| `LENSLOCKER_SKIP_DB_PUSH` | If `1`, the Docker entrypoint skips `drizzle-kit push` before start.                                                                         |

After changing Better Auth configuration in code, the template suggests regenerating auth schema and pushing DB changes:

```sh
bun run auth:schema && bun run db:push
```

---

## Working on the codebase

Typical commands:

| Command             | Use                                                          |
| ------------------- | ------------------------------------------------------------ |
| `bun run dev`       | Development server with HMR.                                 |
| `bun run build`     | Production build.                                            |
| `bun run start`     | Run the production server (`node build` via package script). |
| `bun run check`     | Svelte check + TypeScript.                                   |
| `bun run lint`      | Prettier + ESLint.                                           |
| `bun run format`    | Auto-format with Prettier.                                   |
| `bun run test`      | Unit tests (Vitest).                                         |
| `bun run db:push`   | Apply Drizzle schema to SQLite (dev/prod).                   |
| `bun run db:studio` | Open Drizzle Studio (inspect DB).                            |

Other libraries in daily use include **TypeScript**, **Tailwind CSS**, **Paraglide** (inlang), and **Flowbite**. The sections below focus on the three pieces that hold the app together: the UI framework, the database layer, and authentication.

---

## Better Auth, Drizzle, and Svelte

LensLocker is a [SvelteKit](https://kit.svelte.dev) app on [Svelte 5](https://svelte.dev). Routes under `src/routes/` define pages and server endpoints; `+page.server.ts` / `+layout.server.ts` load data and enforce access, while `+server.ts` files implement JSON APIs (gallery, uploads, settings). That split keeps heavy work on the server and leaves the UI as thin, typed Svelte components.

**Drizzle ORM** ([docs](https://orm.drizzle.team)) models every table in TypeScript under `src/lib/server/db/`: app tables (uploads, albums, hardware, settings) live next to the **Better Auth** tables in the same **SQLite** file (`DATABASE_URL`). Schema changes are applied with `bun run db:push` (Drizzle Kit). Server code imports a shared `db` client and uses Drizzle’s query builder for type-safe SQL. `bun run db:studio` is useful when you want to inspect rows without writing ad hoc scripts.

**Better Auth** ([docs](https://www.better-auth.com)) is configured in [`src/lib/server/auth.ts`](src/lib/server/auth.ts). It uses Drizzle’s `drizzleAdapter` with `provider: 'sqlite'` so sessions and users stay in that single database. The [SvelteKit integration](https://www.better-auth.com/docs/integrations/svelte-kit) wires cookies via `sveltekitCookies` and `getRequestEvent`. In production you must set **`ORIGIN`** (public URL) and **`BETTER_AUTH_SECRET`**; locally, dev falls back to `http://localhost:5173` when `ORIGIN` is empty. If you change plugins or auth options in code, regenerate the auth schema and push again: `bun run auth:schema && bun run db:push`.

Together, this stack means one binary, one SQLite file, and cookie-based sign-in without bolting on a separate auth database or a different query layer for users.

---

## Editing translations (languages)

LensLocker uses [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) with an [inlang](https://inlang.com) project under `project.inlang/`.

- **Configured locales** live in [project.inlang/settings.json](project.inlang/settings.json) (`baseLocale`, `locales`). Right now **English (`en`)** and **German (`de`)** are enabled.
- **Message files** are JSON per locale: [messages/en.json](messages/en.json), [messages/de.json](messages/de.json).
- In code, messages are imported from `$lib/paraglide/messages.js` (generated API; do not edit that file by hand).

**To add or change copy:**

1. Add or edit keys in `messages/en.json` (source of truth for new strings).
2. Mirror keys in `messages/de.json` (or other locales), or use machine translation as a starting point:

   ```sh
   bun run translate
   ```

   This runs `inlang machine translate` for the `project.inlang` project. You do not require your own Google API key but its possible if you want more control and better reliablity for translations.

3. Run `bun run check` to ensure Paraglide codegen and types still line up.

**To add a new language:** add the locale to `project.inlang/settings.json`, create `messages/<locale>.json`, run the build or dev server so Paraglide regenerates, then wire the locale into any UI that selects language (e.g. settings) if not already automatic.

More context: [project.inlang/README.md](project.inlang/README.md).

---

## Backing up your data

There are **two separate concerns**: your **original image files and previews** (large, on disk), and the **built-in ZIP backup** from the app (database + related tables for settings, albums, hardware links — not the RAW bytes).

### 1. Photos and previews (RAW + generated files)

To survive disk loss or migrate servers, copy:

1. **RAW originals** — the directory set by `RAW_UPLOAD_ROOT` (default `data/uploads/raw/` with a year/month layout).
2. **Transformed previews** — the directory set by `TRANSFORMED_MEDIA_ROOT` (default `static/transformed/`, including `upload-previews/` for thumbnails and full-screen previews).
3. **The SQLite file** pointed to by `DATABASE_URL` — without it you lose metadata, albums, users, and paths that tie files together.

In Docker, these correspond to the paths under the `/data` volume listed under [Docker](#docker). Back up the **whole volume** (or bind-mount equivalent) for a full file-level backup.

**Restore:** restore those three things to the same paths (or update env vars to the new paths) and ensure file permissions match the process user.

### 2. Built-in backup (Settings → Backup)

In the web UI, **Settings** has a **Backup** tab where you can:

- **Create backup** — downloads a ZIP named like `LensLocker-backup-yyyy-mm-dd-hh-mm-<n>.zip`. It contains a SQLite snapshot (`database.sqlite`) and data needed to restore **app settings, albums, album membership, hardware items**, and related rows — as described in the in-app copy. It does **not** replace a full backup of `RAW_UPLOAD_ROOT` and `TRANSFORMED_MEDIA_ROOT`.
- **Import backup** — uploads a ZIP from the same format to restore that metadata (use with care; follow any warnings in the UI).
- **List / download / delete** previously created ZIPs stored under `LENSLOCKER_BACKUP_ROOT` (or the default directory).

Use this for **configuration and catalog portability** between instances; pair it with **file backups** above for a complete disaster-recovery story.

---

## Danger zone

- **`bun run wipe:uploads -- --yes`** — deletes RAW files, preview JPEGs/WebP/etc. under the configured roots, and related DB rows. Only for intentional resets.
