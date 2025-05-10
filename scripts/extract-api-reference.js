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
 * 3. Looking for category-specific references in the "categories" array
 * 4. Identifying modules that likely represent Amplify service categories
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
    { category: 'rest-api', prefix: 'Rest' }, // Different kebab case version used in docs
    { category: 'taggingresources', prefix: 'TaggingResources' },
    { category: 'tagging-resources', prefix: 'TaggingResources' }, // Different kebab case version used in docs
    { category: 'datastore', prefix: 'DataStore' },
    { category: 'notifications', prefix: 'Notifications' },
    { category: 'push', prefix: 'Push' },
    { category: 'caching', prefix: 'Cache' },
    { category: 'hub', prefix: 'Hub' },
    { category: 'pinpoint', prefix: 'Pinpoint' }
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
  
  // Check "categories" array in the JSON if it exists
  if (json.categories && Array.isArray(json.categories)) {
    json.categories.forEach(category => {
      if (category.name && typeof category.name === 'string') {
        const catName = category.name.toLowerCase();
        
        // Find matching prefix in knownCategories
        const knownCat = knownCategories.find(kc => kc.category === catName);
        if (knownCat && !prefixMapping[catName]) {
          // Verify we have entries for this prefix
          const hasEntries = Object.values(json).some(
            entry => typeof entry.name === 'string' && entry.name.startsWith(knownCat.prefix)
          );
          if (hasEntries) {
            prefixMapping[catName] = knownCat.prefix;
          }
        }
      }
    });
  }
  
  console.log(`Identified ${Object.keys(prefixMapping).length} category prefixes:`, prefixMapping);
  return prefixMapping;
}

function extractCategoryEntities(json, prefix) {
  // Get all entities that start with the prefix (both types and methods)
  return Object.values(json).filter(
    (entry) => typeof entry.name === 'string' && entry.name.startsWith(prefix)
  );
}

// Extract API methods specifically (functions rather than types/interfaces)
function extractCategoryMethods(json, prefix) {
  return Object.values(json).filter(
    (entry) => typeof entry.name === 'string' && 
              entry.name.startsWith(prefix) && 
              entry.signatures && 
              entry.signatures.length > 0
  );
}

function renderEntityMd(entity) {
  let md = `## ${entity.name}\n\n`;
  if (entity.comment && entity.comment.summary) {
    md += entity.comment.summary.map((s) => s.text).join(' ') + '\n\n';
  }
  
  // Add details about parameters if they exist
  if (entity.parameters && entity.parameters.length > 0) {
    md += '### Parameters\n\n';
    entity.parameters.forEach(param => {
      md += `- **${param.name}**`;
      if (param.type) {
        md += `: ${JSON.stringify(param.type)}`;
      }
      if (param.comment && param.comment.summary) {
        md += ` - ${param.comment.summary.map(s => s.text).join(' ')}`;
      }
      md += '\n';
    });
    md += '\n';
  }
  
  // Add return type information
  if (entity.type) {
    md += '### Returns\n\n';
    md += '```json\n' + JSON.stringify(entity.type, null, 2) + '\n```\n\n';
  }
  
  // Add example if available
  if (entity.comment && entity.comment.blockTags) {
    const examples = entity.comment.blockTags.filter(tag => tag.tag === '@example');
    if (examples.length > 0) {
      md += '### Example\n\n';
      examples.forEach(example => {
        if (example.content) {
          md += '```javascript\n' + example.content.map(c => c.text).join('\n') + '\n```\n\n';
        }
      });
    }
  }
  
  return md;
}

function renderMethodMd(method) {
  let md = `# ${method.name}\n\n`;
  
  // Add method description from JSDoc summary
  if (method.comment && method.comment.summary) {
    md += method.comment.summary.map((s) => s.text).join(' ') + '\n\n';
  }
  
  // Process each method signature
  if (method.signatures && method.signatures.length > 0) {
    const signature = method.signatures[0]; // Use the first signature
    
    // Add parameters section
    if (signature.parameters && signature.parameters.length > 0) {
      md += '## Parameters\n\n';
      signature.parameters.forEach(param => {
        md += `- **${param.name}**`;
        if (param.type) {
          md += `: ${JSON.stringify(param.type)}`;
        }
        if (param.comment && param.comment.summary) {
          md += ` - ${param.comment.summary.map(s => s.text).join(' ')}`;
        }
        md += '\n';
      });
      md += '\n';
    }
    
    // Add throws section if available
    if (signature.comment && signature.comment.blockTags) {
      const throwsTags = signature.comment.blockTags.filter(tag => tag.tag === '@throws');
      if (throwsTags.length > 0) {
        md += '## Throws\n\n';
        throwsTags.forEach(throwsTag => {
          if (throwsTag.content) {
            const content = throwsTag.content.map(c => c.text).join(' ');
            const match = content.match(/^(\w+)\s*(.*)$/);
            if (match) {
              md += `- **${match[1]}**`;
              if (match[2]) {
                md += `: ${match[2]}`;
              }
            } else {
              md += `- ${content}`;
            }
            md += '\n';
          }
        });
        md += '\n';
      }
    }
    
    // Add return type information
    if (signature.type) {
      md += '## Returns\n\n';
      md += '```json\n' + JSON.stringify(signature.type, null, 2) + '\n```\n\n';
    }
    
    // Add example if available
    if (signature.comment && signature.comment.blockTags) {
      const examples = signature.comment.blockTags.filter(tag => tag.tag === '@example');
      if (examples.length > 0) {
        md += '## Example\n\n';
        examples.forEach(example => {
          if (example.content) {
            md += '```javascript\n' + example.content.map(c => c.text).join('\n') + '\n```\n\n';
          }
        });
      }
    }
  }
  
  return md;
}

function main() {
  const [,, jsonPath, userOutputRoot] = process.argv;
  if (!jsonPath || !userOutputRoot) {
    console.error('Usage: node scripts/extract-api-reference.js /path/to/amplify-js.json /output/root');
    process.exit(1);
  }

  // Handle both absolute and relative paths for the output root
  let outputRoot;
  if (path.isAbsolute(userOutputRoot)) {
    outputRoot = userOutputRoot;
  } else {
    outputRoot = path.resolve(path.join(process.cwd(), userOutputRoot));
  }

  console.log('Using API reference output root:', outputRoot);
  const json = loadJson(jsonPath);
  
  // Dynamically identify category prefixes
  const categoryPrefixes = identifyCategoryPrefixes(json);
  
  // Generate documentation for each identified category
  // Map from original docs categories to normalized names
  const categoryMapping = {
    'rest-api': 'api',     // Map kebab-case to our naming convention
    'tagging-resources': 'taggingresources'
  };
  
  for (const [category, prefix] of Object.entries(categoryPrefixes)) {
    const entities = extractCategoryEntities(json, prefix);
    if (entities.length === 0) continue;
    
    // Extract methods separately to create method-specific documentation
    const methods = extractCategoryMethods(json, prefix);
    const types = entities.filter(entity => !methods.includes(entity));
    
    // Create a more structured API reference with table of contents
    let md = `# ${prefix} API Reference\n\n`;
    
    // First list API methods in TOC if they exist
    if (methods.length > 0) {
      md += '## API Methods\n\n';
      methods.forEach(method => {
        md += `- [${method.name}](#${method.name.toLowerCase()})\n`;
      });
      md += '\n';
    }
    
    // Then list data types in TOC
    md += '## Table of Contents\n\n';
    types.forEach(entity => {
      md += `- [${entity.name}](#${entity.name.toLowerCase()})\n`;
    });
    md += '\n';
    
    // Add details for each method first with more detailed documentation
    if (methods.length > 0) {
      for (const method of methods) {
        md += renderMethodMd(method);
      }
    }
    
    // Add details for each type entity
    for (const entity of types) {
      md += renderEntityMd(entity);
    }
    
    // Determine the appropriate output directory, taking into account 
    // the original docs category structure
    let mappedCategory = categoryMapping[category] || category;
    const outDir = path.join(outputRoot, mappedCategory);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'reference.md'), md, 'utf8');
    
    // Also create a reference directory with an index.md file (as required by the docs structure)
    const refDir = path.join(outDir, 'reference');
    fs.mkdirSync(refDir, { recursive: true });
    fs.writeFileSync(path.join(refDir, 'index.md'), md, 'utf8');
    
    console.log(`Generated: ${mappedCategory}/reference.md and ${mappedCategory}/reference/index.md`);
  }
}

main();
