# Business Rules and Logic Decisions

## Overview

This document details the key business logic, decision points, and edge case handling in the build-and-tag-action. Understanding these rules is essential for modifying the action or troubleshooting unexpected behavior.

## Core Business Rules

### 1. Tag Name Resolution Priority

**Rule**: Determine which tag to update based on available information

**Priority Order**:

1. **Explicit Input** (`tag_name` parameter) - Highest priority
2. **Release Event** (`release.tag_name` from payload) - Automatic on releases
3. **Error** - Throw if neither available

**Implementation**: `/src/lib/get-tag-name.ts`

```typescript
export default function getTagName(ctx: ActionContext): string {
  const tagName = core.getInput('tag_name');
  if (tagName) return tagName;

  if (ctx.eventName === 'release') {
    const tag = (ctx.payload.release as { tag_name: string })?.tag_name;
    if (tag) return tag;
  }

  throw new Error('No tag name provided');
}
```

**Rationale**: Allows explicit override while providing sensible defaults for release events.

### 2. Major/Minor Tag Update Conditions

**Rule**: Determine when to update floating major/minor tags (e.g., `v1.0`, `v1`)

**Update Conditions** (ALL must be true):

1. `update_major_minor_tags` input is `true` (default) or not set
2. Release is NOT a draft (`release.draft !== true`)
3. Release is NOT a pre-release (`release.prerelease !== true`)
4. Tag name does NOT contain pre-release identifiers (e.g., `-alpha`, `-beta`)
5. Tag follows valid semver format

**Implementation**: `/src/lib/index.ts` (lines 17-40)

```typescript
let rewriteMajorAndMinorRef = shouldUpdateMajorMinorTags();

// Skip for draft/pre-release releases
if (ctx.eventName === 'release') {
  const release = ctx.payload.release as { draft?: boolean; prerelease?: boolean };
  if (release?.draft || release?.prerelease) {
    rewriteMajorAndMinorRef = false;
  }
}

// Skip for pre-release versions
if (semver.prerelease(tagName)) {
  rewriteMajorAndMinorRef = false;
}

// Update if allowed
if (rewriteMajorAndMinorRef) {
  const cleanTag = semver.clean(tagName);
  if (cleanTag) {
    const majorStr = semver.major(cleanTag).toString();
    const minorStr = semver.minor(cleanTag).toString();
    await createOrUpdateRef(ctx, commitSha, `v${majorStr}.${minorStr}`);
    await createOrUpdateRef(ctx, commitSha, `v${majorStr}`);
  }
}
```

**Rationale**: Prevents floating tags from pointing to unstable releases while maintaining compatibility with semantic versioning.

### 3. File Inclusion Validation

**Rule**: Ensure minimum viable file configuration before creating commit

**Requirements** (ONE of the following):

1. `package.json` has `main` field defined
2. Multiple entrypoints found (`runs.main` plus `runs.pre` or `runs.post`)

**Error Case**: Single entrypoint without `package.json.main`

```
Error: Only one file was found to publish, and package.json does not have a "main" field
```

**Implementation**: `/src/lib/create-commit.ts` (lines 36-44)

```typescript
if (files.length === 1) {
  const pkg = await ctx.getPackageJSON<{ main?: string }>();
  if (!pkg.main) {
    throw new Error(
      'Only one file was found to publish, and package.json does not have a "main" field',
    );
  }
}
```

**Rationale**: Prevents accidentally publishing incomplete actions and ensures compatibility with GitHub Actions runtime.

### 4. File Discovery Order and Deduplication

**Rule**: Collect files from multiple sources, removing duplicates

**Discovery Order**:

1. `action.yml`/`action.yaml` file itself
2. Entrypoints from action file (`runs.main`, `runs.pre`, `runs.post`)
3. `package.json.main` field
4. `additional_files` input parameter (comma-separated)
5. `package.json.files` array patterns

**Deduplication**: Uses `Set<string>` to remove duplicate paths after normalization

**Path Normalization**: Converts Windows backslashes to forward slashes

**Implementation**: `/src/lib/resolve-publishable-files.ts`

**Rationale**: Provides flexible file inclusion while preventing redundant processing.

### 5. Binary File Safety

**Rule**: All files uploaded as base64 to prevent corruption

**Implementation**: `/src/lib/read-file.ts`

```typescript
export default async function readFile(path: string): Promise<string> {
  const buffer = await fs.promises.readFile(path);
  return buffer.toString('base64');
}
```

**Rationale**: GitHub API requires base64 for binary files; text files work but binary files (WASM, images) would corrupt without encoding.

### 6. Tag Reference Management

**Rule**: Update existing tags, create new ones if missing

**Logic**:

```typescript
try {
  // Check if tag exists
  await git.getRef({ ref: `refs/tags/${tagName}` });
  // Update existing with force
  await git.updateRef({ ref: `refs/tags/${tagName}`, sha: commitSha, force: true });
} catch (error) {
  if (error.status === 404) {
    // Create new tag
    await git.createRef({ ref: `refs/tags/${tagName}`, sha: commitSha });
  } else {
    throw error;
  }
}
```

**Force Update**: `force: true` ensures existing tags are overwritten

**Rationale**: Supports both new releases (create) and re-releases (update) of existing versions.

## Edge Case Handling

### 1. Missing Files in `additional_files`

**Behavior**: Warning logged, file skipped

```
core.warning(`File not found: ${file}`)
```

**Location**: `/src/lib/resolve-publishable-files.ts` (lines 28-30)

**Rationale**: Non-critical files shouldn't fail the entire action; users should fix configuration.

### 2. Invalid Semver Tags

**Behavior**: Warning logged, major/minor updates skipped

```
core.warning(`Skipping major/minor tag update: [${tagName}] is not a valid semver tag`)
```

**Location**: `/src/lib/index.ts` (lines 32-34)

**Rationale**: Allow non-semver tags but don't attempt invalid major/minor updates.

### 3. Empty `additional_files` Input

**Behavior**: Treated as empty array, no effect

**Implementation**: Default parameter `additionalFiles: string[] = []`

**Rationale**: Simplify calling code, avoid null checks.

### 4. Invalid Boolean Input (`update_major_minor_tags`)

**Behavior**: Falls back to default (`true`)

**Implementation**: `/src/inputs.ts` (lines 14-18)

```typescript
export function shouldUpdateMajorMinorTags(): boolean {
  const input = core.getInput('update_major_minor_tags');
  if (input === 'false') return false;
  return true; // Default to true for empty or any other value
}
```

**Rationale**: Lenient parsing reduces configuration errors.

### 5. Missing `action.yml` or `action.yaml`

**Behavior**: Immediate error, action fails

```
throw new Error(`Could not find action.yml or action.yaml in workspace ${workspace}`)
```

**Location**: `/src/lib/find-action-file-name.ts` (lines 12-14)

**Rationale**: Action cannot function without configuration file.

### 6. Directory in `additional_files` or `package.json.files`

**Behavior**: Recursively expanded to all contained files

**Implementation**: `/src/lib/resolve-publishable-files.ts` (lines 33-41)

**Rationale**: Match npm/pnpm behavior for file patterns.

## Configuration Validation Rules

### Required Environment Variables

- `GITHUB_TOKEN`: Validated at context creation

### Required Files

- `action.yml` or `action.yaml`: Validated during file discovery
- `package.json`: Validated when reading (may be empty object)

### Input Validation

- `tag_name`: Optional, validated when used
- `commit_message`: Optional, defaults to "Automatic compilation"
- `additional_files`: Optional, comma-separated paths
- `update_major_minor_tags`: Optional boolean, defaults to `true`

## Release Event Specific Rules

### Draft Releases

- **Tag Update**: YES (release tag itself)
- **Floating Tags**: NO (skipped)

### Pre-release Releases

- **Tag Update**: YES (release tag itself)
- **Floating Tags**: NO (skipped)

### Published Releases

- **Tag Update**: YES (release tag itself)
- **Floating Tags**: YES (if semver valid and not disabled)

### Non-release Events

- **Tag Update**: YES (with explicit `tag_name` input)
- **Floating Tags**: YES (if semver valid and not disabled)

## Security Considerations

### Token Permissions

- **Required**: `contents: write`
- **Usage**: Only for Git operations (no repository settings changes)
- **Scope**: Limited to tag updates in the current repository

### File System Access

- **Scope**: Workspace directory only
- **Operations**: Read files for inclusion in release
- **No modifications**: Only reads, never writes or deletes

### API Rate Limiting

- **Consideration**: Multiple tag updates per release (major/minor)
- **Mitigation**: Sequential operations, GitHub handles rate limiting

## Compatibility Rules

### Node.js Version

- **Runtime**: Node.js 24 (specified in `action.yml`)
- **Build**: Compatible with action's build process

### Package Managers

- **Primary**: pnpm (workspace configuration present)
- **Compatible**: npm, yarn (standard `package.json`)

### File Systems

- **Path Separators**: Normalized to forward slashes
- **Case Sensitivity**: Follows host OS rules

## Decision Log

### Recent Changes (from git history)

1. **Node.js 24 upgrade**: Updated from Node 20 for GitHub Actions compatibility
2. **Dependabot integration**: Automated dependency updates
3. **Test improvements**: Enhanced test coverage and fixtures
4. **Codecov removal**: Simplified CI configuration

### Design Decisions

1. **Base64 file encoding**: Chosen for binary safety over text-only approach
2. **Force tag updates**: Allows re-releases of same version
3. **Warning vs error**: Non-critical issues logged as warnings
4. **Default behaviors**: Sensible defaults reduce required configuration

---

**Related**: [Core Workflow](core-workflow.md) for flow diagrams, [Module Responsibilities](modules.md) for implementation details.
