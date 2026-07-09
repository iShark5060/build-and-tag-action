import { spawnSync } from 'node:child_process';

const preflight = spawnSync('node', ['scripts/runtime-preflight.mjs'], {
  stdio: 'inherit',
  shell: false,
});
if (preflight.status !== 0) {
  process.exit(preflight.status ?? 1);
}

const steps = [
  { name: 'Formatting', command: 'pnpm run check-format' },
  { name: 'Lint', command: 'pnpm run lint' },
  { name: 'Typecheck', command: 'pnpm run typecheck' },
  { name: 'Tests', command: 'pnpm run test' },
];

const results = [];
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const color = {
  green: useColor ? '\x1b[32m' : '',
  yellow: useColor ? '\x1b[33m' : '',
  red: useColor ? '\x1b[31m' : '',
  reset: useColor ? '\x1b[0m' : '',
};

const WARNING_PATTERN = /(^|\s)(\d+)?\s*warnings?\b/i;
const ZERO_WARNING_PATTERN = /\b0 warnings?\b/i;

for (const step of steps) {
  console.log(`\n=== ${step.name}: ${step.command} ===`);
  const startedAt = process.hrtime.bigint();

  const run = spawnSync(step.command, {
    stdio: 'pipe',
    shell: true,
    encoding: 'utf8',
  });
  process.stdout.write(run.stdout ?? '');
  process.stderr.write(run.stderr ?? '');
  const finishedAt = process.hrtime.bigint();
  const elapsedMs = Number(finishedAt - startedAt) / 1_000_000;
  const elapsedSeconds = elapsedMs / 1000;

  const success = run.status === 0;
  const output = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
  const shouldDetectWarnings = step.detectWarnings !== false;
  const warningPattern = step.warningPattern ?? WARNING_PATTERN;
  const zeroWarningPattern = step.warningZeroPattern ?? ZERO_WARNING_PATTERN;
  const hasWarnings =
    success &&
    shouldDetectWarnings &&
    warningPattern.test(output) &&
    !zeroWarningPattern.test(output);
  results.push({ name: step.name, success, hasWarnings, elapsedSeconds });
  console.log(
    `--- ${step.name} completed in ${elapsedSeconds.toFixed(2)}s (${success ? (hasWarnings ? 'WARN' : 'PASS') : 'FAIL'}) ---`,
  );
}

console.log('\n=== Summary ===');
for (const result of results) {
  if (result.success && result.hasWarnings) {
    console.log(
      `[${color.yellow}!${color.reset}] ${result.name} Warnings (${result.elapsedSeconds.toFixed(2)}s)`,
    );
  } else if (result.success) {
    console.log(
      `[${color.green}✓${color.reset}] ${result.name} (${result.elapsedSeconds.toFixed(2)}s)`,
    );
  } else {
    console.log(
      `[${color.red}✗${color.reset}] ${result.name} Failed (${result.elapsedSeconds.toFixed(2)}s)`,
    );
  }
}

const hasFailures = results.some((result) => !result.success);
if (hasFailures) {
  process.exitCode = 1;
}
