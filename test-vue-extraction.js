// Test Vue extraction with platform-specific cleanup
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Directory paths
const REPO_DIR = path.join(__dirname, 'aws-amplify-docs');
const SRC_PAGES = path.join(REPO_DIR, 'src', 'pages', '[platform]');

// Just process Vue platform
function processVuePlatform() {
  const platform = 'vue';
  const srcDir = SRC_PAGES;
  const outDir = path.join('extracted-docs', `gen2-docs-${platform}`);
  console.log(`\n=== Processing platform: ${platform} ===`);
  try {
    // Extract docs for this platform
    execSync(`node scripts/extract-docs.js "${srcDir}" "${outDir}" "${platform}"`, { stdio: 'inherit' });
    
    // Flatten folders for this platform
    try {
      execSync(`node scripts/flatten-single-index-folders.js "${outDir}"`, { stdio: 'inherit' });
    } catch (err) {
      console.error(`Error flattening folders for ${platform}: ${err.message}`);
    }
    
    // Add breadcrumbs for this platform
    try {
      execSync(`node scripts/add-breadcrumbs.js "${outDir}"`, { stdio: 'inherit' });
    } catch (err) {
      console.error(`Error adding breadcrumbs for ${platform}: ${err.message}`);
    }
    
    // Remove platform-specific API references that aren't relevant for this platform
    try {
      // Look for any reference directories
      const apiReferenceDirs = [];
      const findReferenceCmd = `find "${outDir}" -type d -name "reference" -o -name "api" | grep -v "node_modules"`;
      const dirs = execSync(findReferenceCmd, { stdio: 'pipe' }).toString().trim().split('\n');
      
      dirs.forEach(dir => {
        if (dir && fs.existsSync(dir)) {
          apiReferenceDirs.push(dir);
        }
      });
      
      if (apiReferenceDirs.length > 0) {
        console.log(`Found ${apiReferenceDirs.length} reference directories to clean for ${platform}...`);
        
        apiReferenceDirs.forEach(refDir => {
          if (platform === 'vue' || platform === 'react' || platform === 'angular' || 
              platform === 'javascript' || platform === 'nextjs') {
            // Web platforms shouldn't have Flutter/Swift/Android docs
            console.log(`Cleaning up mobile API references in ${refDir}...`);
            execSync(`find "${refDir}" -name "*flutter*.md" -delete`, { stdio: 'pipe' });
            execSync(`find "${refDir}" -name "*swift*.md" -delete`, { stdio: 'pipe' });
            execSync(`find "${refDir}" -name "*android*.md" -delete`, { stdio: 'pipe' });
          }
        });
      }
    } catch (err) {
      console.error(`Error cleaning up reference files for ${platform}: ${err.message}`);
    }
    
    console.log(`Output for ${platform}: ${outDir}`);
    
    // Check if any flutter files remain
    console.log(`\nChecking for remaining Flutter files in ${outDir}...`);
    const flutterFiles = execSync(`find "${outDir}" -name "*flutter*.md"`, { stdio: 'pipe' }).toString().trim();
    
    if (flutterFiles) {
      console.log("STILL FOUND FLUTTER FILES:");
      console.log(flutterFiles);
    } else {
      console.log("SUCCESS: No Flutter files remain!");
    }
    
  } catch (err) {
    console.error(`Error processing platform ${platform}: ${err.message}`);
  }
}

// Run the test
processVuePlatform();
