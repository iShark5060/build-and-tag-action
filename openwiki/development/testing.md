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
    "test": "vitest run"
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

**Source**: `/tests/setup.ts` (lines 1-35)

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

#### `generateContext(options?)`

Generates test action context with configurable options:

```typescript
export function generateContext(options: Partial<ContextOptions> = {}) {
  return {
    github: options.github || createMockGithub(),
    repo: options.repo || { owner: 'test-owner', repo: 'test-repo' },
    workspace: options.workspace || '/test/workspace',
    sha: options.sha || 'abc123',
    eventName: options.eventName || 'release',
    payload: options.payload || { release: { tag_name: 'v1.0.0' } },
    getPackageJSON: options.getPackageJSON || (async () => ({ main: 'dist/index.js' })),
  };
}
```

## Test Fixtures

### Workspace Fixtures

#### 1. Standard Workspace (`/tests/fixtures/workspace/`)

**Structure**:

```
workspace/
├── action.yml          # Action configuration
├── package.json        # Package configuration
└── index.js           # Entry point
```

**Purpose**: Tests normal action configuration and file resolution.

#### 2. YAML Action File (`/tests/fixtures/workspace-yaml/`)

**Structure**:

```
workspace-yaml/
├── action.yaml         # YAML extension
├── package.json
└── index.js
```

**Purpose**: Tests action file discovery with `.yaml` extension.

#### 3. Composite Action (`/tests/fixtures/workspace-composite/`)

**Structure**:

```
workspace-composite/
├── action.yml          # Composite action with pre/post
├── package.json
└── dist/
    ├── restore/
    │   └── index.js    # pre entrypoint
    └── save/
        └── index.js    # post entrypoint
```

**Purpose**: Tests composite actions with multiple entrypoints.

#### 4. No Entrypoints (`/tests/fixtures/workspace-no-entrypoints/`)

**Structure**:

```
workspace-no-entrypoints/
├── action.yml          # Missing runs.main
└── package.json        # Missing main field
```

**Purpose**: Tests error conditions for insufficient configuration.

### Event Payload Fixture (`/tests/fixtures/release.json`)

**Purpose**: Provides sample release event data for testing.

## Testing Patterns

### Module Testing Structure

Each test file follows this pattern:

```typescript
describe('module-name', () => {
  beforeEach(() => {
    // Reset mocks and environment
    vi.clearAllMocks();
    // Setup test-specific conditions
  });

  describe('function-name', () => {
    it('should do something', async () => {
      // Arrange
      const context = generateContext({/* options */});

      // Act
      const result = await functionUnderTest(context);

      // Assert
      expect(result).toBe(expectedValue);
      expect(mockFunction).toHaveBeenCalledWith(expectedArgs);
    });

    it('should handle error case', async () => {
      // Arrange
      const context = generateContext({/* error conditions */});

      // Act & Assert
      await expect(functionUnderTest(context)).rejects.toThrow('Expected error message');
    });
  });
});
```

### Mocking Strategy

#### GitHub API Mocks

- **Complete Isolation**: All GitHub API calls mocked
- **Configurable Responses**: Each mock can be reconfigured per test
- **Error Simulation**: Mock rejection for error case testing

#### File System Mocks

- **Fixture-based**: Uses real fixture files for file system operations
- **Path Mocking**: `process.cwd()` and workspace paths mocked
- **File Reading**: Actual file reading with mocked paths

#### Environment Mocking

- `process.env` manipulation for GitHub environment variables
- Event payload file mocking
- Workspace directory mocking

## Test Coverage Areas

### Core Action Logic (`/tests/index.test.ts`)

**Test Scenarios**:

1. Happy path with release event
2. Draft release handling (skips floating tags)
3. Pre-release handling (skips floating tags)
4. Non-semver tag handling
5. Custom tag name input
6. Error propagation

### Commit Creation (`/tests/create-commit.test.ts`)

**Test Scenarios**:

1. Normal commit creation with multiple files
2. Single file with package.json main field
3. Single file without main field (error)
4. GitHub API error handling
5. File resolution integration

### Tag Reference Management (`/tests/create-or-update-ref.test.ts`)

**Test Scenarios**:

1. Create new tag (404 response)
2. Update existing tag (successful getRef)
3. GitHub API error handling
4. Tag name formatting

### File Discovery (`/tests/find-action-file-name.test.ts`)

**Test Scenarios**:

1. Find action.yml
2. Find action.yaml (fallback)
3. Neither found (error)
4. Workspace path handling

### Tag Name Resolution (`/tests/get-tag-name.test.ts`)

**Test Scenarios**:

1. Use tag_name input (priority)
2. Use release event tag (fallback)
3. No tag name provided (error)
4. Non-release event without tag (error)

### File Reading (`/tests/read-file.test.ts`)

**Test Scenarios**:

1. Read existing file
2. Handle missing file (error)
3. Base64 encoding verification

## Running Tests

### Local Development

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test tests/index.test.ts

# Watch mode (development)
npx vitest
```

### CI/CD Integration

Tests run automatically via GitHub Actions workflow (`/.github/workflows/test.yml`)

## Test Data Management

### Fixture Creation

When adding new test scenarios:

1. **Create fixture directory** in `/tests/fixtures/`
2. **Include minimal files** needed for the scenario
3. **Update test files** to reference new fixture
4. **Add cleanup** if creating temporary files

### Mock Configuration

```typescript
// Example: Configure mock for specific test
const mockGit = {
  getRef: vi
    .fn()
    .mockRejectedValueOnce({ status: 404 }) // First call: tag doesn't exist
    .mockResolvedValueOnce({}), // Second call: tag exists
};

const context = generateContext({ github: { rest: { git: mockGit } } });
```

## Testing Best Practices

### 1. Test Isolation

- Each test should be independent
- Clear mocks in `beforeEach` or `afterEach`
- Use fixture directories, not global state

### 2. Descriptive Test Names

```typescript
// Good
it('should skip floating tags for draft releases', ...)

// Bad
it('should handle draft', ...)
```

### 3. Coverage Prioritization

- Business logic over implementation details
- Error cases and edge conditions
- Integration between modules

### 4. Mock Verification

- Verify mock calls with expected arguments
- Test both success and error paths
- Configure mock responses per test case

## Debugging Tests

### Common Issues

#### Issue: Mock not called

**Solution**: Check mock setup and function invocation order

#### Issue: File path issues

**Solution**: Verify workspace mocking and fixture paths

#### Issue: Environment variable missing

**Solution**: Check `setup.ts` and test-specific overrides

### Debugging Tools

```bash
# Run with verbose output
npx vitest run --reporter=verbose

# Debug specific test
npx vitest run -t "test name pattern"
```

## Continuous Integration

### GitHub Actions Workflow (`/.github/workflows/test.yml`)

**Triggers**: Push to main, pull requests
**Steps**:

1. Checkout code
2. Setup pnpm and Node.js
3. Install dependencies
4. Run tests

### Test Results

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

---

**Next**: [Build Process](build-process.md) for compilation and packaging details.
