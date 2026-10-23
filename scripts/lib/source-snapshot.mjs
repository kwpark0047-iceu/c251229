import fs from 'node:fs';
import path from 'node:path';
import { assertCronDisabled, isDeployablePath, sha256, validateEntries } from './release-policy.mjs';

const configFiles = ['package.json', 'package-lock.json', '.npmrc', 'next-env.d.ts', 'next.config.ts', 'postcss.config.mjs', 'tsconfig.json', 'vercel.json'];
const digestFiles = files => sha256(JSON.stringify(files));

export function snapshotSource(root) {
  if (fs.lstatSync(root).isSymbolicLink()) throw Error('Linked source root');
  const files = [];
  const visit = rel => {
    const absolute = path.join(root, rel), stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) throw Error('Linked source path: ' + rel);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(absolute).sort()) visit(rel + '/' + name);
    } else if (stat.isFile() && isDeployablePath(rel)) {
      files.push({ path: rel, sha256: sha256(fs.readFileSync(absolute)) });
    } else if (!stat.isFile()) throw Error('Non-regular source path: ' + rel);
  };
  for (const rel of ['src', 'public', ...configFiles]) if (fs.existsSync(path.join(root, rel))) visit(rel);
  assertCronDisabled(JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')));
  files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  validateEntries(files);
  return { version: 1, files, digest: digestFiles(files) };
}

export function compareSnapshots(before, after) {
  for (const snapshot of [before, after]) {
    if (snapshot?.version !== 1) throw Error('Unsupported snapshot version');
    validateEntries(snapshot.files);
    if (snapshot.digest !== digestFiles(snapshot.files)) throw Error('Snapshot digest mismatch');
  }
  const oldFiles = new Map(before.files.map(x => [x.path, x.sha256]));
  const newFiles = new Map(after.files.map(x => [x.path, x.sha256]));
  return {
    added: [...newFiles.keys()].filter(p => !oldFiles.has(p)).sort(),
    changed: [...newFiles.keys()].filter(p => oldFiles.has(p) && oldFiles.get(p) !== newFiles.get(p)).sort(),
    removed: [...oldFiles.keys()].filter(p => !newFiles.has(p)).sort(),
  };
}
