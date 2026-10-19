#!/usr/bin/env node
/**
 * Fails when this public package contains private content: app source paths, TypeScript file
 * names, developer machine paths, team or App Group IDs, real UUIDs, or skill descriptions that
 * agents truncate. With --tools-dir <dir> (or SCRIBIS_TOOLS_DIR) it also checks that every tool
 * name the skills mention is defined by the tool sources in that directory.
 *
 * Usage: node scripts/check-public-content.js [--tools-dir <dir>] [--root <dir>]
 * Exits with 1 and lists each finding as file:line when something is found.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF = fileURLToPath(import.meta.url);
const SKIPPED_DIRECTORIES = new Set(['node_modules', '.git']);
// Generated or third-party files that are not authored here.
const SKIPPED_FILES = new Set(['package-lock.json', 'LICENSE']);
const TEXT_EXTENSIONS = new Set([
  '.js',
  '.cjs',
  '.mjs',
  '.json',
  '.md',
  '.html',
  '.txt',
  '.yml',
  '.yaml',
  '.sh'
]);

// Codex rejects skills whose description is longer than 500 characters; the open spec allows 1024.
const MAX_SKILL_DESCRIPTION = 500;
const TOOL_NAME = /^(cuts|scenes|audio|youtube|app|scribis)_[a-z_]+$/;
/** Placeholder user names allowed in home folder examples (macOS and Windows). */
const ALLOWED_USERS = new Set(['username', 'alice']);
/** Obvious placeholders that look like 10-character team IDs (used by the CLI tests). */
const ALLOWED_TEAM_ID_PLACEHOLDERS = new Set(['TEAMID1234', 'ABCDE12345', 'ANOTHER999']);

/** Each rule returns the offending text of every match on a line. */
const LINE_RULES = [
  {
    name: 'app source path',
    // A path below src/ (a folder or a file with an extension), not prose such as `src/href`.
    find: (line) => matches(line, /(?<![\w.@/-])src\/(?:[\w.-]+\/|[\w-]+\.\w+)[\w./-]*/g)
  },
  {
    name: 'TypeScript file name',
    find: (line) =>
      matches(line, /\b[\w-]+(?:\.d)?\.tsx?\b(?![\w-])/g).filter((m) => !/^\d/.test(m))
  },
  { name: 'native binding internals', find: (line) => matches(line, /rust-binding/g) },
  {
    name: 'Windows home path',
    find: (line) =>
      [...line.matchAll(/[A-Za-z]:\\{1,2}Users\\{1,2}([^\\\s`'")\]]+)/gi)]
        .filter(([, user]) => !isPlaceholderUser(user))
        .map(([text]) => text)
  },
  { name: 'developer drive path', find: (line) => matches(line, /\bD:\\{1,2}/g) },
  {
    name: 'macOS home path',
    find: (line) =>
      [...line.matchAll(/\/Users\/([^/\s`'")\]]+)/g)]
        .filter(([, user]) => !isPlaceholderUser(user))
        .map(([text]) => text)
  },
  {
    name: 'team ID',
    find: (line) =>
      matches(line, /\b[A-Z0-9]{10}\b/g).filter(
        (m) => /\d/.test(m) && /[A-Z]/.test(m) && !ALLOWED_TEAM_ID_PLACEHOLDERS.has(m)
      )
  },
  {
    name: 'App Group ID',
    find: (line) => matches(line, /\bgroup\.(?:com|net|org|io|app)\.[\w.-]+/gi)
  },
  {
    name: 'UUID',
    find: (line) =>
      matches(line, /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi).filter(
        (m) => !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(m)
      )
  }
];

function isPlaceholderUser(user) {
  return ALLOWED_USERS.has(user) || /^[<$%{.]/.test(user);
}

function matches(line, pattern) {
  return [...line.matchAll(pattern)].map((match) => match[0]);
}

function listFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) files.push(...listFiles(full));
    } else if (
      entry.isFile() &&
      full !== SELF &&
      !SKIPPED_FILES.has(entry.name) &&
      TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    ) {
      files.push(full);
    }
  }
  return files;
}

/** Reads the `description` of a SKILL.md frontmatter, unfolding `>` and `|` blocks. */
function readSkillDescription(text) {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!frontmatter) return null;
  const lines = frontmatter[1].split(/\r?\n/);
  const start = lines.findIndex((line) => /^description:/.test(line));
  if (start < 0) return null;
  const inline = lines[start].replace(/^description:\s*/, '');
  if (!/^[>|][+-]?$/.test(inline)) return inline.replace(/^(['"])(.*)\1$/, '$2');
  const block = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() && !/^\s/.test(line)) break;
    block.push(line.trim());
  }
  return block.join(inline.startsWith('|') ? '\n' : ' ').trim();
}

/** Tool names mentioned in backticks: `name` or the start of a call such as `name(args)`. */
function findToolMentions(line) {
  return [...line.matchAll(/`([a-z_]+)(?:\([^`]*\)?)?[^`]*`/g)]
    .map((match) => match[1])
    .filter((name) => TOOL_NAME.test(name));
}

/**
 * Every identifier of the tool-name shape the tool sources use: tool names, plus argument and
 * result fields that share a prefix (such as an `audio_` argument).
 */
function collectToolNames(toolsDir) {
  const names = new Set();
  for (const file of fs.readdirSync(toolsDir)) {
    if (!/\.[cm]?[jt]s$/.test(file)) continue;
    const text = fs.readFileSync(path.join(toolsDir, file), 'utf8');
    for (const match of text.matchAll(/\b[a-z][a-z_]*\b/g)) {
      if (TOOL_NAME.test(match[0])) names.add(match[0]);
    }
  }
  return names;
}

function readOption(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? path.resolve(argv[index + 1]) : null;
}

function main() {
  const findings = [];
  const argv = process.argv.slice(2);
  // --root checks another folder (used by the tests); the default is this package.
  const root = readOption(argv, '--root') || PACKAGE_ROOT;
  const toolsDir =
    readOption(argv, '--tools-dir') ||
    (process.env.SCRIBIS_TOOLS_DIR ? path.resolve(process.env.SCRIBIS_TOOLS_DIR) : null);
  let toolNames = null;
  if (toolsDir) {
    if (!fs.existsSync(toolsDir)) {
      console.error(`Tools directory not found: ${toolsDir}`);
      process.exit(2);
    }
    toolNames = collectToolNames(toolsDir);
    if (toolNames.size === 0) {
      console.error(`No tool names found in ${toolsDir}`);
      process.exit(2);
    }
  }

  const files = listFiles(root);
  for (const file of files) {
    const relative = path.relative(root, file).split(path.sep).join('/');
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    const isSkillDoc = relative.startsWith('skills/') && relative.endsWith('.md');

    lines.forEach((line, i) => {
      for (const rule of LINE_RULES) {
        for (const found of rule.find(line)) {
          findings.push(`${relative}:${i + 1}: ${rule.name}: ${found}`);
        }
      }
      if (isSkillDoc && toolNames) {
        for (const name of findToolMentions(line)) {
          if (!toolNames.has(name)) findings.push(`${relative}:${i + 1}: unknown tool: ${name}`);
        }
      }
    });

    if (path.basename(file) === 'SKILL.md') {
      const description = readSkillDescription(text);
      if (!description) {
        findings.push(`${relative}:1: SKILL.md frontmatter has no description`);
      } else if (description.length > MAX_SKILL_DESCRIPTION) {
        findings.push(
          `${relative}:1: description is ${description.length} characters (max ${MAX_SKILL_DESCRIPTION})`
        );
      }
    }
  }

  if (findings.length > 0) {
    console.error(`Public content check failed (${findings.length} finding(s)):`);
    for (const finding of findings) console.error(`  ${finding}`);
    process.exit(1);
  }
  const toolNote = toolNames
    ? `, ${toolNames.size} tool names verified`
    : ' (tool names not verified: pass --tools-dir to check them)';
  console.log(`Public content check passed: ${files.length} files${toolNote}.`);
}

main();
