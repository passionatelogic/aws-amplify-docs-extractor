/**
 * Script to add breadcrumbs to every .md file in gen2-vue-docs/.
 * Breadcrumbs are generated from the file path and inserted above the page title.
 *
 * Usage: node scripts/add-breadcrumbs.js
 */

const fs = require('fs');
const path = require('path');

const userDocsRoot = process.argv[2];
let DOCS_ROOT;

if (!userDocsRoot) {
  DOCS_ROOT = path.join(__dirname, 'gen2-vue-docs');
} else {
  // Handle both absolute and relative paths
  if (path.isAbsolute(userDocsRoot)) {
    DOCS_ROOT = userDocsRoot;
  } else {
    DOCS_ROOT = path.resolve(path.join(process.cwd(), userDocsRoot));
  }
}

// Helper: Convert a file path to a breadcrumb array
function getBreadcrumbs(filePath) {
  const rel = path.relative(DOCS_ROOT, filePath);
  const parts = rel.split(path.sep);
  // Remove .md extension from last part
  if (parts.length > 0) {
    parts[parts.length - 1] = parts[parts.length - 1].replace(/\.md$/, '');
  }
  return parts;
}

// Helper: Generate Markdown breadcrumb string
function generateBreadcrumbMd(breadcrumbs) {
  let md = '';
  let link = '';
  for (let i = 0; i < breadcrumbs.length; i++) {
    const part = breadcrumbs[i];
    if (i === breadcrumbs.length - 1) {
      // Last part: not a link
      md += `**${part}**`;
    } else {
      link += (link ? '/' : '') + part;
      md += `[${part}](${link}.md) / `;
    }
  }
  return md;
}

// Helper: Get the page title from the file content
function getTitle(content) {
  const match = content.match(/^# (.+)$/m);
  return match ? match[1].trim() : null;
}

// Helper: Replace the title line with breadcrumb + title
function insertBreadcrumb(content, breadcrumbMd) {
  // Skip empty files
  if (!content.trim()) return content;

  // Avoid adding breadcrumbs if already present at the top
  const lines = content.split('\n').filter(line => line.trim() !== '');
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    // Heuristic: if first line is a breadcrumb (starts with "[" or "**" and contains " / " or "**...**")
    if (
      (firstLine.startsWith('[') && firstLine.includes(' / ')) ||
      (firstLine.startsWith('**') && firstLine.endsWith('**'))
    ) {
      return content;
    }
  }

  // Find the first H1 title
  const titleMatch = content.match(/^# (.+)$/m);
  if (titleMatch) {
    const titleLine = titleMatch[0];
    return content.replace(titleLine, `${breadcrumbMd}\n\n${titleLine}`);
  } else if (content.startsWith('# Overview')) {
    // For overview pages, insert above the heading
    return `${breadcrumbMd}\n\n${content}`;
  } else {
    // No title, just prepend
    return `${breadcrumbMd}\n\n${content}`;
  }
}

function main() {
  const allFiles = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.md')) allFiles.push(full);
    }
  }
  
  try {
    walk(DOCS_ROOT);
    
    let processedCount = 0;
    let skippedCount = 0;
    
    for (const file of allFiles) {
      let content = fs.readFileSync(file, 'utf8');
      const breadcrumbs = getBreadcrumbs(file);
      const breadcrumbMd = generateBreadcrumbMd(breadcrumbs);
      const newContent = insertBreadcrumb(content, breadcrumbMd);
      
      if (newContent !== content) {
        fs.writeFileSync(file, newContent, 'utf8');
        processedCount++;
      } else {
        skippedCount++;
      }
    }
    
    console.log(`Breadcrumb insertion complete: ${processedCount} files updated, ${skippedCount} files already had breadcrumbs.`);
  } catch (error) {
    console.error(`Error adding breadcrumbs: ${error.message}`);
    process.exit(1);
  }
}

main();
