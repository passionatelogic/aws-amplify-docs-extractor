// scripts/flatten-single-index-folders.js
// Flattens directory structures that contain only a single index.md file
// This helps simplify the documentation structure for Gen1 docs

const fs = require('fs');
const path = require('path');

// Get the output directory from command line args
const outputDir = process.argv[2];

if (!outputDir) {
  console.error('Usage: node flatten-single-index-folders.js <output-directory>');
  process.exit(1);
}

// Function to check if a directory only contains an index.md file
function hasOnlyIndexFile(dirPath) {
  try {
    const files = fs.readdirSync(dirPath);
    return (
      files.length === 1 &&
      files[0] === 'index.md' &&
      fs.statSync(path.join(dirPath, files[0])).isFile()
    );
  } catch (err) {
    console.error(`Error reading directory ${dirPath}: ${err.message}`);
    return false;
  }
}

// Function to recursively process directories
function processDirectory(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        if (hasOnlyIndexFile(fullPath)) {
          // This directory has only an index.md file, flatten it
          const indexContent = fs.readFileSync(path.join(fullPath, 'index.md'), 'utf8');
          const parentDir = path.dirname(fullPath);
          const targetFile = path.join(parentDir, `${entry.name}.md`);
          
          console.log(`Flattening directory: ${fullPath} -> ${targetFile}`);
          
          // Write the index.md content to a new file named after the directory
          fs.writeFileSync(targetFile, indexContent);
          
          // Remove the original directory
          fs.unlinkSync(path.join(fullPath, 'index.md'));
          fs.rmdirSync(fullPath);
        } else {
          // Process subdirectories recursively
          processDirectory(fullPath);
        }
      }
    }
  } catch (err) {
    console.error(`Error processing directory ${dirPath}: ${err.message}`);
  }
}

// Start processing the output directory
console.log(`Flattening single-index folders in: ${outputDir}`);
if (fs.existsSync(outputDir)) {
  processDirectory(outputDir);
  console.log('Folder flattening completed successfully.');
} else {
  console.error(`Directory does not exist: ${outputDir}`);
  process.exit(1);
}
