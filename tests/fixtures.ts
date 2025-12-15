// =============================================================================
// Playwright Test Fixtures - Read Water Frontend E2E Tests
// =============================================================================

import { test as base, expect } from '@playwright/test';

// =============================================================================
// Test Credentials (from Seed 2)
// =============================================================================

// Legacy admin (for backward compatibility with existing tests)
export const TEST_ADMIN = {
  email: 'super.admin@example.com',
  password: 'Asdf1234.',
};

// Multi-tenant test users
export const TEST_USERS = {
  // HATSU Tenant Admin
  hatsu: {
    email: 'hatsu.yetkili@example.com',
    password: 'Asdf1234.',
    tenantName: 'HATSU',
    tenantPath: 'root.hatsu',
    role: 'TENANT_ADMIN',
  },
  // ASKİ Tenant Admin
  aski: {
    email: 'aski.yetkili@example.com',
    password: 'Asdf1234.',
    tenantName: 'ASKİ',
    tenantPath: 'root.aski',
    role: 'TENANT_ADMIN',
  },
  // Platform Admin (Super Admin)
  superAdmin: {
    email: 'super.admin@example.com',
    password: 'Asdf1234.',
    tenantName: 'Read Water Platform',
    tenantPath: 'root',
    role: 'PLATFORM_ADMIN',
  },
};

// Expected data counts for each tenant (from Seed 2)
export const EXPECTED_COUNTS = {
  hatsu: {
    customers: 400,
    meters: 400,
    devices: 400,
  },
  aski: {
    customers: 1301,
    meters: 1302,
    devices: 1302,
  },
  total: {
    customers: 1701,
    meters: 1702,
    devices: 1702,
  },
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

// Helper to login as specific user type
export async function loginAs(page: any, userType: 'hatsu' | 'aski' | 'superAdmin') {
  const user = TEST_USERS[userType];
  await login(page, user.email, user.password);
}

// Helper to logout
export async function logout(page: any) {
  const logoutButton = page.locator('button').filter({ has: page.locator('svg.lucide-log-out') });
  await logoutButton.click();
  await page.waitForURL(/.*login/, { timeout: 5000 });
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

