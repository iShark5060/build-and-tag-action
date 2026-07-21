# actions-build-and-tag

GitHub Action for publishing JavaScript Actions to release and floating version tags.

## Architecture

- `src/index.ts` — entry point: create context, orchestrate, set outputs
- `src/lib/` — core logic (commit creation, ref updates, file resolution)
- `src/context.ts`, `src/inputs.ts` — GitHub context and input parsing
- `action.yml` — action metadata
- `dist/index.js` — published CJS bundle (committed on release tags only)

## Contract sync

When behavior changes, update:

- `README.md`
- `action.yml`
- tests under `tests/`
- regenerate `dist/index.js` with `pnpm run build` on the release tag

## Verification

```bash
pnpm run validate
pnpm run build
```

## Release

1. Create a pre-release from `main`
2. Verify the Release workflow completes
3. Promote to a full release when ready

## Dependencies

```bash
pnpm run deps
pnpm install
```

## Engineering standards

Follow AppBase `docs/org-standards/` with personal-repo overrides (`personal-repos.md`):

- Runners: `ubuntu-latest` / `windows-latest`
- Checkout: `actions/checkout@v7`
- Node setup: `actions/setup-node@v7`
- Quality gate: `pnpm run validate`

## OpenWiki

This repository has documentation located in the /openwiki directory.

Start here:

- [OpenWiki quickstart](openwiki/quickstart.md)

OpenWiki includes repository overview, architecture notes, workflows, domain concepts, operations, integrations, testing guidance, and source maps.

When working in this repository, read the OpenWiki quickstart first, then follow its links to the relevant architecture, workflow, domain, operation, and testing notes.
