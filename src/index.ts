import * as core from '@actions/core';

import { createContext } from './context';
import buildAndTagAction from './lib';

async function run() {
  try {
    const commitSha = await buildAndTagAction(createContext());
    core.setOutput('commit_sha', commitSha);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    core.setFailed(message);
  }
}

if (!process.env.VITEST) {
  run();
}
