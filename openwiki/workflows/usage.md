# Usage Patterns and Integration

## Overview

This document provides practical guidance for integrating the build-and-tag-action into your GitHub workflows. It covers common patterns, configuration options, and best practices.

## Basic Integration

### Minimal Release Workflow

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

**Key Elements**:

1. **Trigger**: `release` event with `published` type
2. **Permissions**: `contents: write` required for tag updates
3. **Checkout**: References the release tag being created
4. **Build**: Compiles your action before tagging
5. **Action**: Uses the build-and-tag-action with GitHub token

## Configuration Options

### Input Parameters

| Input                     | Required | Default                 | Description                                                                  |
| ------------------------- | -------- | ----------------------- | ---------------------------------------------------------------------------- |
| `tag_name`                | No       | —                       | Tag to update. Defaults to `release.tag_name` on `release` events.           |
| `commit_message`          | No       | `Automatic compilation` | Commit message for the release tag update.                                   |
| `additional_files`        | No       | —                       | Comma-separated extra files to include (merged with `package.json` `files`). |
| `update_major_minor_tags` | No       | `true`                  | Update floating major/minor tags (e.g., `v1`, `v1.0`).                       |

### Output Values

| Output       | Description                      |
| ------------ | -------------------------------- |
| `commit_sha` | SHA of the newly created commit. |

### Environment Variables

| Variable       | Required | Description                                     |
| -------------- | -------- | ----------------------------------------------- |
| `GITHUB_TOKEN` | Yes      | GitHub token with `contents: write` permission. |

## Common Patterns

### Pattern 1: Standard JavaScript Action Release

**Use Case**: Releasing a typical JavaScript/TypeScript GitHub Action

```yaml
name: Release Action

on:
  release:
    types: [published]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write # For attestations if needed

    steps:
      - uses: actions/checkout@v7
        with:
          ref: ${{ github.event.release.tag_name }}

      - uses: pnpm/action-setup@v6

      - uses: actions/setup-node@v6
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      - run: pnpm test # Optional: run tests before release

      - uses: iShark5060/build-and-tag-action@v1
        env:
          GITHUB_TOKEN: ${{ github.token }}
```

### Pattern 2: Custom Tag Name (Non-release Events)

**Use Case**: Tagging based on other events or custom logic

```yaml
name: Tag Custom Build

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to tag'
        required: true

jobs:
  tag-build:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v7

      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm run build

      - uses: iShark5060/build-and-tag-action@v1
        with:
          tag_name: v${{ github.event.inputs.version }}
          commit_message: 'Custom build for version ${{ github.event.inputs.version }}'
        env:
          GITHUB_TOKEN: ${{ github.token }}
```

### Pattern 3: Include Additional Assets

**Use Case**: Action requires additional files beyond the main bundle

```yaml
name: Release with Assets

on:
  release:
    types: [published]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v7
        with:
          ref: ${{ github.event.release.tag_name }}

      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm run build

      # Generate additional assets
      - run: node scripts/generate-docs.js
      - run: node scripts/create-license-summary.js

      - uses: iShark5060/build-and-tag-action@v1
        with:
          additional_files: |
            docs/,
            LICENSE-SUMMARY.md,
            assets/icons/
        env:
          GITHUB_TOKEN: ${{ github.token }}
```

### Pattern 4: Skip Floating Tags

**Use Case**: Only update the exact release tag, not major/minor aliases

```yaml
name: Release Without Floating Tags

on:
  release:
    types: [published]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v7
        with:
          ref: ${{ github.event.release.tag_name }}

      - run: npm ci
      - run: npm run build

      - uses: iShark5060/build-and-tag-action@v1
        with:
          update_major_minor_tags: false
        env:
          GITHUB_TOKEN: ${{ github.token }}
```

### Pattern 5: Draft/Pre-release Handling

**Use Case**: Automatically handle draft and pre-release tags appropriately

```yaml
name: Release All Types

on:
  release:
    types: [published, prereleased, released]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v7
        with:
          ref: ${{ github.event.release.tag_name }}

      - run: npm ci
      - run: npm run build

      # Drafts and pre-releases will automatically skip floating tags
      - uses: iShark5060/build-and-tag-action@v1
        env:
          GITHUB_TOKEN: ${{ github.token }}
```

## Advanced Configuration

### Using `package.json` Files Field

The action automatically reads the `files` field from `package.json`. Configure it to include necessary files:

```json
{
  "name": "my-action",
  "main": "dist/index.js",
  "files": ["dist/", "action.yml", "README.md", "LICENSE"]
}
```

### Composite Actions with Pre/Post Steps

For composite actions with `pre` and `post` entrypoints:

```yaml
# action.yml
name: 'My Composite Action'
runs:
  using: composite
  steps:
    - run: echo "pre-step"
      shell: bash

  # These will be automatically included
  pre: dist/pre.js
  post: dist/post.js
```

### Binary Assets (WASM, Images, etc.)

Binary assets are automatically handled correctly due to base64 encoding:

```yaml
- uses: iShark5060/build-and-tag-action@v1
  with:
    additional_files: |
      dist/*.wasm,
      assets/logo.png,
      data/config.bin
```

## Integration with Other Tools

### With `semantic-release`

```yaml
name: Semantic Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v7

      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm run build

      - name: Semantic Release
        uses: cycjimmy/semantic-release-action@v4
        id: semantic
        env:
          GITHUB_TOKEN: ${{ github.token }}

      - name: Tag Release
        if: steps.semantic.outputs.new_release_published == 'true'
        uses: iShark5060/build-and-tag-action@v1
        with:
          tag_name: ${{ steps.semantic.outputs.new_release_tag_name }}
        env:
          GITHUB_TOKEN: ${{ github.token }}
```

### With `changesets`

```yaml
name: Changesets Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v7

      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm run build

      - name: Create Release Pull Request
        uses: changesets/action@v1
        env:
          GITHUB_TOKEN: ${{ github.token }}

      - name: Tag Release
        if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')
        uses: iShark5060/build-and-tag-action@v1
        env:
          GITHUB_TOKEN: ${{ github.token }}
```

## Error Handling and Troubleshooting

### Common Issues

#### Issue: Permission Denied

**Symptoms**: `Resource not accessible by integration` or 403 errors
**Solution**: Ensure workflow has `contents: write` permission:

```yaml
permissions:
  contents: write
```

#### Issue: Missing `action.yml`

**Symptoms**: `Could not find action.yml or action.yaml in workspace`
**Solution**: Ensure action configuration file exists in repository root.

#### Issue: Invalid Tag Name

**Symptoms**: `No tag name provided`
**Solution**: Provide `tag_name` input or trigger on release event.

#### Issue: Single File Without `main`

**Symptoms**: `Only one file was found to publish, and package.json does not have a "main" field`
**Solution**: Add `main` field to `package.json` or include additional files.

### Debugging Tips

1. **Enable Step Debugging**: Add `ACTIONS_STEP_DEBUG: true` to workflow environment
2. **Check Action Outputs**: The `commit_sha` output can be used to verify the commit
3. **Review Tag History**: Check if tags were created/updated as expected
4. **Test with Dry Run**: Consider testing with a draft release first

## Best Practices

### 1. Always Use Version Tags

```yaml
# Good
uses: iShark5060/build-and-tag-action@v1

# Bad (won't work)
uses: iShark5060/build-and-tag-action@main
```

### 2. Include Essential Files

Ensure your `package.json` or `additional_files` includes:

- Compiled action bundle
- `action.yml`/`action.yaml`
- License file
- README (if needed for distribution)

### 3. Test Release Process

Test your release workflow with:

1. Draft release (skips floating tags)
2. Pre-release (skips floating tags)
3. Full release (updates all tags)

### 4. Monitor Action Updates

Subscribe to repository releases to get updates about new versions.

### 5. Security Considerations

- Use `GITHUB_TOKEN` with minimal required permissions
- Review action code when updating versions
- Consider pinning to specific commit SHA for critical workflows

## Migration from Original Action

If migrating from the original `JasonEtco/build-and-tag-action`:

1. Update reference in workflow:

```yaml
# Before
uses: JasonEtco/build-and-tag-action@v2

# After
uses: iShark5060/build-and-tag-action@v1
```

2. Verify compatibility (this fork maintains API compatibility)
3. Test release process with new action

---

**Next**: [Configuration Reference](configuration.md) for detailed input/output specifications.
