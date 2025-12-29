# E2E Tests

This directory contains end-to-end tests using Playwright.

## Setup

Playwright is configured to run tests against the local development server at `http://localhost:4321`.

### Prerequisites

- Node.js and npm installed
- Frontend dependencies installed (`npm install`)

## Running Tests

### Run all E2E tests (headless)
```bash
npm run test:e2e
```

### Run tests with UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug tests
```bash
npm run test:e2e:debug
```

### Run all tests (unit + E2E)
```bash
npm run test:all
```

## Test Coverage

### Theme Toggle Tests ([theme-toggle.spec.ts](./theme-toggle.spec.ts))

The theme toggle test suite validates the light/dark mode functionality:

#### Core Functionality
- ✅ Theme toggle button exists and is accessible
- ✅ Defaults to system preference on first visit
- ✅ Toggle switches from light to dark theme
- ✅ Toggle switches from dark to light theme
- ✅ Theme preference persists in localStorage
- ✅ Theme persists across page navigation

#### Visual & UI
- ✅ Toggle icon changes based on current theme
- ✅ CSS variables update when theme switches
- ✅ Background colors change with theme
- ✅ All header components remain visible in both themes
- ✅ Toggle button has hover state

#### Performance & UX
- ✅ No FOUC (Flash of Unstyled Content) on page load
- ✅ Theme applies to all page elements
- ✅ Smooth transitions between themes

## Test Results

Latest test run: **13 passed, 1 skipped**

The skipped test (`theme toggle works on country fertility page`) requires country data to be present and is marked as conditional.

## Configuration

Playwright configuration is in [playwright.config.ts](../playwright.config.ts).

Key settings:
- **Test directory**: `./e2e`
- **Base URL**: `http://localhost:4321`
- **Browser**: Chromium (Desktop Chrome)
- **Web server**: Auto-starts dev server if not running
- **Retries**: 2 on CI, 0 locally
- **Reporters**: HTML report (generated on test completion)

## Viewing Test Reports

After running tests, view the HTML report:
```bash
npx playwright show-report
```

## Writing New Tests

When adding new E2E tests:

1. Create a new `.spec.ts` file in the `e2e/` directory
2. Follow the existing test patterns for consistency
3. Use descriptive test names with `test.describe()` groups
4. Include `test.beforeEach()` for common setup
5. Add cleanup in `test.afterEach()` if needed
6. Use specific selectors (IDs, test IDs, or specific classes)
7. Avoid brittle selectors that depend on DOM structure

### Example Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Common setup
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.click('#some-button');

    // Act
    const element = page.locator('#result');

    // Assert
    await expect(element).toBeVisible();
  });
});
```

## Debugging Tips

1. **Use headed mode** to see what's happening:
   ```bash
   npm run test:e2e:headed
   ```

2. **Use debug mode** for step-by-step execution:
   ```bash
   npm run test:e2e:debug
   ```

3. **Add screenshots** to failing tests:
   - Screenshots are automatically captured on failure
   - Find them in `test-results/` directory

4. **Use `page.pause()`** to pause test execution:
   ```typescript
   await page.pause(); // Browser will pause here
   ```

5. **Check the trace viewer** for detailed execution logs:
   - Traces are captured on first retry
   - View with `npx playwright show-trace <path-to-trace.zip>`

## CI/CD Integration

The Playwright tests are configured for CI environments:

- Tests run in headless mode on CI
- Retries enabled (2 attempts)
- Single worker to avoid resource conflicts
- `forbidOnly` prevents `.only` tests from running on CI

Environment detection uses `process.env.CI`.

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Astro Testing Guide](https://docs.astro.build/en/guides/testing/)
