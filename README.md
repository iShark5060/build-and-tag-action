# Build and Tag

Publish JavaScript GitHub Actions to release and floating version tags.

[![CI](https://github.com/iShark5060/actions-build-and-tag/actions/workflows/ci.yml/badge.svg)](https://github.com/iShark5060/actions-build-and-tag/actions/workflows/ci.yml)

> **Fork notice:** Maintained fork of [JasonEtco/build-and-tag-action](https://github.com/JasonEtco/build-and-tag-action) by Jason Etco (MIT License).

> **Always reference a published version tag** (e.g. `@v1`). The bundled action code (`dist/index.js`) is only committed to release tags, so referencing `@main` will not work.

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

      - uses: iShark5060/actions-build-and-tag@v1
        env:
          GITHUB_TOKEN: ${{ github.token }}
```

You can also provide `tag_name` explicitly for other events:

```yaml
- uses: iShark5060/actions-build-and-tag@v1
  with:
    tag_name: ${{ steps.releaser.outputs.tag_name }}
  env:
    GITHUB_TOKEN: ${{ github.token }}
```

## Consumer `package.json`

Set `main` to your compiled bundle and add a `build` script:

```json
{
  "name": "your-action-name",
  "main": "dist/index.js",
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=node --format=cjs --target=node24 --outfile=dist/index.js --minify"
  }
}
```

Point `action.yml` at the same file:

```yaml
runs:
  using: node24
  main: dist/index.js
```

## Permissions

Grant **`contents: write`** to `GITHUB_TOKEN` so tag updates can succeed.

## Inputs

| Input                     | Required | Default                 | Description                                                        |
| ------------------------- | -------- | ----------------------- | ------------------------------------------------------------------ |
| `tag_name`                | No       | release tag             | Tag to update. Defaults to `release.tag_name` on `release` events. |
| `commit_message`          | No       | `Automatic compilation` | Commit message for the release tag update.                         |
| `additional_files`        | No       | —                       | Comma-separated extra files (merged with `package.json` `files`).  |
| `update_major_minor_tags` | No       | `true`                  | Update floating major/minor tags (e.g. `v1`, `v1.0`).              |

## Outputs

| Output       | Description                      |
| ------------ | -------------------------------- |
| `commit_sha` | SHA of the newly created commit. |

## Behavior

- Entrypoints from `runs.main`, `runs.pre`, and `runs.post` in `action.yml` are included automatically.
- Files are uploaded as base64 blobs so binary assets are not corrupted.
- Floating major/minor tags are skipped for draft and pre-release releases.
- `GITHUB_TOKEN` is required via `env` (standard `github.token`).

## License

MIT. See [LICENSE](LICENSE).
