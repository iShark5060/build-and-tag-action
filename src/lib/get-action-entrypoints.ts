import { readFileSync } from 'fs';
import path from 'path';

import { parse as parseYaml } from 'yaml';

interface ActionManifest {
  runs?: {
    main?: string;
    pre?: string;
    post?: string;
  };
}

export function getActionEntrypoints(workspace: string, actionFileName: string): string[] {
  const content = readFileSync(path.join(workspace, actionFileName), 'utf8');
  const manifest = parseYaml(content) as ActionManifest;
  const runs = manifest.runs ?? {};

  return [runs.main, runs.pre, runs.post].filter((entry): entry is string =>
    Boolean(entry?.trim()),
  );
}
