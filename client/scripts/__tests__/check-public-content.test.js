// Run with: node mcp_client/scripts/__tests__/check-public-content.test.js
// The private-looking samples are assembled at run time so this file passes the check itself.
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const SCRIPT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../check-public-content.js'
);
const BACKSLASH = String.fromCharCode(92);

function check(root, extraArgs = []) {
  const result = spawnSync(process.execPath, [SCRIPT, '--root', root, ...extraArgs], {
    encoding: 'utf8',
    env: { ...process.env, SCRIBIS_TOOLS_DIR: '' }
  });
  return { code: result.status, output: result.stdout + result.stderr };
}

function makePackage(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scribis-public-check-'));
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

const skill = (description, body = '') =>
  `---\nname: demo\ndescription: >\n  ${description}\n---\n${body}\n`;
const roots = [];

try {
  console.log('Testing a clean package...');
  const clean = makePackage({
    'README.md':
      'Use `/Users/username/Movies/a.mp4` or `C:' +
      BACKSLASH +
      'Users' +
      BACKSLASH +
      'alice' +
      BACKSLASH +
      'a.mp4`.\n',
    'skills/demo/SKILL.md': skill(
      'Short description.',
      'Call `scenes_open` then `cuts_get_project(project_id)`.'
    ),
    'tools/scene-tools.js': "server.tool('scenes_open'); server.tool('cuts_get_project');\n"
  });
  roots.push(clean);
  const passed = check(clean, ['--tools-dir', path.join(clean, 'tools')]);
  assert.strictEqual(passed.code, 0, passed.output);
  assert.match(passed.output, /2 tool names verified/);
  console.log('  ✓ placeholders and known tools pass');

  console.log('Testing each private-content rule...');
  const samples = {
    'app source path': 'See ' + 'sr' + 'c/main/mcp/server.js for details.',
    'TypeScript file name': 'Defined in mcp-server-core' + '.ts.',
    'native binding internals': 'Built by rust' + '-binding.',
    'Windows home path': 'C:' + BACKSLASH + 'Users' + BACKSLASH + 'jdoe' + BACKSLASH + 'file',
    'developer drive path': 'D' + ':' + BACKSLASH + 'workspace',
    'macOS home path': '/Users/' + 'jdoe/Movies',
    'team ID': 'Team ' + 'QX7' + 'Z2KD9PL here.',
    'App Group ID': 'group' + '.com.example.app',
    UUID: 'Project ' + '5c1e9a40-1b2c-4d5e-' + '8f90-a1b2c3d4e5f6'
  };
  for (const [rule, text] of Object.entries(samples)) {
    const root = makePackage({ 'docs.md': `${text}\n` });
    roots.push(root);
    const result = check(root);
    assert.strictEqual(result.code, 1, `${rule}: ${result.output}`);
    assert.ok(result.output.includes(`docs.md:1: ${rule}`), `${rule}: ${result.output}`);
  }
  console.log('  ✓ every rule reports file:line');

  console.log('Testing SKILL.md descriptions and tool names...');
  const long = makePackage({ 'skills/demo/SKILL.md': skill('x'.repeat(1100)) });
  roots.push(long);
  const longResult = check(long);
  assert.strictEqual(longResult.code, 1);
  assert.match(longResult.output, /description is 1100 characters \(max 500\)/);

  const unknown = makePackage({
    'skills/demo/SKILL.md': skill('Short.', 'Use `scenes_open_typo` and `scenes_open("id")`.'),
    'tools/scene-tools.js': "server.tool('scenes_open');\n"
  });
  roots.push(unknown);
  const unknownResult = check(unknown, ['--tools-dir', path.join(unknown, 'tools')]);
  assert.strictEqual(unknownResult.code, 1, unknownResult.output);
  assert.match(unknownResult.output, /unknown tool: scenes_open_typo/);
  assert.ok(!/unknown tool: scenes_open\b(?!_)/.test(unknownResult.output), unknownResult.output);

  const missingDir = check(unknown, ['--tools-dir', path.join(unknown, 'nope')]);
  assert.strictEqual(missingDir.code, 2, missingDir.output);
  console.log('  ✓ long descriptions and unknown tools fail');

  console.log('\nAll public content check tests passed.');
} finally {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
}
