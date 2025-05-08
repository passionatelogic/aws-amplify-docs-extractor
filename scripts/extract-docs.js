/**
 * FINAL MODE: Process all .mdx files recursively for full extraction.
 * Improved: Add page titles from meta.title to each Markdown file.
 */

const fs = require('fs');
const path = require('path');

const userDestRoot = process.argv[3];
if (!userDestRoot) {
  console.error('Usage: node scripts/extract-docs.js [path/to/aws-amplify/docs/src/pages/[platform]] [outputDir] [platform]');
  console.error('Error: outputDir is required.');
  process.exit(1);
}

// Fix the path issue by ensuring userDestRoot is treated as a relative path
// This avoids creating paths like extracted-docs/Users/jake/... by normalizing the path
let normalizedDestRoot = userDestRoot;
if (path.isAbsolute(userDestRoot)) {
  // If the path is absolute, extract just the relevant part after the project root directory
  const projectDir = process.cwd();
  if (userDestRoot.startsWith(projectDir)) {
    normalizedDestRoot = path.relative(projectDir, userDestRoot);
  } else {
    // If it's an absolute path that doesn't include the project directory, use the basename
    normalizedDestRoot = path.basename(userDestRoot);
  }
}

// Don't add 'extracted-docs' twice if it's already in the path
const DEST_ROOT = normalizedDestRoot.includes('extracted-docs') 
  ? path.resolve(path.join(process.cwd(), normalizedDestRoot))
  : path.resolve(path.join(process.cwd(), normalizedDestRoot));

// Allow source root to be specified as a command-line argument
const userSrcRoot = process.argv[2];
const SRC_ROOT = userSrcRoot
  ? path.resolve(userSrcRoot)
  : path.join(__dirname, 'aws-amplify-docs', 'src', 'pages', '[platform]');

// Helper: Recursively find all .mdx files under a directory
function isInPlaceholderFolder(filePath, root) {
  const rel = path.relative(root, filePath);
  const parts = rel.split(path.sep);
  // Exclude the file itself
  for (let i = 0; i < parts.length - 1; i++) {
    if (/^\[.*\]$/.test(parts[i])) return true;
  }
  return false;
}

function findMdxFiles(dir, root = dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of list) {
    const filePath = path.join(dir, file.name);
    // Skip placeholder folders like [category], [platform], etc.
    if (file.isDirectory() && !/^\[.*\]$/.test(file.name)) {
      results = results.concat(findMdxFiles(filePath, root));
    } else if (
      file.isFile() &&
      file.name.endsWith('.mdx') &&
      !isInPlaceholderFolder(filePath, root)
    ) {
      results.push(filePath);
    }
  }
  return results;
}

// Helper: Extract meta.title from the MDX file
function extractTitle(mdx) {
  // Try to find: export const meta = { ... title: 'Some Title', ... }
  const metaMatch = mdx.match(/meta\s*=\s*\{([\s\S]*?)\}/m);
  if (metaMatch) {
    const metaBlock = metaMatch[1];
    const titleMatch = metaBlock.match(/title\s*:\s*['"`]([^'"`]+)['"`]/);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
  }
  return null;
}

// Helper: Remove metadata, import/export, and function code
function cleanFrontmatterAndCode(mdx) {
  mdx = mdx.replace(/^(import|export)[^\n]*\n/gm, '');
  mdx = mdx.replace(/^[ \t]*[a-zA-Z0-9_]+\s*[:=][\s\S]*?\n\};?\n/gm, '');
  mdx = mdx.replace(/^[ \t]*export function[^\{]+\{[\s\S]*?\n\}/gm, '');
  mdx = mdx.replace(/^[ \t]*return [^\n]*\n/gm, '');
  // Remove stray leading "};" or "}" or ";" at the start of the file
  mdx = mdx.replace(/^\s*[};]+\s*\n+/g, '');
  return mdx;
}

// Helper: Remove non-Vue React/TSX code blocks
function removeNonVueReactBlocks(md) {
  return md.replace(/```tsx[\s\S]*?```/g, '');
}

function extractPlatformContent(mdx, platform) {
  mdx = cleanFrontmatterAndCode(mdx);

  let output = '';
  let pos = 0;
  const inlineFilterRegex = /<InlineFilter filters=\{(\[[^\]]+\])\}>/g;
  let match;
  let lastEnd = 0;

  while ((match = inlineFilterRegex.exec(mdx)) !== null) {
    const filtersStr = match[1];
    const filters = JSON.parse(filtersStr.replace(/'/g, '"'));
    const blockStart = match.index + match[0].length;
    const closeTag = '</InlineFilter>';
    const blockEnd = mdx.indexOf(closeTag, blockStart);
    if (blockEnd === -1) continue;

    if (lastEnd < match.index) {
      output += mdx.slice(lastEnd, match.index);
    }
    if (filters.includes(platform)) {
      output += mdx.slice(blockStart, blockEnd);
    }
    lastEnd = blockEnd + closeTag.length;
    inlineFilterRegex.lastIndex = lastEnd;
  }
  if (lastEnd < mdx.length) {
    output += mdx.slice(lastEnd);
  }
  output = output.replace(/<InlineFilter filters=\{[^\}]+\}>[\s\S]*?<\/InlineFilter>/g, '');
  output = output.replace(/<[\w\d]+[^>]*\/>/g, '');
  output = output.trim();
  output = removeNonVueReactBlocks(output);
  output = output.replace(/^\s*\n/gm, '');
  // Remove any remaining leading "};" or "}" or ";" at the start
  output = output.replace(/^(};|};|}|;)+\s*/g, '');
  return output;
}

// Helper: Check if file is an overview file (contains only <Overview ... />)
function isOverviewFile(mdx) {
  const cleaned = mdx.replace(/\/\/.*$/gm, '').replace(/\s+/g, '');
  return cleaned.includes('<OverviewchildPageNodes={props.childPageNodes}/>') ||
         cleaned.match(/^<Overview[\s\S]*\/>$/m);
}

// Helper: Generate Markdown TOC for a directory
function generateMarkdownTOC(srcDir, destDir) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  let toc = '# Overview\n\n';
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const indexMdx = path.join(srcDir, entry.name, 'index.mdx');
      if (fs.existsSync(indexMdx)) {
        toc += `- [${entry.name}](./${entry.name}/index.md)\n`;
      }
    } else if (entry.isFile() && entry.name.endsWith('.mdx') && entry.name !== 'index.mdx') {
      const base = entry.name.replace(/\.mdx$/, '');
      toc += `- [${base}](./${base}.md)\n`;
    }
  }
  return toc;
}

function writeOutputFile(srcFile, content, extractedCount) {
  const relPath = path.relative(SRC_ROOT, srcFile).replace(/\.mdx$/, '.md');
  const destPath = path.join(DEST_ROOT, relPath);
  const destDir = path.dirname(destPath);
  
  // Skip creating files with no actual content (just a title)
  const contentWithoutTitle = content.replace(/^# .*$/m, '').trim();
  if (!contentWithoutTitle) {
    console.log(`Skipping empty content: ${relPath}`);
    return false;
  }
  
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(destPath, content, 'utf8');
  // No longer log each extracted file
  return true;
}

function main() {
  const platform = process.argv[4] || 'vue';
  if (!fs.existsSync(SRC_ROOT)) {
    console.error('Source directory not found:', SRC_ROOT);
    console.error('Usage: node scripts/extract-docs.js [path/to/aws-amplify/docs/src/pages/[platform]] [outputDir] [platform]');
    process.exit(1);
  }
  const mdxFiles = findMdxFiles(SRC_ROOT);
  let extractedCount = 0;
  for (const file of mdxFiles) {
    const mdx = fs.readFileSync(file, 'utf8');
    if (isOverviewFile(mdx)) {
      const srcDir = path.dirname(file);
      const destDir = path.dirname(path.join(DEST_ROOT, path.relative(SRC_ROOT, file)));
      const toc = generateMarkdownTOC(srcDir, destDir);
      if (writeOutputFile(file, toc, extractedCount)) {
        extractedCount++;
      }
    } else {
      const title = extractTitle(mdx);
      const content = extractPlatformContent(mdx, platform);
      
      // If content is empty but we have a title, add a note about platform compatibility
      let finalContent;
      if (!content.trim() && title) {
        finalContent = `# ${title}\n\n> This content is not available for the ${platform} platform.`;
        console.log(`Empty content for ${path.relative(SRC_ROOT, file)}, adding platform notice.`);
      } else {
        finalContent = title ? `# ${title}\n\n${content}` : content;
      }
      
      if (writeOutputFile(file, finalContent, extractedCount)) {
        extractedCount++;
      }
    }
  }
  console.log(`Extraction complete: ${extractedCount} files extracted.`);
}

main();
