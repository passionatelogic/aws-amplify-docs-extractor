// extract-and-format-all-docs.js
// Stand-alone orchestrator for extracting Gen 2 docs from aws-amplify/docs.git
// Improved to preserve general content in overview pages

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const REPO_URL = 'https://github.com/aws-amplify/docs.git';
const REPO_DIR = path.join(__dirname, 'aws-amplify-docs');
const SRC_PAGES = path.join(REPO_DIR, 'src', 'pages', '[platform]');

// List of platforms to extract (from InlineFilter usage and common Gen2 platforms)
const PLATFORMS = [
  'react',
  'vue',
  'angular',
  'nextjs',
  'react-native',
  'javascript',
  'android',
  'swift',
  'flutter'
];

// Stats for overall processing
const stats = {
  gen2: { processed: 0, errors: 0 },
  gen1: { processed: 0, errors: 0 },
  apiRefs: { processed: 0, errors: 0 },
};

// Step 1: Clone or pull the latest aws-amplify/docs.git
function ensureLatestRepo() {
  try {
    if (!fs.existsSync(REPO_DIR)) {
      console.log('Cloning aws-amplify/docs.git repository...');
      execSync(`git clone --depth=1 ${REPO_URL} "${REPO_DIR}"`, { stdio: ['ignore', 'ignore', 'pipe'] });
    } else {
      console.log('Pulling latest changes from aws-amplify/docs.git...');
      execSync('git fetch --all', { cwd: REPO_DIR, stdio: ['ignore', 'ignore', 'pipe'] });
      execSync('git reset --hard origin/main', { cwd: REPO_DIR, stdio: ['ignore', 'ignore', 'pipe'] });
    }
    return true;
  } catch (err) {
    console.error(`Error accessing repository: ${err.message}`);
    return false;
  }
}

// Step 2: For each platform, run the extraction and processing pipeline
function processPlatform(platform) {
  const srcDir = SRC_PAGES;
  const outDir = path.join('extracted-docs', `gen2-docs-${platform}`);
  
  try {
    // Extract docs for this platform
    execSync(`node scripts/extract-docs.js "${srcDir}" "${outDir}" "${platform}"`, { stdio: ['ignore', 'pipe', 'pipe'] });
    
    // Add breadcrumbs for this platform
    try {
      execSync(`node scripts/add-breadcrumbs.js "${outDir}"`, { stdio: ['ignore', 'pipe', 'pipe'] });
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
        for (const refDir of apiReferenceDirs) {
          if (platform === 'vue' || platform === 'react' || platform === 'angular' || 
              platform === 'javascript' || platform === 'nextjs') {
            // Web platforms shouldn't have Flutter/Swift/Android docs
            execSync(`find "${refDir}" -name "*flutter*.md" -delete`, { stdio: 'pipe' });
            execSync(`find "${refDir}" -name "*swift*.md" -delete`, { stdio: 'pipe' });
            execSync(`find "${refDir}" -name "*android*.md" -delete`, { stdio: 'pipe' });
          } else if (platform === 'flutter') {
            // Flutter shouldn't have web-specific or other mobile platform docs
            execSync(`find "${refDir}" -name "*react*.md" -delete`, { stdio: 'pipe' });
            execSync(`find "${refDir}" -name "*vue*.md" -delete`, { stdio: 'pipe' });
            execSync(`find "${refDir}" -name "*angular*.md" -delete`, { stdio: 'pipe' });
            execSync(`find "${refDir}" -name "*javascript*.md" -delete`, { stdio: 'pipe' });
            execSync(`find "${refDir}" -name "*swift*.md" -delete`, { stdio: 'pipe' });
            execSync(`find "${refDir}" -name "*android*.md" -delete`, { stdio: 'pipe' });
          } else if (platform === 'swift' || platform === 'ios') {
            // iOS platforms shouldn't have Android/Flutter/web-specific docs
            execSync(`find "${refDir}" -name "*flutter*.md" -delete`, { stdio: 'pipe' });
            execSync(`find "${refDir}" -name "*android*.md" -delete`, { stdio: 'pipe' });
            execSync(`find "${refDir}" -name "*react*.md" -delete`, { stdio: 'pipe' });
            execSync(`find "${refDir}" -name "*vue*.md" -delete`, { stdio: 'pipe' });
            execSync(`find "${refDir}" -name "*angular*.md" -delete`, { stdio: 'pipe' });
            execSync(`find "${refDir}" -name "*javascript*.md" -delete`, { stdio: 'pipe' });
          } else if (platform === 'android') {
            // Android shouldn't have iOS/Flutter/web-specific docs
            execSync(`find "${refDir}" -name "*flutter*.md" -delete`, { stdio: 'pipe' });
            execSync(`find "${refDir}" -name "*swift*.md" -delete`, { stdio: 'pipe' });
            execSync(`find "${refDir}" -name "*react*.md" -delete`, { stdio: 'pipe' });
            execSync(`find "${refDir}" -name "*vue*.md" -delete`, { stdio: 'pipe' });
            execSync(`find "${refDir}" -name "*angular*.md" -delete`, { stdio: 'pipe' });
            execSync(`find "${refDir}" -name "*javascript*.md" -delete`, { stdio: 'pipe' });
          }
        }
      }
    } catch (err) {
      console.error(`Error cleaning up reference files for ${platform}: ${err.message}`);
    }
    
    stats.gen2.processed++;
  } catch (err) {
    console.error(`Error processing platform ${platform}: ${err.message}`);
    stats.gen2.errors++;
  }
}

function processGen1Platform(platform) {
  const srcDir = path.join(REPO_DIR, 'src', 'pages', 'gen1', '[platform]');
  const outDir = path.join('extracted-docs', `gen1-docs-${platform}`);
  
  try {
    // Extract docs for this platform
    execSync(`node scripts/extract-docs.js "${srcDir}" "${outDir}" "${platform}"`, { stdio: ['ignore', 'pipe', 'pipe'] });
    
    // Flatten folders for this platform
    try {
      execSync(`node scripts/flatten-single-index-folders.js "${outDir}"`, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      console.error(`Error flattening folders for gen1 ${platform}: ${err.message}`);
    }
    
    // Add breadcrumbs for this platform
    try {
      execSync(`node scripts/add-breadcrumbs.js "${outDir}"`, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      console.error(`Error adding breadcrumbs for gen1 ${platform}: ${err.message}`);
    }
    
    // Remove platform-specific references that aren't relevant
    try {
      const referenceDir = path.join(outDir, 'reference');
      if (fs.existsSync(referenceDir)) {
        if (platform === 'vue' || platform === 'react' || platform === 'angular' || 
            platform === 'javascript' || platform === 'nextjs') {
          // Web platforms shouldn't have Flutter/Swift/Android docs
          execSync(`find "${referenceDir}" -name "*flutter*.md" -delete`, { stdio: 'pipe' });
          execSync(`find "${referenceDir}" -name "*swift*.md" -delete`, { stdio: 'pipe' });
          execSync(`find "${referenceDir}" -name "*android*.md" -delete`, { stdio: 'pipe' });
        } else if (platform === 'flutter') {
          // Flutter shouldn't have web-specific or other mobile platform docs
          execSync(`find "${referenceDir}" -name "*react*.md" -delete`, { stdio: 'pipe' });
          execSync(`find "${referenceDir}" -name "*vue*.md" -delete`, { stdio: 'pipe' });
          execSync(`find "${referenceDir}" -name "*angular*.md" -delete`, { stdio: 'pipe' });
          execSync(`find "${referenceDir}" -name "*javascript*.md" -delete`, { stdio: 'pipe' });
          execSync(`find "${referenceDir}" -name "*swift*.md" -delete`, { stdio: 'pipe' });
          execSync(`find "${referenceDir}" -name "*android*.md" -delete`, { stdio: 'pipe' });
        } else if (platform === 'swift' || platform === 'ios') {
          // iOS platforms shouldn't have Android/Flutter/web-specific docs
          execSync(`find "${referenceDir}" -name "*flutter*.md" -delete`, { stdio: 'pipe' });
          execSync(`find "${referenceDir}" -name "*android*.md" -delete`, { stdio: 'pipe' });
          execSync(`find "${referenceDir}" -name "*react*.md" -delete`, { stdio: 'pipe' });
          execSync(`find "${referenceDir}" -name "*vue*.md" -delete`, { stdio: 'pipe' });
          execSync(`find "${referenceDir}" -name "*angular*.md" -delete`, { stdio: 'pipe' });
          execSync(`find "${referenceDir}" -name "*javascript*.md" -delete`, { stdio: 'pipe' });
        } else if (platform === 'android') {
          // Android shouldn't have iOS/Flutter/web-specific docs
          execSync(`find "${referenceDir}" -name "*flutter*.md" -delete`, { stdio: 'pipe' });
          execSync(`find "${referenceDir}" -name "*swift*.md" -delete`, { stdio: 'pipe' });
          execSync(`find "${referenceDir}" -name "*react*.md" -delete`, { stdio: 'pipe' });
          execSync(`find "${referenceDir}" -name "*vue*.md" -delete`, { stdio: 'pipe' });
          execSync(`find "${referenceDir}" -name "*angular*.md" -delete`, { stdio: 'pipe' });
          execSync(`find "${referenceDir}" -name "*javascript*.md" -delete`, { stdio: 'pipe' });
        }
      }
    } catch (err) {
      console.error(`Error cleaning up reference files for gen1 ${platform}: ${err.message}`);
    }
    
    stats.gen1.processed++;
  } catch (err) {
    console.error(`Error processing gen1 platform ${platform}: ${err.message}`);
    stats.gen1.errors++;
  }
}

function generateApiReferences() {
  // Step 3: Extract static API reference docs for all Gen2 platforms
  const apiRefJson = path.join(REPO_DIR, 'src', 'directory', 'apiReferences', 'amplify-js.json');
  if (fs.existsSync(apiRefJson)) {
    for (const platform of PLATFORMS) {
      const apiRefOut = path.join('extracted-docs', `gen2-docs-${platform}`, 'build-a-backend', 'add-aws-services');
      if (fs.existsSync(path.join('extracted-docs', `gen2-docs-${platform}`))) {
        try {
          execSync(`node scripts/extract-api-reference.js "${apiRefJson}" "${apiRefOut}"`, { stdio: ['ignore', 'pipe', 'pipe'] });
          
          // Check if "reference" directories exist in category folders
          const categoriesDir = path.join('extracted-docs', `gen2-docs-${platform}`, 'build-a-backend', 'add-aws-services');
          if (fs.existsSync(categoriesDir)) {
            // Create [category]/reference directories where needed
            const categories = fs.readdirSync(categoriesDir, { withFileTypes: true })
              .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
              .map(dirent => dirent.name);
              
            for (const category of categories) {
              const referenceDir = path.join(categoriesDir, category, 'reference');
              const referenceMdPath = path.join(categoriesDir, category, 'reference.md');
              
              // If a category has a reference.md file but no reference directory, create it
              if (fs.existsSync(referenceMdPath) && !fs.existsSync(referenceDir)) {
                fs.mkdirSync(referenceDir, { recursive: true });
                fs.writeFileSync(
                  path.join(referenceDir, 'index.md'),
                  fs.readFileSync(referenceMdPath, 'utf8')
                );
              }
            }
          }
          stats.apiRefs.processed++;
        } catch (err) {
          console.error(`Error generating API reference docs for ${platform}: ${err.message}`);
          stats.apiRefs.errors++;
        }
      }
    }
  } else {
    console.warn('amplify-js.json not found, skipping API reference extraction.');
  }
}

function createHtmlIndexes() {
  // Step 4: Create index.html files from README.md files in all platform directories
  try {
    execSync('node scripts/create-html-indexes.js', { stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch (err) {
    console.error(`Error creating HTML index files: ${err.message}`);
    return false;
  }
}

function main() {
  console.log('Starting AWS Amplify documentation extraction process...');
  
  if (!ensureLatestRepo()) {
    console.error('Failed to access repository. Aborting process.');
    return;
  }
  
  console.log(`Processing ${PLATFORMS.length} Gen2 platforms...`);
  for (const platform of PLATFORMS) {
    processPlatform(platform);
  }
  
  console.log(`Processing ${PLATFORMS.length} Gen1 platforms...`);
  for (const platform of PLATFORMS) {
    processGen1Platform(platform);
  }

  console.log('Generating API references...');
  generateApiReferences();

  console.log('Creating HTML indexes...');
  const indexesCreated = createHtmlIndexes();
  
  // Print summary
  console.log('\nExtraction Summary:');
  console.log(`- Gen2 Platforms: ${stats.gen2.processed} processed${stats.gen2.errors > 0 ? `, ${stats.gen2.errors} errors` : ''}`);
  console.log(`- Gen1 Platforms: ${stats.gen1.processed} processed${stats.gen1.errors > 0 ? `, ${stats.gen1.errors} errors` : ''}`);
  console.log(`- API References: ${stats.apiRefs.processed} processed${stats.apiRefs.errors > 0 ? `, ${stats.apiRefs.errors} errors` : ''}`);
  console.log(`- HTML Indexes: ${indexesCreated ? 'Created successfully' : 'Creation failed'}`);
  
  console.log('\nOutputs are in:');
  console.log('- ./extracted-docs/gen2-docs-<platform>/ for each Gen2 platform');
  console.log('- ./extracted-docs/gen1-docs-<platform>/ for each Gen1 platform');
}

main();
