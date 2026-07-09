# Build Process and Toolchain

## Overview

This document describes the build process, toolchain, and development setup for the build-and-tag-action. The project uses modern JavaScript/TypeScript tooling with pnpm for package management and @vercel/ncc for bundling.

## Development Environment

### Prerequisites

- **Node.js**: Version 20 or higher (runtime uses Node.js 24)
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

## Package Management

### pnpm Configuration

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
    "@types/node": "^26.1.0",
    "@types/semver": "^7.7.1",
    "@vercel/ncc": "^0.44.1",
    "typescript": "^6.0.3",
    "vitest": "^4.1.9"
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
- **Module Resolution**: Bundler for compatibility with ncc
- **Strict**: Full TypeScript strict mode
- **Output**: `dist/` directory for compiled files
- **Root**: `src/` directory for source files

## Build Process

### Build Script (`package.json`)

```json
{
  "scripts": {
    "build": "ncc build -o dist --minify src/index.ts && node --input-type=module -e \"import fs from 'fs'; fs.renameSync('dist/index.js','dist/index.mjs'); fs.rmSync('dist/package.json',{force:true});\""
  }
}
```

### Build Steps

#### 1. Compilation with ncc

```bash
ncc build -o dist --minify src/index.ts
```

**What ncc does**:

- Bundles all dependencies into single file
- Tree-shakes unused code
- Minifies output for smaller bundle size
- Outputs to `dist/index.js`

#### 2. Rename to .mjs

```bash
node --input-type=module -e "import fs from 'fs'; fs.renameSync('dist/index.js','dist/index.mjs');"
```

**Why .mjs**:

- Clear ES module indication
- Required for `type: "module"` in package.json
- GitHub Actions expects ES modules for Node.js actions

#### 3. Cleanup

```bash
fs.rmSync('dist/package.json',{force:true})
```

**Removes**: ncc-generated package.json to avoid conflicts

### Output Structure

```
dist/
└── index.mjs           # Bundled action (ES module)
```

**File Size**: Typically 100-200KB after minification
**Included Dependencies**: @actions/core, @actions/github, semver, yaml

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
node --check dist/index.mjs
```

### Code Quality

**Type Checking**: Built into TypeScript compilation
**Testing**: Vitest for unit tests
**No Linting**: No ESLint/prettier configuration in this repository

### File Structure Conventions

- **Source Files**: `/src/**/*.ts`
- **Test Files**: `/tests/**/*.test.ts`
- **Fixtures**: `/tests/fixtures/**/*`
- **Build Output**: `/dist/index.mjs`
- **Configuration**: Root-level `*.json`, `*.yml` files

## GitHub Actions Integration

### Action Specification (`/action.yml`)

```yaml
runs:
  using: node24
  main: dist/index.mjs
```

**Runtime**: Node.js 24 (GitHub Actions supported version)
**Entry Point**: Compiled bundle at `dist/index.mjs`

### Release Workflow (`/.github/workflows/release.yml`)

**Purpose**: Build and release the action itself
**Steps**:

1. Checkout release tag
2. Setup pnpm and Node.js
3. Install dependencies
4. Build action
5. Verify bundle
6. Run build-and-tag-action on itself

### Test Workflow (`/.github/workflows/test.yml`)

**Purpose**: Run tests on push and PR
**Steps**:

1. Checkout code
2. Setup pnpm and Node.js
3. Install dependencies
4. Run tests

## Module System

### ES Modules

**Package.json Configuration**:

```json
{
  "type": "module",
  "main": "dist/index.mjs"
}
```

**Imports**: Use ES module syntax (`import/export`)
**File Extensions**: `.ts` for source, `.mjs` for compiled output

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

**ncc Output**: Single file with all dependencies bundled
**Tree Shaking**: Unused code removed during bundling
**Minification**: Code size reduced for faster loading

## Version Management

### Package Version

**Current**: `1.0.0` (private package)
**Versioning**: Semantic versioning for releases

### Node.js Version Compatibility

**Build Time**: Node.js 20+ (development)
**Runtime**: Node.js 24 (production, per action.yml)
**API Compatibility**: GitHub Actions Node.js runtime API

## Build Artifacts

### Generated Files

**Primary Artifact**: `dist/index.mjs`

- Contains bundled action code
- Includes all dependencies
- Minified for performance
- ES module format

**No Source Maps**: Minified bundle doesn't include source maps
**No Type Definitions**: Runtime doesn't need TypeScript definitions

### Artifact Management

**Git Ignored**: `dist/` in `.gitignore` for development
**Release Only**: Built and included only in release tags
**Self-hosting**: Action builds itself during release

## Development Tools

### Recommended Editor Setup

**VS Code Extensions**:

- TypeScript/JavaScript language features
- GitHub Actions extension
- Vitest test runner integration

**Editor Settings**:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

### Debugging

**TypeScript Debugging**:

```bash
# Compile with source maps (development only)
npx tsc --sourceMap
```

**Test Debugging**:

```bash
# Run specific test with debug output
npx vitest run -t "test name" --reporter=verbose
```

**Action Debugging**:

```bash
# Enable step debugging
export ACTIONS_STEP_DEBUG=true
```

## Performance Considerations

### Build Performance

**ncc Caching**: ncc may cache compilation results
**Dependency Size**: Minimal dependencies keep bundle small
**Tree Shaking**: Dead code elimination reduces bundle size

### Runtime Performance

**Single Bundle**: No module resolution at runtime
**Minified Code**: Smaller download and parse time
**ES Module**: Native module support in Node.js

## Security Considerations

### Dependency Security

**Regular Updates**: Dependabot monitors for vulnerabilities
**Minimal Dependencies**: Reduced attack surface
**Trusted Sources**: Official GitHub and npm packages

### Build Process Security

**Local Builds**: Developers build locally before committing
**CI Verification**: GitHub Actions verifies builds
**Bundle Integrity**: Single file easier to audit

## Customization and Extension

### Modifying Build Process

**To change bundler**:

1. Update `build` script in package.json
2. Adjust TypeScript configuration if needed
3. Update test environment if bundle format changes

**To add preprocessing**:

1. Add build steps before ncc command
2. Update cleanup steps if needed
3. Test with full build process

### Supporting Additional Formats

**CommonJS Output**:

```bash
# Would require TypeScript module change
ncc build -o dist --minify src/index.ts --target commonjs
```

**Multiple Entry Points**:

```bash
# Would require action.yml and build script updates
ncc build -o dist --minify src/index.ts src/other.ts
```

## Troubleshooting Build Issues

### Common Problems

#### Issue: ncc bundle errors

**Solution**: Check import paths and dependency versions

#### Issue: .mjs file not recognized

**Solution**: Ensure `type: "module"` in package.json

#### Issue: Tests fail after build

**Solution**: Clear dist directory and rebuild

#### Issue: Bundle too large

**Solution**: Review dependencies for unnecessary imports

### Build Verification

```bash
# Verify bundle syntax
node --check dist/index.mjs

# Test bundle execution
node dist/index.mjs

# Check file size
ls -lh dist/index.mjs
```

---

**Related**: [Testing Architecture](testing.md) for test setup details, [Release Process](../operations/release-process.md) for deployment workflow.
