# Release Process and Version Management

## Overview

This document describes the release process, version management, and operational practices for the build-and-tag-action repository. It covers how the action is released, versioned, and maintained.

## Release Strategy

### Fork Maintenance Model

This repository is a **maintained fork** of [JasonEtco/build-and-tag-action](https://github.com/JasonEtco/build-and-tag-action). The release strategy balances:

1. **Compatibility**: Maintain API compatibility with original
2. **Updates**: Incorporate security and dependency updates
3. **Improvements**: Add enhancements while preserving stability

### Versioning Approach

**Current Version**: `v1` (maintained fork)
**Original Versions**: `v1`, `v2` (from JasonEtco repository)

**Tag Structure**:

- `v1`: Floating major version tag
- `v1.0`: Floating minor version tag
- `v1.0.0`: Exact release version tag

## Release Workflow

### Automated Release Process

The repository uses GitHub's release system with automated tagging via the action itself.

**Workflow File**: `/.github/workflows/release.yml`

### Release Steps

#### 1. Create GitHub Release

```yaml
# Manual or automated release creation
# Options: Draft → Pre-release → Full release
```

#### 2. Trigger Release Workflow

- Workflow triggers on `release: published` event
- Uses the release tag being created
- Builds and tags the action

#### 3. Self-application

The action builds itself and updates its own tags:

```yaml
- uses: iShark5060/build-and-tag-action@v1
  env:
    GITHUB_TOKEN: ${{ github.token }}
```

### Release Types

#### Draft Releases

- **Purpose**: Testing and verification
- **Tag Updates**: Release tag only (no floating tags)
- **Verification**: Can be promoted to full release

#### Pre-release Releases

- **Purpose**: Beta/testing versions
- **Tag Updates**: Release tag only (no floating tags)
- **Audience**: Early adopters, testing

#### Full Releases

- **Purpose**: Stable production versions
- **Tag Updates**: All tags (release + floating)
- **Audience**: All users

## Version Management

### Tag Management Rules

#### Automatic Tag Updates

For version `v1.2.3`:

- **Release Tag**: `v1.2.3` (always updated)
- **Minor Tag**: `v1.2` (updated if not draft/pre-release)
- **Major Tag**: `v1` (updated if not draft/pre-release)

#### Tag Update Conditions

Floating tags are updated when:

1. `update_major_minor_tags` is `true` (default)
2. Release is NOT a draft
3. Release is NOT a pre-release
4. Tag follows valid semver
5. Tag has no pre-release identifiers

### Semantic Versioning

**Format**: `vMAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (not expected in maintained fork)
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, maintenance

**Pre-release Identifiers**: `v1.0.0-alpha.1`, `v1.0.0-beta.1`

## Operational Procedures

### Creating a New Release

#### Step 1: Prepare Changes

```bash
# Ensure tests pass
pnpm test

# Build locally to verify
pnpm run build

# Verify bundle
node --check dist/index.mjs
```

#### Step 2: Create Draft Release

1. Go to GitHub Releases page
2. Click "Draft a new release"
3. Set tag version (e.g., `v1.0.1`)
4. Select "This is a pre-release" if beta testing
5. Add release notes
6. Create as draft

#### Step 3: Verify Draft Release

1. Check release workflow completes
2. Verify tags created correctly
3. Test action functionality

#### Step 4: Promote to Full Release

1. Edit draft release
2. Uncheck "This is a pre-release" (if applicable)
3. Publish release

### Dependency Updates

#### Automated Updates

Dependabot configuration (`/.github/dependabot.yml`):

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: '/'
    schedule:
      interval: weekly
    groups:
      production-dependencies:
        dependency-type: production
      development-dependencies:
        dependency-type: development
```

#### Manual Update Process

```bash
# Update dependencies
pnpm run deps  # Runs npm-check-updates
pnpm install   # Update lock file

# Test changes
pnpm test

# Create release with dependency updates
```

### Security Updates

**Monitoring**: Dependabot security alerts
**Response**: Create patch release with updated dependencies
**Timeline**: Critical updates within 72 hours, others within 2 weeks

## Quality Assurance

### Pre-release Checklist

- [ ] All tests pass (`pnpm test`)
- [ ] Build completes successfully (`pnpm run build`)
- [ ] Bundle verification passes (`node --check dist/index.mjs`)
- [ ] Release notes updated
- [ ] Documentation reviewed
- [ ] Backward compatibility verified

### Post-release Verification

- [ ] Release workflow completed successfully
- [ ] Tags created/updated correctly
- [ ] Action works in test workflow
- [ ] No regressions in dependent workflows

## Maintenance Tasks

### Regular Maintenance

**Weekly**:

- Review Dependabot pull requests
- Check test status
- Monitor issue reports

**Monthly**:

- Review dependency versions
- Update documentation if needed
- Check compatibility with GitHub Actions changes

**Quarterly**:

- Security audit of dependencies
- Performance review
- Process improvement evaluation

### Issue Management

**Bug Reports**:

1. Reproduce issue
2. Fix in feature branch
3. Test thoroughly
4. Release patch version

**Feature Requests**:

1. Evaluate against project scope
2. Design implementation
3. Develop in feature branch
4. Release minor version

**Security Issues**:

1. Immediate assessment
2. Temporary mitigation if needed
3. Fix in private branch
4. Release patch version

## Rollback Procedures

### Tag Rollback

If incorrect release published:

```bash
# Revert tag to previous commit
git tag -f v1.0.0 <previous-commit-sha>
git push origin v1.0.0 --force

# Update floating tags if needed
git tag -f v1.0 <previous-commit-sha>
git tag -f v1 <previous-commit-sha>
git push origin v1.0 v1 --force
```

### Release Deletion

1. Delete GitHub release
2. Delete associated tag
3. Re-release correct version

### Database of Releases

**Record Keeping**:

- GitHub Releases page
- Git tag history
- CHANGELOG updates (if maintained)

## Compatibility Management

### GitHub Actions Runtime

**Current Runtime**: Node.js 24
**Monitoring**: GitHub Actions changelog for runtime updates
**Update Policy**: Update within 30 days of runtime changes

### Original Repository

**Compatibility Goal**: Maintain API compatibility
**Monitoring**: Watch original repository for changes
**Sync Policy**: Selective updates that maintain stability

### User Workflows

**Breaking Changes**: Avoid in maintained fork
**Deprecation Policy**: Announce changes one release cycle in advance
**Migration Guidance**: Provide clear upgrade instructions

## Performance Monitoring

### Release Metrics

**Build Time**: Typically < 1 minute
**Bundle Size**: ~100-200KB
**Test Coverage**: > 90% (target)

### User Impact Metrics

**Download Counts**: GitHub release statistics
**Issue Frequency**: Bug reports per release
**Adoption Rate**: Usage in workflows

## Documentation Updates

### Release Documentation

**Required Updates**:

1. Release notes in GitHub
2. Version references in documentation
3. Example updates if APIs change

**Optional Updates**:

1. README feature highlights
2. Usage examples
3. Troubleshooting guides

### Documentation Review Cycle

**Pre-release**: Review all documentation
**Post-release**: Update based on user feedback
**Quarterly**: Full documentation review

## Communication

### Release Announcements

**Channels**:

- GitHub Releases page
- Repository README (if major changes)
- Issue/PR references

**Content**:

- Version number
- Changes summary
- Upgrade instructions
- Known issues

### User Support

**Issue Responses**: Within 48 hours
**Bug Fixes**: Patch release within 1 week
**Questions**: Documentation references and examples

## Legal and Compliance

### License Management

**Current License**: MIT (from original repository)
**Attribution**: Maintain fork notice in README
**Compliance**: Ensure all dependencies have compatible licenses

### Security Compliance

**Vulnerability Scanning**: Dependabot security alerts
**Response Time**: Critical issues within 72 hours
**Disclosure**: Coordinated vulnerability disclosure

## Backup and Recovery

### Repository Backup

**Primary**: GitHub.com
**Secondary**: Local clones by maintainers
**Archive**: Regular exports of release artifacts

### Recovery Procedures

**Data Loss**: Restore from GitHub backups
**Code Loss**: Reclone from GitHub
**Configuration Loss**: Restore from repository files

## Continuous Improvement

### Process Evaluation

**Monthly Review**: Release process effectiveness
**Quarterly Review**: Toolchain and dependencies
**Annual Review**: Overall strategy and goals

### Feedback Incorporation

**User Feedback**: Issue reports and discussions
**Metrics Analysis**: Release success rates
**Industry Trends**: GitHub Actions ecosystem changes

---

**Related**: [Build Process](../development/build-process.md) for compilation details, [Configuration Reference](../workflows/configuration.md) for action specifications.
