# Roadkill Mobile Cloud-Agent Guide

## Repository at a glance

This is Utah's Roadkill Reporter monorepo. It contains an Expo/React Native mobile app, an Express/Firebase/PostgreSQL API, a Remix public website, shared CommonJS validation/configuration, PostgreSQL schema tooling, and a Python job that publishes database data to ArcGIS Online.

| Area | Location | Stack / entry points |
| --- | --- | --- |
| Mobile app | `src/front/` | Expo 52, React Native, React 18; `App.js`, screens in `screens/`, UI in `components/`, auth in `auth/`, API/offline/location services in `services/` |
| API | `src/back/` | Node 22, Express 5, Firebase Firestore/Storage, PostgreSQL/Knex; `server.js` starts `app.js`, endpoints are in `api/`, logic in `services/` |
| Shared code | `src/common/` | **CommonJS only**; Yup schemas in `validation/`, shared app/version/bundle config in `config.js`, database constants in `constants.js` |
| Website | `src/website/` | Remix 2, React 18, Tailwind; routes in `app/routes/`, root layout in `app/root.jsx` |
| Database | `data/` | PostgreSQL/PostGIS Docker image, Knex config/migrations, SQL schema/seed files |
| Data publisher | `src/palletjack/` | Python 3.11 `roadkill` package; `src/roadkill/main.py` is the Cloud Run Job entry point |

The root is not an npm workspace. Every Node project owns a `package-lock.json`; use `npm`, never pnpm. When working in front, back, or website, install `src/common` too because it is a local `file:../common` dependency. Do not convert `src/common` to ESM: Expo 52 fails to build it.

## Toolchain and setup

Always use the version pinned by each service's `.node-version`: Node 22. CI uses Node 22. Python work in `src/palletjack` requires Python 3.11 (also its Docker base). Backend Firebase emulator tests require Java 21. Docker/Compose is required for the local PostgreSQL/PostGIS database. CI runs on Ubuntu; native iOS/Android builds additionally need EAS, platform tooling, credentials, and EAS secrets.

For a clean Node setup, run this from the repository root before the relevant validation:

```sh
# Select Node 22 by your version manager, then install only affected projects.
cd src/common && npm ci
cd ../front && npm ci       # mobile work
cd ../back && npm ci        # API work
cd ../website && npm ci     # website work
cd ../../data && npm ci     # migrations/scripts work
```

Do not use `npm install` to validate existing lockfiles. `npm ci` is the CI command. `npm test` in `src/front` is watch mode; do not use it for an agent check. `npm test` in `src/back` invokes Vitest and is also not the CI integration command.

For local end-to-end development, copy the root, `src/front`, and `src/back` `.env.sample` files to `.env` and populate secrets; run `docker compose up` from root (requires `DEV_POSTGRES_PASSWORD`); start the API with `cd src/back && npm start` (Firebase emulators plus server) and mobile with `cd src/front && npm start` (custom Expo dev client). The emulator UI is on port 4000, API defaults to 3000, and website development uses 3002. Do not commit `.env` files or secret values.

## Validation: run the narrow path first

Always run the matching commands below after edits; changes under `src/common` require the consuming service checks too.

```sh
# Shared validation (required by all Node CI workflows)
cd src/common && npm run lint

# API CI-equivalent checks. Java 21 and Firebase emulator downloads are required.
# CI=1 prevents Vitest from entering watch mode in an interactive local terminal.
cd src/back && npm run lint && CI=1 npm run test:ci

# Mobile CI-equivalent check. First remove ignored native build output in a reused checkout:
rm -rf src/front/android/app/build
cd src/front && npm run test:final

# Website CI lint; build is an additional useful production check.
cd src/website && npm run lint && npm run build

# Palletjack CI (from a Python 3.11 environment; Linux CI installs libkrb5-dev first).
cd src/palletjack && pip install '.[tests]' && ruff check --output-format=github . && pytest
```

The mobile `test:final` runs ESLint, Jest, then translation validation. A prior local Android build leaves ignored `android/app/build` JavaScript bundles that ESLint does not ignore and causes many `__d is not defined` failures. Always remove that generated directory before the front lint/test command; a fresh GitHub Actions checkout does not have it. The API `test:ci` runs Firebase Firestore and Storage emulators around `npm test`; use `CI=1 npm run test:ci` in an interactive local terminal so Vitest exits after one run, but do not substitute plain `npm test` when reproducing CI. `src/common/package.json` and `data/scripts/package.json` have placeholder `test` scripts that intentionally fail, so do not run them.

Validated locally with Node 22: common lint, API lint, website lint, and website production build pass. The local environment used for this guide lacked Docker, Python 3.11, Python test tools, and Java 21, so database startup, Palletjack tests, and Firebase integration tests must be run in a matching environment rather than inferred from a newer runtime.

For release-sensitive mobile changes: bump `runtimeVersion` in `src/front/app.config.js` whenever native code, native dependencies, or app configuration requires a new binary; OTA updates only apply to matching runtime versions. Production releases also require a `version`, `buildNumber`, `changelog_context.json`, and `CHANGELOG.md` review as described in `README.md`. Native dependency changes require rebuilding the custom dev client (`src/front/scripts/buildForDevelopment.sh`); do not claim an OTA update is sufficient.

## CI and deployment map

GitHub workflows are the authoritative CI definitions in `.github/workflows/`:

- `push_back.yml`: on API/shared/database migration changes, installs `back` and `common`, lints both, then runs `npm run test:ci`; `dev` deploys staging and `main` production after Cloud SQL migrations.
- `push_front.yml`: on front/shared/release metadata changes, installs front/common, lints common, then `npm run test:final`.
- `push_website.yml`: on website/shared changes, installs website/common and lints both; `dev`/`main` deploy Cloud Run staging/production.
- `push_palletjack.yml`: installs `.[tests]`, runs Ruff and pytest; `dev`/`main` deploy the Cloud Run Job. Its staging scheduler is paused deliberately.

Database migrations live in `data/migrations/`; `data/knexfile.js` defines `development`, `Staging`, and `Production`. Local resets use `data/rebuild_database.sh` and destructively remove database volumes. Cloud SQL release access uses `data/start_cloud_sql_proxy.sh dev` on 5432 or another environment (for example `prod`) on 5433; it requires authenticated `gcloud` and the Cloud SQL proxy. Do not run deploy, release, EAS, Cloud SQL, or destructive database scripts for ordinary code changes.

Manual mobile release coverage is in `docs/ManualTests.md`, especially authentication, public/contractor/agency reporting, routes, photos, offline sync, and profile deletion. Include the relevant scenarios when a change affects those workflows.

Repository root contains the primary overview (`README.md`), release history (`CHANGELOG.md`), release metadata (`changelog_context.json`), `docker-compose.yaml`, and root changelog script (`npm run changelog`). Formatting defaults are `.prettierrc.json` and `.prettierignore`; lint configs are local to each service. Trust this guide for setup and validation. Search only when the requested behavior, affected service, or this guide's facts are incomplete or demonstrably stale.
