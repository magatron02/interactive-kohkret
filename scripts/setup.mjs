/**
 * One command that gets a new machine from "just unzipped this" to "the map is running".
 *
 *   npm run setup
 *
 * Checks what this machine has, installs what it safely can, and for the one thing a script has no
 * business installing on its own — Node itself — prints the exact command for this platform.
 *
 * Deliberately written in plain, old JavaScript with no imports at the top and no modern syntax in the
 * version check: the whole point is that it runs on the *wrong* Node version and explains why, rather
 * than dying with a syntax error and leaving the user guessing.
 */

var MIN = { major: 22, minor: 18 };

var raw = process.versions.node;
var parts = raw.split('.').map(Number);
var ok = parts[0] > MIN.major || (parts[0] === MIN.major && parts[1] >= MIN.minor);

function line(s) {
  process.stdout.write(s + '\n');
}

line('');
line('  Koh Kret Smart Tourism Map — setup');
line('  ' + '-'.repeat(48));
line('  node   v' + raw + (ok ? '  ok' : '  TOO OLD — need v' + MIN.major + '.' + MIN.minor + '+'));

if (!ok) {
  var plat = process.platform;
  line('');
  line('  This is a hard requirement, not a recommendation.');
  line('');
  line('  `npm test` and everything in scripts/ import lib/*.ts directly and rely on');
  line("  Node's own TypeScript stripping. That is why this project has no build step");
  line('  for its tests and no test framework at all. On an older Node those commands');
  line('  do not warn — they fail outright.');
  line('');
  line('  Install a current Node, then run `npm run setup` again:');
  line('');
  if (plat === 'win32') {
    line('    winget install OpenJS.NodeJS.LTS');
    line('    # or download from https://nodejs.org');
  } else if (plat === 'darwin') {
    line('    brew install node');
    line('    # or: nvm install --lts   (if you use nvm)');
  } else {
    line('    nvm install --lts');
    line('    # or your distro package manager, or https://nodejs.org');
  }
  line('');
  line('  Nothing was installed or changed.');
  line('');
  process.exit(1);
}

// Safe to use the real language from here down.
const { execFileSync, spawnSync } = await import('node:child_process');
const fs = await import('node:fs');
const path = await import('node:path');
const { fileURLToPath } = await import('node:url');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/*
  Invoking npm without a shell.

  On Windows `npm` is npm.cmd, and current Node refuses to spawn a .cmd without a shell (hardening
  against argument-injection through cmd.exe) — but turning the shell on earns a DeprecationWarning
  about unescaped arguments, and it also breaks `process.execPath`, which is normally
  "C:\Program Files\nodejs\node.exe" and gets split at the space. Both of those bit this script.

  npm sets `npm_execpath` to its own CLI entry point for any script it runs, so under `npm run setup`
  we can drive npm with the Node we are already inside: no shell, no warning, no quoting problem.
  The .cmd path stays only as a fallback for someone running this file directly.
*/
const npmCli = process.env.npm_execpath;
const viaNodeCli = Boolean(npmCli && npmCli.endsWith('.js'));
const isWin = process.platform === 'win32';

/** Returns [command, args] for an npm invocation, and whether it needs a shell. */
function npmCall(args) {
  if (viaNodeCli) return [process.execPath, [npmCli, ...args], {}];
  return [isWin ? 'npm.cmd' : 'npm', args, { shell: isWin }];
}

{
  const [cmd, args, opts] = npmCall(['--version']);
  line('  npm    v' + execFileSync(cmd, args, { encoding: 'utf8', ...opts }).trim() + '  ok');
}

// Chrome only powers `npm run shoot`; everything else works without it, so this is a note, not a gate.
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];
const chrome = CHROME.find((p) => fs.existsSync(p));
line('  chrome ' + (chrome ? 'found  ok' : 'not found — only `npm run shoot` needs it, skipping'));
line('');

/** `what` is either ['npm', [...npmArgs]] or ['node', [...nodeArgs]]. */
function run(label, what, rawArgs) {
  process.stdout.write('  ' + label.padEnd(24));
  const [cmd, args, opts] =
    what === 'npm' ? npmCall(rawArgs) : [process.execPath, rawArgs, {}];
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', ...opts });
  if (r.status !== 0) {
    line('FAILED');
    line('');
    line((r.stdout || '') + (r.stderr || ''));
    process.exit(1);
  }
  line('ok');
  return r.stdout || '';
}

// npm ci is the reproducible one and the lockfile is committed; fall back only if it is somehow absent.
const installArgs = fs.existsSync(path.join(root, 'package-lock.json'))
  ? ['ci', '--no-audit', '--no-fund']
  : ['install', '--no-audit', '--no-fund'];
run('installing deps', 'npm', installArgs);

const testOut = run('running tests', 'npm', ['test']);
const passed = (testOut.match(/^# pass (\d+)/m) || testOut.match(/pass (\d+)/) || [])[1];
run('typecheck', 'npm', ['run', 'typecheck']);
run('contrast gate', 'node', ['scripts/check-contrast.mjs']);
run('production build', 'npm', ['run', 'build']);

line('');
line('  ' + '-'.repeat(48));
line('  Ready.' + (passed ? '  ' + passed + ' assertions passed.' : ''));
line('');
line('    npm run dev      then open http://localhost:3000');
line('');
line('  Read README.md next. If you are going to edit the code, read CLAUDE.md —');
line('  it carries the rules this project holds itself to and the traps already hit.');
line('');
