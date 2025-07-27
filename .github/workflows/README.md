# GitHub Actions Workflows

This directory contains GitHub Actions workflows for the Playwright trial project using Deno.

## Workflows

### Monday Pipeline (`monday-pipeline-scheduled.yml`)

- **Schedule**: Runs every Monday at 9 AM UTC
- **Purpose**: Generates identifiers and saves them as artifacts
- **Key Features**:
  - Installs Deno and Playwright browsers
  - Runs Playwright tests to generate identifiers using `deno task test:generate`
  - Uploads results as `identifier-data` artifact

### Tuesday Pipeline (`tuesday-pipeline-scheduled.yml`)

- **Schedule**: Runs every Tuesday at 9 AM UTC
- **Purpose**: Downloads Monday's artifacts and runs validation tests
- **Key Features**:
  - Downloads the `identifier-data` artifact from the most recent successful run
  - Runs validation tests using the downloaded data with `deno task test:validate`
  - Uploads validation results as `validation-results` artifact

## Key Features

1. **Deno Integration**: Uses Deno instead of Node.js for better TypeScript support and faster execution
2. **Artifact Sharing**: Tuesday pipeline downloads artifacts from Monday pipeline
3. **Manual Triggering**: Both workflows include `workflow_dispatch` to allow manual execution
4. **Artifact Retention**: Set to 30 days (configurable)
5. **Deno Setup**: Uses `denoland/setup-deno@v1` with proper caching

## Setup Requirements

1. These files are placed in `.github/workflows/` directory in your repository
2. Ensure your repository has the necessary Playwright test files:
   - `tests/generate-identifiers.spec.ts`
   - `tests/validate-report.spec.ts`
3. Make sure your `deno.json` includes the necessary tasks:
   - `test:generate`
   - `test:validate`
   - `install`

## Notes

- The Tuesday pipeline assumes it can download artifacts from the Monday pipeline
- Artifacts are shared within the same repository
- The validation test includes fallback sample data if no artifacts are found
- Both workflows use Deno tasks defined in `deno.json` for consistent execution

## Manual Execution

To run these workflows manually:

1. Go to the **Actions** tab in your GitHub repository
2. Select either "Monday Pipeline - Scheduled" or "Tuesday Pipeline - Scheduled"
3. Click **Run workflow**
4. Choose your branch and click **Run workflow**

## Artifact Flow

1. **Monday**: Generates data → Uploads as `identifier-data` artifact
2. **Tuesday**: Downloads `identifier-data` → Validates data → Uploads as `validation-results` artifact
