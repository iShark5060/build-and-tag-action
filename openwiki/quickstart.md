# Build and Tag Action - Quickstart

## Repository Overview

**build-and-tag-action** is a GitHub Action for publishing JavaScript Actions. On release, it force-pushes `action.yml` and your compiled entry file (from `package.json` `main`) to the release tag, then updates floating major/minor tags (for example `v1.0.0` → `v1.0` and `v1`).

> **Fork notice:** This is a maintained fork of [JasonEtco/build-and-tag-action](https://github.com/JasonEtco/build-and-tag-action). Original project by Jason Etco (MIT License).

## Key Features

- **Automatic Tag Management**: Updates release tags with compiled action files
- **Floating Version Tags**: Automatically updates major/minor tags (e.g., `v1`, `v1.0`)
- **Binary-safe Uploads**: Files uploaded as base64 blobs (no corruption of binary assets)
- **Smart Release Handling**: Skips floating tags for draft and pre-release releases
- **Flexible File Inclusion**: Supports `action.yml` entrypoints, `package.json` files, and custom additions

## Quick Usage Example

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

## Repository Structure

```
├── .github/
│   ├── workflows/
│   │   ├── release.yml    # Release workflow example
│   │   └── test.yml       # Test workflow
│   ├── CODEOWNERS
│   └── dependabot.yml
├── src/
│   ├── index.ts           # Main entry point
│   ├── context.ts         # Action context management
│   ├── inputs.ts          # Input parameter processing
│   └── lib/               # Core logic modules
│       ├── index.ts       # Main orchestration
│       ├── create-commit.ts
│       ├── create-or-update-ref.ts
│       ├── find-action-file-name.ts
│       ├── get-action-entrypoints.ts
│       ├── get-tag-name.ts
│       ├── read-file.ts
│       └── resolve-publishable-files.ts
├── tests/                 # Comprehensive test suite
├── action.yml            # Action metadata and specification
├── package.json          # Project configuration
└── README.md            # Primary documentation
```

## Getting Started

### Prerequisites

- GitHub repository with JavaScript/TypeScript action
- `action.yml` or `action.yaml` file
- `package.json` with `main` field pointing to compiled entry
- Build script that outputs to the `main` file location

### Basic Configuration

1. **Set up your `package.json`:**

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

2. **Point `action.yml` at the compiled file:**

```yaml
runs:
  using: node24
  main: dist/index.mjs
```

3. **Add to your release workflow** (see example above)

## Documentation Sections

### [Architecture](architecture/) - Technical Design

- [Core Workflow](architecture/core-workflow.md): Data flow and orchestration
- [Module Responsibilities](architecture/modules.md): Component architecture
- [Business Rules](architecture/business-rules.md): Key logic decisions

### [Workflows](workflows/) - Usage Guide

- [Usage Patterns](workflows/usage.md): How to integrate the action
- [Configuration](workflows/configuration.md): Input/output options

### [Development](development/) - Contributor Guide

- [Testing](development/testing.md): Test structure and practices
- [Build Process](development/build-process.md): Toolchain and compilation

### [Operations](operations/) - Maintenance

- [Release Process](operations/release-process.md): Versioning and publishing

## Key Concepts

### Tag Resolution Priority

1. **Explicit Input**: `tag_name` parameter (highest priority)
2. **Release Event**: `release.tag_name` from payload
3. **Error**: Throws if neither available

### File Inclusion Pipeline

The action discovers files to include in this order:

1. `action.yml`/`action.yaml` (required)
2. Entrypoints from `runs.main`, `runs.pre`, `runs.post` in action file
3. `package.json` `main` field
4. `additional_files` input parameter
5. `package.json` `files` array

### Major/Minor Tag Updates

Floating tags are updated when:

- `update_major_minor_tags` input is `true` (default)
- Release is **not** a draft or pre-release
- Tag name doesn't contain pre-release identifiers (e.g., `-alpha`)
- Tag follows valid semver format

## Important Notes

- **Always reference published version tags** (e.g., `@v1`). The bundled action code (`dist/index.mjs`) is only committed to release tags, so referencing `@main` will not work.
- **Permissions**: Your workflow must grant `contents: write` to `GITHUB_TOKEN` for tag updates to succeed.
- **Binary Assets**: Files are uploaded as base64 blobs, ensuring binary assets (e.g., `.wasm`) are not corrupted.

## Resources

- [Original Repository](https://github.com/JasonEtco/build-and-tag-action)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)

---

**Next Steps**: Read the [Architecture](architecture/core-workflow.md) section to understand how the action works internally, or jump to [Usage Patterns](workflows/usage.md) for practical integration examples.
