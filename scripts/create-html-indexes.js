/**
 * Script to create index.html files from README.md files in all platform directories.
 * This helps provide default content when an agent browses the root folder.
 *
 * Usage: node scripts/create-html-indexes.js [path/to/extracted-docs]
 */

const fs = require('fs');
const path = require('path');

// Get base directory from command-line argument or use default
const userDocsRoot = process.argv[2];
let DOCS_ROOT;

if (!userDocsRoot) {
  DOCS_ROOT = path.join(process.cwd(), 'extracted-docs');
} else {
  // Handle both absolute and relative paths
  if (path.isAbsolute(userDocsRoot)) {
    DOCS_ROOT = userDocsRoot;
  } else {
    DOCS_ROOT = path.resolve(path.join(process.cwd(), userDocsRoot));
  }
}

// Helper function to convert Markdown to simple HTML
function markdownToHtml(markdown) {
  // First, create the HTML header (without paragraph tags)
  const htmlHeader = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AWS Amplify Documentation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    h1 {
      border-bottom: 1px solid #eaecef;
      padding-bottom: 0.3em;
    }
    a {
      color: #0366d6;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    code {
      font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
      background-color: rgba(27, 31, 35, 0.05);
      border-radius: 3px;
      padding: 0.2em 0.4em;
      font-size: 85%;
    }
    pre {
      background-color: #f6f8fa;
      border-radius: 3px;
      padding: 16px;
      overflow: auto;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    blockquote {
      margin: 0;
      padding: 0 1em;
      color: #6a737d;
      border-left: 0.25em solid #dfe2e5;
    }
    .tree {
      font-family: monospace;
      white-space: pre;
    }
  </style>
</head>
<body>
`;

  // Pre-process the markdown
  let content = markdown.trim();
  
  // Process bold text as headings when they appear to be section titles (on their own line)
  content = content.replace(/^\*\*([^*]+)\*\*$/gm, '<h2>$1</h2>');
  
  // Process standard headings
  content = content.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  content = content.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  content = content.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  content = content.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  content = content.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
  content = content.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
  
  // Process inline bold/italic formatting
  content = content.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Process links
  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Process code blocks with language specification
  content = content.replace(/```([a-zA-Z0-9]+)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
  
  // Process code blocks without language specification
  content = content.replace(/```\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Process inline code
  content = content.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Store HTML elements to prevent further processing
  const htmlElements = [];
  content = content.replace(/(<[^>]+>[\s\S]*?<\/[^>]+>)/g, (match) => {
    const placeholder = `__HTML_ELEMENT_${htmlElements.length}__`;
    htmlElements.push(match);
    return placeholder;
  });
  
  // Process unordered lists - handle each list separately
  let listMatches = content.match(/(?:^- (.+)$\n?)+/gm);
  if (listMatches) {
    listMatches.forEach(listMatch => {
      const listItems = listMatch.split(/\n/).filter(line => line.trim());
      const processedList = '<ul>\n' + listItems.map(item => {
        return `  <li>${item.replace(/^- /, '')}</li>`;
      }).join('\n') + '\n</ul>';
      content = content.replace(listMatch, processedList);
    });
  }
  
  // Process ordered lists - handle each list separately
  listMatches = content.match(/(?:^\d+\. (.+)$\n?)+/gm);
  if (listMatches) {
    listMatches.forEach(listMatch => {
      const listItems = listMatch.split(/\n/).filter(line => line.trim());
      const processedList = '<ol>\n' + listItems.map(item => {
        return `  <li>${item.replace(/^\d+\. /, '')}</li>`;
      }).join('\n') + '\n</ol>';
      content = content.replace(listMatch, processedList);
    });
  }

  // Process blockquotes - handle multiline blockquotes
  const blockquotes = [];
  content = content.replace(/(?:^> (.+)$\n?)+/gm, (match) => {
    const placeholder = `__BLOCKQUOTE_${blockquotes.length}__`;
    const lines = match.split(/\n/).filter(line => line.trim());
    const blockquoteContent = lines.map(line => line.replace(/^> /, '')).join(' ');
    blockquotes.push(`<blockquote>${blockquoteContent}</blockquote>`);
    return placeholder;
  });
  
  // Restore blockquotes
  blockquotes.forEach((blockquote, index) => {
    content = content.replace(`__BLOCKQUOTE_${index}__`, blockquote);
  });
  
  // Handle only actual directory tree structures - preserve monospace formatting
  content = content.replace(/^([│├└─].+|[ \t]+[│├└─].+)$/gm, '<div class="tree">$1</div>');

  // Process horizontal rules
  content = content.replace(/^---$/gm, '<hr>');
  
  // Process paragraphs (lines that are not part of other elements)
  // Treat consecutive lines as a single paragraph
  const paragraphs = [];
  content = content.replace(/(?:^[^<\n][^<]*$\n?)+/gm, (match) => {
    if (match.trim()) {
      const placeholder = `__PARAGRAPH_${paragraphs.length}__`;
      paragraphs.push(`<p>${match.replace(/\n/g, ' ').trim()}</p>`);
      return placeholder;
    }
    return match;
  });
  
  // Restore paragraphs
  paragraphs.forEach((paragraph, index) => {
    content = content.replace(`__PARAGRAPH_${index}__`, paragraph);
  });
  
  // Restore HTML elements
  htmlElements.forEach((element, index) => {
    content = content.replace(`__HTML_ELEMENT_${index}__`, element);
  });
  
  // Add proper spacing between elements
  content = content.replace(/(<\/[^>]+>)(<[^\/])/g, '$1\n$2');
  
  // Combine the HTML header with processed content and add closing tags
  return htmlHeader + content + '\n</body>\n</html>';
}

// Finds all README.md files and creates corresponding index.html files
function processDirectory(directory, stats) {
  try {
    // List all items in the directory
    const items = fs.readdirSync(directory, { withFileTypes: true });
    
    // Process README.md file if it exists in this directory
    const readmeFile = items.find(item => item.isFile() && item.name === 'README.md');
    if (readmeFile) {
      const readmePath = path.join(directory, 'README.md');
      const indexHtmlPath = path.join(directory, 'index.html');
      
      // Read README.md content
      const markdownContent = fs.readFileSync(readmePath, 'utf8');
      
      // Convert to HTML
      const htmlContent = markdownToHtml(markdownContent);
      
      // Write index.html file
      fs.writeFileSync(indexHtmlPath, htmlContent, 'utf8');
      stats.processedFiles++;
    }
    
    // Recursively process subdirectories
    for (const item of items) {
      if (item.isDirectory()) {
        processDirectory(path.join(directory, item.name), stats);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${directory}:`, error);
    stats.errors++;
  }
}

// Main function
function main() {
  // Get all platform directories in the extracted-docs folder
  try {
    const extractedDirs = fs.readdirSync(DOCS_ROOT, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => path.join(DOCS_ROOT, dirent.name));
    
    if (extractedDirs.length === 0) {
      console.log('No platform directories found in', DOCS_ROOT);
      return;
    }
    
    // Initialize statistics
    const stats = {
      processedDirs: 0,
      processedFiles: 0,
      errors: 0
    };
    
    // Process each platform directory
    for (const dir of extractedDirs) {
      processDirectory(dir, stats);
      stats.processedDirs++;
    }
    
    console.log(`HTML index creation complete: ${stats.processedFiles} index.html files created in ${stats.processedDirs} platform directories${stats.errors > 0 ? `, with ${stats.errors} errors` : ''}.`);
  } catch (error) {
    console.error('Error accessing extracted docs directory:', error);
  }
}

main();
