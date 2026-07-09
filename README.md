<h3 align="center">📦🔖</h3>
<h3 align="center">Build and Tag action</h3>

<p align="center"><a href="https://github.com/iShark5060/build-and-tag-action/actions/workflows/test.yml"><img alt="CI" src="https://github.com/iShark5060/build-and-tag-action/actions/workflows/test.yml/badge.svg"></a></p>

---

A GitHub Action for publishing JavaScript Actions. On release, it force-pushes `action.yml` and your compiled entry file (from `package.json` `main`) to the release tag, then updates floating major/minor tags (for example `v1.0.0` → `v1.0` and `v1`).

> **Fork notice:** Maintained fork of [JasonEtco/build-and-tag-action](https://github.com/JasonEtco/build-and-tag-action). Original project by Jason Etco (MIT License).

> **Always reference a published version tag** (e.g. `@v1`). The bundled action code (`dist/index.mjs`) is only committed to release tags, so referencing `@main` will not work.

## Usage

```yaml
name: Release

on:
  release:
    types: [published]

jobs:
  build-and-tag:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Checkout
        uses: actions/checkout@v7
        with:
          ref: ${{ github.event.release.tag_name }}

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build action
        run: pnpm run build

      - uses: iShark5060/build-and-tag-action@v1
        env:
          GITHUB_TOKEN: ${{ github.token }}
```

You can also use this action with other events — provide `tag_name` explicitly:

```yaml
- uses: iShark5060/build-and-tag-action@v1
  with:
    tag_name: ${{ steps.releaser.outputs.tag_name }}
  env:
    GITHUB_TOKEN: ${{ github.token }}
```

## Example `package.json`

Set `main` to your compiled bundle and add a `build` script (typically with [`@vercel/ncc`](https://github.com/vercel/ncc)):

```json
{
  "name": "your-action-name",
  "main": "dist/index.mjs",
  "type": "module",
  "scripts": {
    "build": "ncc build -o dist --minify src/index.ts && node --input-type=module -e \"import fs from 'fs'; fs.renameSync('dist/index.js','dist/index.mjs');\""
  }
}
```

Point `action.yml` at the same file:

```yaml
runs:
  using: node24
  main: dist/index.mjs
```

## Permissions

This action creates commits and updates tags via the GitHub API. Your workflow must grant **`contents: write`** to `GITHUB_TOKEN` (see the example above). Without it, tag updates will fail.

## Options

| Input                     | Required | Default                 | Description                                                                  |
| ------------------------- | -------- | ----------------------- | ---------------------------------------------------------------------------- |
| `tag_name`                | No       | —                       | Tag to update. Defaults to `release.tag_name` on `release` events.           |
| `commit_message`          | No       | `Automatic compilation` | Commit message for the release tag update.                                   |
| `additional_files`        | No       | —                       | Comma-separated extra files to include (merged with `package.json` `files`). |
| `update_major_minor_tags` | No       | `true`                  | Update floating major/minor tags (e.g. `v1`, `v1.0`).                        |

| Output       | Description                      |
| ------------ | -------------------------------- |
| `commit_sha` | SHA of the newly created commit. |

## Behavior notes

- **Action entrypoints:** Files referenced by `runs.main`, `runs.pre`, and `runs.post` in `action.yml` / `action.yaml` are included automatically (in addition to `package.json` `main`).
- **Binary-safe uploads:** Files are uploaded as base64 blobs so binary assets (e.g. `.wasm`) are not corrupted.
- **Draft / pre-release:** On `release` events, floating major/minor tags are **not** updated for draft or pre-release releases. The release tag itself is still updated.
- **`update_major_minor_tags`:** Set to `false` to skip floating tag updates entirely.
- **`GITHUB_TOKEN`:** Required via `env` (standard `github.token`).

## Motivation

The [guide to JavaScript Actions](https://docs.github.com/en/actions/sharing-automations/creating-actions/creating-a-javascript-action) often recommends committing `node_modules`. This action automates the recommended [versioning pattern](https://github.com/actions/toolkit/blob/main/docs/action-versioning.md) by publishing built artifacts to release and floating tags instead.

Inspired by [mheap/github-action-auto-compile-node](https://github.com/mheap/github-action-auto-compile-node) and [Actions-R-Us/actions-tagger](https://github.com/Actions-R-Us/actions-tagger).
