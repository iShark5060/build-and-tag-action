import * as core from '@actions/core';
import semver from 'semver';

import type { ActionContext } from '../context';
import { getCommitMessage, shouldUpdateMajorMinorTags } from '../inputs';
import createCommit from './create-commit';
import createOrUpdateRef from './create-or-update-ref';
import getTagName from './get-tag-name';

export default async function buildAndTagAction(ctx: ActionContext): Promise<string> {
  const tagName = getTagName(ctx);
  core.info(`Updating tag [${tagName}]`);

  const commit = await createCommit(ctx, getCommitMessage());
  const commitSha = commit.sha!;
  await createOrUpdateRef(ctx, commitSha, tagName);

  let rewriteMajorAndMinorRef = shouldUpdateMajorMinorTags();

  if (ctx.eventName === 'release') {
    const release = ctx.payload.release as { draft?: boolean; prerelease?: boolean } | undefined;
    if (release?.draft || release?.prerelease) {
      rewriteMajorAndMinorRef = false;
    }
  }

  if (semver.prerelease(tagName)) {
    rewriteMajorAndMinorRef = false;
  }

  if (rewriteMajorAndMinorRef) {
    const cleanTag = semver.clean(tagName);
    if (!cleanTag) {
      core.warning(`Skipping major/minor tag update: [${tagName}] is not a valid semver tag`);
    } else {
      const majorStr = semver.major(cleanTag).toString();
      const minorStr = semver.minor(cleanTag).toString();
      await createOrUpdateRef(ctx, commitSha, `v${majorStr}.${minorStr}`);
      await createOrUpdateRef(ctx, commitSha, `v${majorStr}`);
    }
  }

  return commitSha;
}
