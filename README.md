# aws-amplify-docs-extractor

A stand-alone tool to extract, process, and statically generate documentation (including API reference) for all major Amplify platforms from the official [aws-amplify/docs](https://github.com/aws-amplify/docs.git) repository.

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
  2. Flattens single-index folders for a clean structure
  3. Adds breadcrumbs to every Markdown file for easy navigation
  4. **Generates static API reference documentation for each major category** (e.g., Auth, Storage, Analytics, etc.) in every platform's output

- **Output:**  
  - All processed documentation is output to `./gen2-docs-<platform>/` and `./gen1-docs-<platform>/` for each platform.
  - API reference docs are generated in `build-a-backend/add-aws-services/<category>/reference.md` within each Gen2 platform directory.

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
   - Flatten folder structures and add breadcrumbs
   - Generate static API reference docs for each category and platform

3. **Result:**  
   The fully processed documentation will be in the `gen2-docs-<platform>/` and `gen1-docs-<platform>/` directories.  
   For example:
   - `gen2-docs-vue/`
   - `gen2-docs-react/`
   - `gen1-docs-angular/`
   - etc.

   Each Gen2 platform will have API reference docs in:
   ```
   gen2-docs-<platform>/build-a-backend/add-aws-services/<category>/reference.md
   ```

---

## Script Details

- **extract-and-format-all-docs.js**  
  Orchestrates the entire workflow: fetches the latest docs, runs all processing scripts for every platform, and generates static API reference docs.

- **scripts/extract-docs.js**  
  Extracts platform-specific and shared content from all Amplify documentation `.mdx` files, converts them to Markdown, and outputs them to the appropriate platform directory.

- **scripts/flatten-single-index-folders.js**  
  Flattens the documentation structure by replacing any folder that contains only a single `index.md` file and no subfolders with a single `.md` file at the parent level. Updates all internal links.

- **scripts/add-breadcrumbs.js**  
  Adds a breadcrumb trail to the top of every Markdown file, reflecting the file's full path and context within the documentation.

- **scripts/extract-api-reference.js**  
  Extracts API reference data from the Amplify API model and generates static Markdown reference docs for each major category in every Gen2 platform's output.

---

## Advanced

- To add or remove platforms, edit the `PLATFORMS` array in `extract-and-format-all-docs.js`.
- To run scripts individually, see their usage in the code comments in the scripts/ directory.
- To customize API reference category mappings, edit `CATEGORY_PREFIXES` in `scripts/extract-api-reference.js`.

---

**Output:**  
A clean, static, and navigable documentation set for Amplify Gen2 and Gen1, for every major platform, including static API reference docs for each category.
