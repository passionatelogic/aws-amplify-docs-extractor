// run-all.js
// Stand-alone orchestrator for extracting Gen 2 Vue docs from aws-amplify/docs.git

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

// Step 1: Clone or pull the latest aws-amplify/docs.git
function ensureLatestRepo() {
  if (!fs.existsSync(REPO_DIR)) {
    console.log('Cloning aws-amplify/docs.git...');
    execSync(`git clone --depth=1 ${REPO_URL} "${REPO_DIR}"`, { stdio: 'inherit' });
  } else {
    console.log('Pulling latest changes in aws-amplify/docs.git...');
    execSync('git fetch --all', { cwd: REPO_DIR, stdio: 'inherit' });
    execSync('git reset --hard origin/main', { cwd: REPO_DIR, stdio: 'inherit' });
  }
}

// Step 2: For each platform, run the extraction and processing pipeline
function processPlatform(platform) {
  const srcDir = SRC_PAGES;
  const outDir = path.join(__dirname, `gen2-docs-${platform}`);
  console.log(`\n=== Processing platform: ${platform} ===`);
  // Extract docs for this platform
  execSync(`node scripts/extract-docs.js "${srcDir}" "${outDir}" "${platform}"`, { stdio: 'inherit' });
  // Flatten folders for this platform
  execSync(`node scripts/flatten-single-index-folders.js "${outDir}"`, { stdio: 'inherit' });
  // Add breadcrumbs for this platform
  execSync(`node scripts/add-breadcrumbs.js "${outDir}"`, { stdio: 'inherit' });
  console.log(`Output for ${platform}: ${outDir}`);
}

function processGen1Platform(platform) {
  const srcDir = path.join(REPO_DIR, 'src', 'pages', 'gen1', '[platform]');
  const outDir = path.join(__dirname, `gen1-docs-${platform}`);
  console.log(`\n=== Processing Gen1 platform: ${platform} ===`);
  execSync(`node scripts/extract-docs.js "${srcDir}" "${outDir}" "${platform}"`, { stdio: 'inherit' });
  execSync(`node scripts/flatten-single-index-folders.js "${outDir}"`, { stdio: 'inherit' });
  execSync(`node scripts/add-breadcrumbs.js "${outDir}"`, { stdio: 'inherit' });
  console.log(`Output for gen1 ${platform}: ${outDir}`);
}

function main() {
  ensureLatestRepo();
  for (const platform of PLATFORMS) {
    processPlatform(platform);
  }
  for (const platform of PLATFORMS) {
    processGen1Platform(platform);
  }

  // Step 3: Extract static API reference docs for all Gen2 platforms
  const apiRefJson = path.join(REPO_DIR, 'src', 'directory', 'apiReferences', 'amplify-js.json');
  if (fs.existsSync(apiRefJson)) {
    for (const platform of PLATFORMS) {
      const apiRefOut = path.join(__dirname, `gen2-docs-${platform}`, 'build-a-backend', 'add-aws-services');
      if (fs.existsSync(path.join(__dirname, `gen2-docs-${platform}`))) {
        console.log(`\n=== Generating static API reference docs for ${platform} ===`);
        execSync(`node scripts/extract-api-reference.js "${apiRefJson}" "${apiRefOut}"`, { stdio: 'inherit' });
      }
    }
  } else {
    console.warn('amplify-js.json not found, skipping API reference extraction.');
  }

  console.log('\nAll done! Outputs are in ./gen2-docs-<platform>/ and ./gen1-docs-<platform>/ for each platform.');
}

main();
