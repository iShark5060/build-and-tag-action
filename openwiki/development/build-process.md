# Build Process and Toolchain

## Overview

This document describes the build process, toolchain, and development setup for the build-and-tag-action. The project uses modern JavaScript/TypeScript tooling with pnpm for package management and esbuild for bundling.

## Development Environment

### Prerequisites

- **Node.js**: Version 24 or higher (runtime uses Node.js 24)
- **Package Manager**: pnpm (version specified in `packageManager` field)
- **Git**: For version control

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd build-and-tag-action

# Install dependencies
pnpm install

# Verify setup
pnpm test
```

## Configuration Files

### Development Tool Configuration

- **`.oxfmtrc.json`**: Configuration for oxfmt code formatter
- **`.oxlintrc.json`**: Configuration for oxlint TypeScript/JavaScript linter
- **`.tool-versions`**: Runtime version specification (asdf-compatible)

### Package Management

#### pnpm Configuration

**Workspace Configuration** (`/pnpm-workspace.yaml`):

```yaml
allowBuilds:
  esbuild: true
```

**Lock File**: `pnpm-lock.yaml` ensures reproducible installs

**Package Manager Pinning** (`/package.json`):

```json
{
  "packageManager": "pnpm@11.10.0"
}
```

### Dependency Management

**Production Dependencies**:

```json
{
  "dependencies": {
    "@actions/core": "^3.0.1",
    "@actions/github": "^9.1.1",
    "semver": "^7.8.5",
    "yaml": "^2.9.0"
  }
}
```

**Development Dependencies**:

```json
{
  "devDependencies": {
    "@types/node": "^24.13.3",
    "@types/semver": "^7.7.1",
    "esbuild": "^0.28.1",
    "oxfmt": "^0.58.0",
    "oxlint": "^1.73.0",
    "typescript": "^7.0.2",
    "vitest": "^4.1.10"
  }
}
```

### Dependency Updates

**Manual Update**:

```bash
pnpm run deps  # Runs npm-check-updates
pnpm install   # Update lock file
```

**Automated Updates**: Dependabot configuration in `/.github/dependabot.yml`

## TypeScript Configuration

### Compiler Options (`/tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2023"],
    "strict": true,
    "esModuleInterop": true,
    "types": ["node"],
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "removeComments": true
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts"]
}
```

**Key Settings**:

- **Target**: ES2022 for modern JavaScript features
- **Module**: ESNext for ES module support
- **Module Resolution**: Bundler for compatibility with bundlers
- **Strict**: Full TypeScript strict mode
- **Output**: `dist/` directory for compiled files
- **Root**: `src/` directory for source files

## Build Process

### Build Script (`package.json`)

```json
{
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=node --format=cjs --target=node24 --outfile=dist/index.js --minify"
  }
}
```

### Build Steps

#### 1. Compilation with esbuild

```bash
esbuild src/index.ts --bundle --platform=node --format=cjs --target=node24 --outfile=dist/index.js --minify
```

**What esbuild does**:

- Bundles all dependencies into single file
- Tree-shakes unused code
- Minifies output for smaller bundle size
- Outputs to `dist/index.js` (CommonJS format for GitHub Actions)

#### 2. Output Structure

```
dist/
└── index.js           # Bundled action (CommonJS format)
```

**File Size**: Typically 100-200KB after minification
**Included Dependencies**: @actions/core, @actions/github, semver, yaml

## Quality Assurance Scripts

### Runtime Preflight Check (`scripts/runtime-preflight.mjs`)

Validates environment before running quality checks:

- Verifies Node.js version (24+)
- Checks pnpm version compatibility
- Ensures required tools are available

### Quality Checks (`run-quality-checks.mjs`)

Comprehensive quality validation script that runs:

1. **Formatting check** (`pnpm run check-format`)
2. **Linting** (`pnpm run lint`)
3. **Type checking** (`pnpm run typecheck`)
4. **Tests** (`pnpm run test`)

**Usage**:

```bash
pnpm run validate  # Runs all quality checks
```

## Development Workflow

### Local Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build action
pnpm run build

# Verify bundle
node --check dist/index.js
```

### Code Quality

**Type Checking**: Built into TypeScript compilation
**Testing**: Vitest for unit tests
**Linting**: oxlint for code quality checks
**Formatting**: oxfmt for code formatting

### File Structure Conventions

- **Source Files**: `/src/**/*.ts`
- **Test Files**: `/tests/**/*.test.ts`
- **Fixtures**: `/tests/fixtures/**/*`
- **Build Output**: `/dist/index.js`
- **Configuration**: Root-level `*.json`, `*.yml`, `*.mjs` files

## GitHub Actions Integration

### Action Specification (`/action.yml`)

```yaml
runs:
  using: node24
  main: dist/index.js
```

**Runtime**: Node.js 24 (GitHub Actions supported version)
**Entry Point**: Compiled bundle at `dist/index.js` (CommonJS format)

### Release Workflow (`/.github/workflows/release.yml`)

**Purpose**: Build and release the action itself
**Steps**:

1. Checkout release tag
2. Setup pnpm and Node.js
3. Install dependencies
4. Build action
5. Verify bundle
6. Run build-and-tag-action on itself

### CI Workflow (`/.github/workflows/ci.yml`)

**Purpose**: Run tests on push and PR
**Steps**:

1. Checkout code
2. Setup pnpm and Node.js
3. Install dependencies
4. Run tests

## Module System

### CommonJS for Runtime

**Package.json Configuration**:

```json
{
  "main": "dist/index.js"
}
```

**Action.yml Configuration**:

```yaml
runs:
  using: node24
  main: dist/index.js
```

**Source Code**: TypeScript with ES module syntax (`import/export`)
**Compiled Output**: CommonJS format for GitHub Actions compatibility

### TypeScript Modules

**Export Patterns**:

```typescript
// Default export (main functions)
export default function buildAndTagAction(ctx: ActionContext): Promise<string>

// Named exports (utilities)
export function createContext(): ActionContext

// Type exports
export interface ActionContext { ... }
```

## Dependency Analysis

### External Dependencies

#### Core Dependencies

- **@actions/core**: GitHub Actions SDK for inputs/outputs
- **@actions/github**: GitHub API client with Octokit
- **semver**: Semantic version parsing and comparison
- **yaml**: YAML parsing for action.yml files

#### Why These Dependencies?

- **Minimal Set**: Only essential dependencies included
- **Stable APIs**: Mature libraries with long-term support
- **Action Focus**: Specific to GitHub Actions use case

### Bundle Analysis

**esbuild Output**: Single file with all dependencies bundled
**Tree Shaking**: Unused code removed during bundling
**Minification**: Code size reduced for faster loading
