# Module Responsibilities and Interfaces

## Overview

The build-and-tag-action is organized into modular components with clear separation of concerns. This document details each module's responsibilities, interfaces, and dependencies.

## Module Map

```
src/
├── index.ts              # Entry point & error handling
├── context.ts            # Execution context & environment
├── inputs.ts             # Action input processing
└── lib/
    ├── index.ts          # Main orchestration & business logic
    ├── create-commit.ts          # Git commit creation
    ├── create-or-update-ref.ts   # Tag reference management
    ├── find-action-file-name.ts  # Action file discovery
    ├── get-action-entrypoints.ts # YAML parsing for entrypoints
    ├── get-tag-name.ts           # Tag name resolution
    ├── read-file.ts              # File reading utilities
    └── resolve-publishable-files.ts # File inclusion pipeline
```

## Core Modules

### 1. Main Entry Point (`/src/index.ts`)

**Primary Responsibility**: Bootstrap execution and handle top-level errors

**Interface**:

```typescript
// No exports - executes immediately
async function run(): Promise<void>;
```

**Key Functions**:

- `run()`: Wraps main action logic in try-catch
- Error handling: Converts errors to GitHub Action failures
- Output setting: Sets `commit_sha` output

**Dependencies**:

- `@actions/core` for action I/O
- `./context` for context creation
- `./lib` for main logic

**Source**: Lines 1-17

### 2. Context Management (`/src/context.ts`)

**Primary Responsibility**: Provide execution environment and dependencies

**Interface**:

```typescript
interface ActionContext {
  github: ReturnType<typeof github.getOctokit>;
  repo: { owner: string; repo: string };
  workspace: string;
  sha: string;
  eventName: string;
  payload: any;
  getPackageJSON<T = unknown>(): Promise<T>;
}

function createContext(): ActionContext;
```

**Key Functions**:

- `createContext()`: Validates environment and builds context
- Environment variable parsing (`GITHUB_REPOSITORY`, `GITHUB_WORKSPACE`, etc.)
- GitHub client initialization with token
- Package.json reading with caching

**Validation**:

- Requires `GITHUB_TOKEN` environment variable
- Validates GitHub environment variables

**Source**: Lines 1-49

### 3. Input Processing (`/src/inputs.ts`)

**Primary Responsibility**: Parse and validate action inputs

**Interface**:

```typescript
// No explicit interface - functions return processed values
function getCommitMessage(): string;
function getAdditionalFilesFromInput(): string[];
function shouldUpdateMajorMinorTags(): boolean;
```

**Key Functions**:

- `getCommitMessage()`: Defaults to "Automatic compilation"
- `getAdditionalFilesFromInput()`: Splits comma-separated paths
- `shouldUpdateMajorMinorTags()`: Parses boolean with default `true`

**Input Handling**:

- Uses `@actions/core.getInput()` for raw input
- Applies defaults when inputs are empty
- Validates boolean strings (`'true'`, `'false'`)

**Source**: Lines 1-18

## Library Modules (`/src/lib/`)

### 4. Main Orchestration (`/src/lib/index.ts`)

**Primary Responsibility**: Coordinate the build-and-tag workflow

**Interface**:

```typescript
export default async function buildAndTagAction(ctx: ActionContext): Promise<string>;
```

**Key Responsibilities**:

1. Tag name determination via `getTagName(ctx)`
2. Commit creation with resolved files
3. Tag reference update/creation
4. Conditional major/minor tag updates
5. Business logic for draft/pre-release handling

**Business Logic**:

- Skips floating tags for draft/pre-release releases
- Validates semver tags before major/minor updates
- Handles pre-release version identifiers

**Dependencies**: All other lib modules, `semver` library

**Source**: Lines 9-43

### 5. File Discovery (`/src/lib/find-action-file-name.ts`)

**Primary Responsibility**: Locate action configuration file

**Interface**:

```typescript
export default function findActionFileName(workspace: string): string;
```

**Logic**:

1. Check for `action.yml` in workspace
2. Fall back to `action.yaml` if YAML not found
3. Throw error if neither exists

**Error Case**: `Could not find action.yml or action.yaml in workspace`

**Source**: Lines 1-14

### 6. Entrypoint Extraction (`/src/lib/get-action-entrypoints.ts`)

**Primary Responsibility**: Parse YAML to find action entrypoints

**Interface**:

```typescript
export default function getActionEntrypoints(actionFilePath: string): string[];
```

**YAML Structure Parsed**:

```yaml
runs:
  using: 'node24'
  main: 'dist/index.js' # Included
  pre: 'dist/pre.js' # Included
  post: 'dist/post.js' # Included
```

**Returns**: Array of file paths from `runs.main`, `runs.pre`, `runs.post`

**Source**: Lines 1-19

### 7. Tag Name Resolution (`/src/lib/get-tag-name.ts`)

**Primary Responsibility**: Determine which tag to update

**Interface**:

```typescript
export default function getTagName(ctx: ActionContext): string;
```

**Priority Order**:

1. `tag_name` input parameter
2. `release.tag_name` from release event payload
3. Error: `No tag name provided`

**Release Event Handling**: Automatically uses release tag unless overridden

**Source**: Lines 1-17

### 8. File Reading (`/src/lib/read-file.ts`)

**Primary Responsibility**: Read files as base64 for binary safety

**Interface**:

```typescript
export default function readFile(path: string): Promise<string>;
```

**Implementation**:

- Uses `fs.promises.readFile()`
- Encodes to base64 for GitHub API compatibility
- Preserves binary files (WASM, images, etc.)

**Note**: Base64 adds ~33% size overhead but ensures binary integrity

**Source**: Lines 1-12

### 9. File Resolution Pipeline (`/src/lib/resolve-publishable-files.ts`)

**Primary Responsibility**: Discover and validate all files to include

**Interface**:

```typescript
export default async function resolvePublishableFiles(
  ctx: ActionContext,
  additionalFiles: string[] = [],
): Promise<string[]>;
```

**Pipeline Stages**:

1. **Discovery**: Find all potential file sources
2. **Deduplication**: Remove duplicate paths
3. **Validation**: Check file existence, warn on missing
4. **Expansion**: Recursively expand directories
5. **Normalization**: Convert paths to forward slashes

**File Sources** (in order):

1. `action.yml`/`action.yaml` file itself
2. Entrypoints from action file (`runs.main`, `runs.pre`, `runs.post`)
3. `package.json.main` field
4. `additional_files` input parameter
5. `package.json.files` array patterns

**Validation Rules**:

- Must have either `package.json.main` or multiple entrypoints
- Single entrypoint without `main` throws error

**Source**: Lines 1-47

### 10. Commit Creation (`/src/lib/create-commit.ts`)

**Primary Responsibility**: Create Git commit with file tree

**Interface**:

```typescript
export default async function createCommit(
  ctx: ActionContext,
  commitMessage: string,
): Promise<{ sha: string }>;
```

**Process**:

1. Get current tree SHA from tag reference
2. Create blobs for all resolved files
3. Build new tree with file structure
4. Create commit with message and parent

**GitHub API Calls**:

- `git.getRef()`: Get current tag tree
- `git.createBlob()`: Create file blobs (base64)
- `git.createTree()`: Create directory tree
- `git.createCommit()`: Create commit object

**Error Handling**: Validates file requirements before API calls

**Source**: Lines 1-71

### 11. Tag Reference Management (`/src/lib/create-or-update-ref.ts`)

**Primary Responsibility**: Update or create tag references

**Interface**:

```typescript
export default async function createOrUpdateRef(
  ctx: ActionContext,
  commitSha: string,
  tagName: string,
): Promise<void>;
```

**Logic Flow**:

```typescript
try {
  // Check if tag exists
  await git.getRef({ ref: `refs/tags/${tagName}` });
  // Update existing
  await git.updateRef({ ref: `refs/tags/${tagName}`, sha: commitSha, force: true });
} catch (error) {
  if (error.status === 404) {
    // Create new
    await git.createRef({ ref: `refs/tags/${tagName}`, sha: commitSha });
  } else {
    throw error;
  }
}
```

**Force Updates**: Uses `force: true` to overwrite existing tags

**Source**: Lines 1-38

## Module Dependencies Graph

```
index.ts
    ↓
context.ts → inputs.ts
    ↓
lib/index.ts
    ├── get-tag-name.ts
    ├── resolve-publishable-files.ts
    │   ├── find-action-file-name.ts
    │   ├── get-action-entrypoints.ts
    │   └── read-file.ts
    ├── create-commit.ts
    └── create-or-update-ref.ts
```

## Data Flow Between Modules

```
Context → Inputs → Tag Name → File Resolution → Commit → Tag Update
    ↓        ↓         ↓           ↓             ↓         ↓
Environment  Params   Decision   File List     Git SHA   Git Ref
```

## Testing Considerations

Each module has corresponding test file in `/tests/`:

- `module.test.ts` tests `module.ts`
- Mocks dependencies using Vitest `vi.fn()`
- Uses fixture workspaces for file system tests
- Tests error conditions and edge cases

## Extension Points

### Adding New File Sources

1. Modify `resolvePublishableFiles()` in `/src/lib/resolve-publishable-files.ts`
2. Add new discovery logic before deduplication
3. Update tests with new scenarios

### Custom Tag Strategies

1. Modify `buildAndTagAction()` in `/src/lib/index.ts`
2. Add new conditional logic for tag updates
3. Extend semver handling if needed

### Additional Validation

1. Add validation functions in appropriate modules
2. Integrate with existing error handling
3. Update input processing if needed

---

**Next**: [Business Rules](business-rules.md) for detailed logic decisions and edge cases.
