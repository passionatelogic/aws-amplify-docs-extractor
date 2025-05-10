# AWS Amplify Docs Extractor

A comprehensive, stand-alone tool to extract, process, and statically generate documentation (including API reference) for all major Amplify platforms from the official [aws-amplify/docs](https://github.com/aws-amplify/docs.git) repository.

---

## Features

- **Fully Stand-alone:**  
  No need to run from inside the Amplify docs repo. This tool will automatically fetch the latest code from the main branch of `aws-amplify/docs.git`.

- **Multi-Platform Support:**  
  Extracts and processes documentation for all Gen2 and Gen1 platforms:
  - `react`, `vue`, `angular`, `nextjs`, `react-native`, `javascript`, `android`, `swift`, `flutter`

- **Automated Processing Pipeline:**  
  For each platform, the tool:
  1. Extracts all relevant documentation (with platform-specific and shared content)
  2. Preserves general content from overview pages while generating proper navigation
  3. Adds breadcrumbs to every Markdown file for easy navigation
  4. **Generates comprehensive API reference documentation for every service category** (Auth, Storage, Analytics, API, etc.) in every platform's output

- **Complete API Reference Coverage:**
  - Automatically detects and extracts all available API categories from the Amplify source
  - Provides detailed API documentation including parameters, return types, and examples
  - Matches the structure of the original docs site with proper reference directories
  - Includes proper navigation with table of contents and links

- **Output:**  
  - All processed documentation is output to `./extracted-docs/gen2-docs-<platform>/` and `./extracted-docs/gen1-docs-<platform>/` for each platform.
  - API reference docs are generated in `build-a-backend/add-aws-services/<category>/reference/index.md` and at `build-a-backend/add-aws-services/<category>/reference.md` within each Gen2 platform directory.

---

## Quick Start

1. **Install Node.js** (if not already installed).

2. **Run the extractor:**
   ```bash
   node extract-and-format-all-docs.js
   ```
   This will:
   - Clone (or update) the latest `aws-amplify/docs` repo into `./aws-amplify-docs`
   - Extract and process documentation for all supported platforms
   - Add breadcrumbs
   - Generate comprehensive API reference docs for each category across all platforms

3. **Result:**  
   The fully processed documentation will be in the `./extracted-docs/` directory:  
   - `./extracted-docs/gen2-docs-<platform>/`
   - `./extracted-docs/gen1-docs-<platform>/`
   
   Each Gen2 platform will have API reference docs in both formats for compatibility:
   ```
   ./extracted-docs/gen2-docs-<platform>/build-a-backend/add-aws-services/<category>/reference.md
   ./extracted-docs/gen2-docs-<platform>/build-a-backend/add-aws-services/<category>/reference/index.md
   ```

---

## Script Details

- **extract-and-format-all-docs.js**  
  Orchestrates the entire workflow: fetches the latest docs, runs all processing scripts for every platform, and generates comprehensive API reference docs. Ensures proper directory structure matching the original docs site.

- **scripts/extract-docs.js**  
  Extracts platform-specific and shared content from all Amplify documentation `.mdx` files, converts them to Markdown, and outputs them to the appropriate platform directory. Handles platform-specific content filters and properly processes special components. Now preserves general (all-platform) content from overview pages while still generating proper navigation structure.

- **scripts/add-breadcrumbs.js**  
  Adds a breadcrumb trail to the top of every Markdown file, reflecting the file's full path and context within the documentation. Ensures navigation is intuitive and consistent.

- **scripts/extract-api-reference.js**  
  Extracts comprehensive API reference data from the Amplify API model JSON file:
  - Dynamically identifies all service categories from multiple sources in the JSON
  - Creates detailed API documentation with parameter info, return types, and examples
  - Generates table of contents for easy navigation
  - Ensures compatibility with both original documentation paths

---

## Advanced Usage

- **Adding or Removing Platforms**:  
  Edit the `PLATFORMS` array in `extract-and-format-all-docs.js`.

- **Running Scripts Individually**:  
  See usage information in the comments at the top of each script in the `scripts/` directory.

- **Customizing API Category Detection**:  
  Edit the `knownCategories` array in `scripts/extract-api-reference.js` to add or modify service categories.

- **Mapping between Different Category Names**:  
  Update the `categoryMapping` object in `scripts/extract-api-reference.js` to handle mappings between kebab-case and camelCase service names.

---

## How It Works

The extraction process carefully analyzes the structure of the AWS Amplify Docs repository to ensure complete coverage:

1. **Content Extraction**: Analyzes the dynamic routing structure of the Next.js app to identify all documentation pages, including special handling for platform-specific content through `<InlineFilter>` components.

2. **Structure Preservation**: Maintains the logical structure of the original documentation while optimizing for static browsing.

3. **API Reference Extraction**: Parses the comprehensive `amplify-js.json` specification file to extract detailed API references:
   - Intelligently detects all service categories
   - Handles both standard and special-case categories
   - Creates detailed documentation with proper navigation  

4. **Path Alignment**: Creates reference documentation in both formats (`<category>/reference.md` and `<category>/reference/index.md`) to ensure compatibility with all link patterns.

---

**Output:**  
A complete, static, and easily navigable documentation set for Amplify Gen2 and Gen1, for every major platform, including comprehensive API reference docs for all service categories. The output closely mirrors the structure of the original AWS Amplify documentation site while being fully static and self-contained.
