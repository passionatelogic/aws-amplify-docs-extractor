/**
 * Script to generate static API reference docs for each category from amplify-js.json.
 * Usage: node scripts/extract-api-reference.js /path/to/amplify-js.json /output/root
 */

const fs = require('fs');
const path = require('path');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Dynamically identifies all category prefixes from the JSON data by:
 * 1. Looking for entries with names matching known patterns like "Auth*", "Storage*", etc.
 * 2. Looking for ServiceOptions patterns like "AnalyticsServiceOptions"
 * 3. Identifying modules that likely represent Amplify service categories
 * 
 * @param {Object} json - The parsed JSON data from amplify-js.json
 * @returns {Object} - Mapping of category names (lowercase) to their API prefixes
 */
function identifyCategoryPrefixes(json) {
  const prefixMapping = {};
  const knownCategories = [
    { category: 'auth', prefix: 'Auth' },
    { category: 'storage', prefix: 'Storage' },
    { category: 'analytics', prefix: 'Analytics' },
    { category: 'api', prefix: 'API' },
    { category: 'geo', prefix: 'Geo' },
    { category: 'inappmessaging', prefix: 'InAppMessaging' },
    { category: 'interactions', prefix: 'Interactions' },
    { category: 'logging', prefix: 'Logging' },
    { category: 'predictions', prefix: 'Predictions' },
    { category: 'pubsub', prefix: 'PubSub' },
    { category: 'restapi', prefix: 'Rest' },
    { category: 'taggingresources', prefix: 'TaggingResources' },
    { category: 'datastore', prefix: 'DataStore' },
    { category: 'notifications', prefix: 'Notifications' },
    { category: 'push', prefix: 'Push' },
    { category: 'caching', prefix: 'Cache' },
    { category: 'hub', prefix: 'Hub' }
  ];
  
  // First, add all known categories with confirmed prefix patterns
  knownCategories.forEach(({ category, prefix }) => {
    // Only add if we can find at least one entry with this prefix
    const hasEntries = Object.values(json).some(
      entry => typeof entry.name === 'string' && entry.name.startsWith(prefix)
    );
    if (hasEntries) {
      prefixMapping[category] = prefix;
    }
  });
  
  // Look for any *ServiceOptions patterns that might indicate other categories
  const serviceOptionsPattern = /^([A-Z][a-zA-Z]*)ServiceOptions$/;
  Object.values(json).forEach(entry => {
    if (typeof entry.name === 'string') {
      const matches = entry.name.match(serviceOptionsPattern);
      if (matches && matches[1]) {
        const prefix = matches[1];
        const category = prefix.toLowerCase();
        
        // Only add if not already in the mapping
        if (!Object.values(prefixMapping).includes(prefix)) {
          // Check if there are actually entries with this prefix
          const hasEntries = Object.values(json).some(
            e => typeof e.name === 'string' && e.name.startsWith(prefix) && e.name !== entry.name
          );
          if (hasEntries) {
            prefixMapping[category] = prefix;
          }
        }
      }
    }
  });
  
  console.log(`Identified ${Object.keys(prefixMapping).length} category prefixes:`, prefixMapping);
  return prefixMapping;
}

function extractCategoryEntities(json, prefix) {
  return Object.values(json).filter(
    (entry) => typeof entry.name === 'string' && entry.name.startsWith(prefix)
  );
}

function renderEntityMd(entity) {
  let md = `## ${entity.name}\n\n`;
  if (entity.comment && entity.comment.summary) {
    md += entity.comment.summary.map((s) => s.text).join(' ') + '\n\n';
  }
  if (entity.type) {
    md += '**Type:**\n';
    md += '```json\n' + JSON.stringify(entity.type, null, 2) + '\n```\n\n';
  }
  return md;
}

function main() {
  const [,, jsonPath, userOutputRoot] = process.argv;
  if (!jsonPath || !userOutputRoot) {
    console.error('Usage: node scripts/extract-api-reference.js /path/to/amplify-js.json /output/root');
    process.exit(1);
  }
  const outputRoot = path.resolve(path.join(process.cwd(), 'extracted-docs', userOutputRoot));
  const json = loadJson(jsonPath);
  
  // Dynamically identify category prefixes
  const categoryPrefixes = identifyCategoryPrefixes(json);
  
  // Generate documentation for each identified category
  for (const [category, prefix] of Object.entries(categoryPrefixes)) {
    const entities = extractCategoryEntities(json, prefix);
    if (entities.length === 0) continue;
    let md = `# ${prefix} API Reference\n\n`;
    for (const entity of entities) {
      md += renderEntityMd(entity);
    }
    const outDir = path.join(outputRoot, category);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'reference.md'), md, 'utf8');
    console.log(`Generated: ${category}/reference.md`);
  }
}

main();
