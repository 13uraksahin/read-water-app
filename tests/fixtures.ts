// =============================================================================
// Playwright Test Fixtures - Read Water Frontend E2E Tests
// =============================================================================

import { test as base, expect } from '@playwright/test';

// Test credentials (from seed: Admin@123)
export const TEST_ADMIN = {
  email: 'admin@readwater.io',
  password: 'Admin@123',
};

// Extend base test with custom fixtures
export const test = base.extend<{
  authenticatedPage: typeof base;
}>({
  // Add authenticated page fixture
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login
    await page.goto('/login');
    
    // Fill in credentials
    await page.fill('#email', TEST_ADMIN.email);
    await page.fill('#password', TEST_ADMIN.password);
    
    // Click submit
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/', { timeout: 10000 });
    
    // Use the authenticated page
    await use(base);
  },
});

export { expect };

// Helper to login programmatically
export async function login(page: any, email = TEST_ADMIN.email, password = TEST_ADMIN.password) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 10000 });
}

// Helper to wait for API responses
export async function waitForApiResponse(page: any, urlPattern: string | RegExp) {
  return page.waitForResponse(
    (response: any) => {
      if (typeof urlPattern === 'string') {
        return response.url().includes(urlPattern);
      }
      return urlPattern.test(response.url());
    },
    { timeout: 10000 }
  );
}

// Generate unique test data
export function generateTestId() {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

