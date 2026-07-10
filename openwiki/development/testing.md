# Testing Architecture and Practices

## Overview

This document describes the testing strategy, structure, and practices for the build-and-tag-action repository. The project uses Vitest for testing with comprehensive mocking of GitHub API interactions.

## Test Structure

### Directory Layout

```
tests/
├── index.test.ts              # Main action logic tests
├── create-commit.test.ts      # Commit creation tests
├── create-or-update-ref.test.ts # Tag reference tests
├── find-action-file-name.test.ts # Action file discovery tests
├── get-tag-name.test.ts      # Tag name resolution tests
├── read-file.test.ts         # File reading tests
├── helpers.ts                # Test utilities and mocks
├── setup.ts                  # Test environment setup
└── fixtures/                 # Test data and workspaces
    ├── release.json          # Release event payload
    ├── workspace/            # Standard workspace
    ├── workspace-yaml/       # Workspace with YAML action
    ├── workspace-composite/  # Composite action workspace
    └── workspace-no-entrypoints/ # Edge case workspace
```

## Test Runner Configuration

### Vitest Configuration (`/vitest.config.ts`)

```typescript
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
});
```

**Key Settings**:

- **Environment**: Node.js (not browser)
- **Test Discovery**: All `*.test.ts` files in tests directory
- **Setup Files**: `tests/setup.ts` runs before all tests

### Package Scripts (`/package.json`)

```json
{
  "scripts": {
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Test Setup and Helpers

### Global Setup (`/tests/setup.ts`)

**Purpose**: Configure test environment before each test

**Key Operations**:

1. Set GitHub environment variables
2. Configure GitHub event payload path
3. Mock GitHub workspace location
4. Set up Vitest environment

**Source**: `/tests/setup.ts`

### Test Helpers (`/tests/helpers.ts`)

**Purpose**: Provide reusable utilities for test creation

**Key Functions**:

#### `createMockGithub()`

Creates mocked Octokit instance with default implementations:

```typescript
export function createMockGithub() {
  const git = {
    createBlob: vi.fn().mockResolvedValue({ data: { sha: 'blob-sha' } }),
    createTree: vi.fn().mockResolvedValue({ data: { sha: 'tree-sha' } }),
    createCommit: vi.fn().mockResolvedValue({ data: { sha: '123abc' } }),
    updateRef: vi.fn().mockResolvedValue({}),
    getRef: vi.fn().mockRejectedValue({ status: 404 }), // Default: ref doesn't exist
    createRef: vi.fn().mockResolvedValue({}),
  };

  return {
    rest: { git },
    paginate: vi.fn(),
  };
}
```

#### `setInput(name: string, value: string)`

Mock GitHub Actions inputs for testing:

```typescript
export function setInput(name: string, value: string) {
  process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] = value;
}
```

#### `resetInputs()`

Clear all mocked inputs between tests:

```typescript
export function resetInputs() {
  Object.keys(process.env)
    .filter((key) => key.startsWith('INPUT_'))
    .forEach((key) => delete process.env[key]);
}
```

## Test Patterns

### Module Testing

Each core module (`src/lib/*.ts`) has corresponding tests (`tests/*.test.ts`).

**Example**: `src/lib/create-commit.ts` → `tests/create-commit.test.ts`

**Test Structure**:

```typescript
describe('createCommit', () => {
  beforeEach(() => {
    // Reset mocks and inputs
    vi.resetAllMocks();
    resetInputs();
  });

  it('creates commit with files', async () => {
    // Arrange
    const mockGithub = createMockGithub();
    const files = [{ path: 'action.yml', content: '...' }];

    // Act
    const result = await createCommit(mockGithub, files, 'main');

    // Assert
    expect(mockGithub.rest.git.createBlob).toHaveBeenCalled();
    expect(result).toBe('123abc');
  });
});
```

### Integration Testing (`/tests/index.test.ts`)

Tests the main action entry point with full workflow.

**Key Test Scenarios**:

1. **Release Event**: Normal GitHub release workflow
2. **Explicit Tag**: Manual tag specification
3. **Floating Tags**: Major/minor tag updates
4. **Error Cases**: Invalid inputs, API failures
5. **Edge Cases**: Draft releases, pre-releases

### Mock Strategy

**GitHub API**: All Octokit calls mocked with `vi.fn()`
**File System**: Real file operations on fixture directories
**Environment**: GitHub context variables simulated

## Running Tests

### Local Development

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm run test:coverage

# Run specific test file
pnpm test tests/index.test.ts
```

### Continuous Integration

**Workflow File**: `/.github/workflows/ci.yml`

**Triggers**: Push to main, pull requests
**Steps**:

1. Checkout code
2. Setup pnpm and Node.js
3. Install dependencies
4. Run tests

**Test Results**:

- Automatic run on all PRs
- Required for merge to main
- Results visible in GitHub Checks

## Adding New Tests

### Step 1: Identify Test Scenario

Determine what functionality needs testing:

- New feature
- Bug fix verification
- Edge case coverage

### Step 2: Create or Update Fixtures

Add fixture files if needed for the scenario.

### Step 3: Write Test

Follow existing patterns for module testing.

### Step 4: Verify Coverage

Run tests locally before committing.

### Step 5: Update Documentation

Update this document if testing patterns change.

## Quality Validation

### Comprehensive Validation Script

The repository includes a comprehensive quality validation script (`run-quality-checks.mjs`) that runs all quality checks in sequence:

**File**: `/run-quality-checks.mjs`

**What it runs**:

1. **Runtime Preflight Check** (`scripts/runtime-preflight.mjs`): Validates Node.js and pnpm versions
2. **Formatting Check**: `pnpm run check-format` using oxfmt
3. **Linting**: `pnpm run lint` using oxlint
4. **Type Checking**: `pnpm run typecheck` using TypeScript compiler
5. **Tests**: `pnpm run test` using Vitest

**Usage**:

```bash
pnpm run validate  # Runs all quality checks
```

### Preflight Runtime Validation

**File**: `/scripts/runtime-preflight.mjs`

Validates the development environment before running tests:

- Node.js version compatibility (24+)
- pnpm version compatibility
- Required tool availability

### GitHub Actions Integration

Quality checks are automatically run in the CI workflow (`/.github/workflows/ci.yml`) on:

- Push to main branch
- Pull requests
- Manual workflow dispatch

---

**Next**: [Build Process](build-process.md) for compilation and packaging details.
