/**
 * Script to flatten folders in gen2-vue-docs/ that contain only a single index.md file and no subfolders.
 * Moves index.md up one level as folder.md, removes the empty folder, and updates links in all .md files.
 *
 * Usage: node scripts/flatten-single-index-folders.js
 */

const fs = require('fs');
const path = require('path');

const userDocsRoot = process.argv[2];
const DOCS_ROOT = userDocsRoot
  ? path.resolve(path.join(process.cwd(), 'extracted-docs', userDocsRoot))
  : path.join(__dirname, 'gen2-vue-docs');

// Helper: Recursively find all folders with only index.md and no subfolders
function findSingleIndexFolders(dir) {
  let toFlatten = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subdir = path.join(dir, entry.name);
      const subentries = fs.readdirSync(subdir, { withFileTypes: true });
      const hasOnlyIndex =
        subentries.length === 1 &&
        subentries[0].isFile() &&
        subentries[0].name === 'index.md';
      const hasNoSubfolders = subentries.every(e => !e.isDirectory());
      if (hasOnlyIndex && hasNoSubfolders) {
        toFlatten.push(subdir);
      } else {
        toFlatten = toFlatten.concat(findSingleIndexFolders(subdir));
      }
    }
  }
  return toFlatten;
}

// Helper: Update all links in .md files in docsRoot
function updateLinks(docsRoot, oldRel, newRel) {
  const allFiles = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.md')) allFiles.push(full);
    }
  }
  walk(docsRoot);
  for (const file of allFiles) {
    let content = fs.readFileSync(file, 'utf8');
    // Replace all links to oldRel with newRel
    const regex = new RegExp(`\\]\\(${oldRel.replace(/\//g, '\\/')}\\)`, 'g');
    content = content.replace(regex, `](${newRel})`);
    fs.writeFileSync(file, content, 'utf8');
  }
}

function main() {
  const toFlatten = findSingleIndexFolders(DOCS_ROOT);
  for (const folder of toFlatten) {
    const parent = path.dirname(folder);
    const folderName = path.basename(folder);
    const oldPath = path.join(folder, 'index.md');
    const newPath = path.join(parent, `${folderName}.md`);
    // Move index.md up and rename
    fs.renameSync(oldPath, newPath);
    // Remove the now-empty folder
    fs.rmdirSync(folder);
    // Update links in all .md files
    const oldRel = path.relative(DOCS_ROOT, path.join(folderName, 'index.md'));
    const newRel = path.relative(DOCS_ROOT, `${folderName}.md`);
    updateLinks(DOCS_ROOT, oldRel, newRel);
    console.log(`Flattened: ${folderName}/index.md -> ${folderName}.md`);
  }
  console.log('Flattening complete.');
}

main();
