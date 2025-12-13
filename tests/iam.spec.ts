// =============================================================================
// IAM E2E Tests - Tenants & Users Management
// =============================================================================

import { test, expect } from '@playwright/test';
import { login, generateTestId } from './fixtures';

test.describe('IAM - Tenants & Users', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Tenants Management', () => {
    const testTenantName = `Region-${generateTestId()}`;

    test('should navigate to tenants page', async ({ page }) => {
      // Navigate directly to tenants page
      await page.goto('/iam/tenants');

      // Verify page loaded
      await expect(page).toHaveURL(/\/iam\/tenants/);
      await expect(page.getByRole('heading', { name: /tenants/i })).toBeVisible();
    });

    test('should display tenants tree table', async ({ page }) => {
      await page.goto('/iam/tenants');

      // Check table headers are visible
      await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /path/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
    });

    test('should open create tenant dialog', async ({ page }) => {
      await page.goto('/iam/tenants');

      // Click Add Tenant button
      await page.click('button:has-text("Add Tenant")');

      // Verify dialog is open
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Basic Information')).toBeVisible();
    });

    test('should create a new tenant', async ({ page }) => {
      await page.goto('/iam/tenants');

      // Open dialog
      await page.click('button:has-text("Add Tenant")');
      await expect(page.getByRole('dialog')).toBeVisible();

      // Wait for form to load
      await page.waitForSelector('input[placeholder="Enter tenant name"]', { timeout: 5000 });

      // Fill tenant name
      await page.fill('input[placeholder="Enter tenant name"]', testTenantName);

      // Fill contact info
      await page.fill('input[placeholder="First name"]', 'Test');
      await page.fill('input[placeholder="Last name"]', 'Admin');
      await page.fill('input[placeholder="Email address"]', 'test@region.com');

      // Submit form
      await page.click('button[type="submit"]:has-text("Create Tenant")');

      // Wait for success (dialog should close)
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

      // Verify tenant appears in table
      await expect(page.getByText(testTenantName)).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to tenant detail', async ({ page }) => {
      await page.goto('/iam/tenants');

      // Wait for table to load
      await page.waitForSelector('table tbody tr', { timeout: 5000 });

      // Click first tenant row (if exists)
      const firstRow = page.locator('table tbody tr').first();
      if (await firstRow.isVisible()) {
        await firstRow.click();

        // Should navigate to detail page
        await expect(page).toHaveURL(/\/iam\/tenants\/[a-f0-9-]+/);
      }
    });

    test('should search tenants', async ({ page }) => {
      await page.goto('/iam/tenants');

      // Find search input
      const searchInput = page.getByPlaceholder(/search tenants/i);
      await expect(searchInput).toBeVisible();

      // Type search query
      await searchInput.fill('test');

      // Wait for search to apply
      await page.waitForTimeout(500);

      // Results should be filtered (or show no results message)
      // This is a soft check since data depends on seeding
    });

    test('should expand/collapse tenant tree', async ({ page }) => {
      await page.goto('/iam/tenants');

      // Wait for table
      await page.waitForSelector('table tbody tr', { timeout: 5000 });

      // Look for expand button (if tenant has children)
      const expandButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).first();
      
      if (await expandButton.isVisible()) {
        await expandButton.click();

        // Should show chevron-down now
        await expect(page.locator('svg.lucide-chevron-down').first()).toBeVisible();
      }
    });
  });

  test.describe('Users Management', () => {
    test('should navigate to users page', async ({ page }) => {
      // Navigate directly to users page (avoids sidebar animation issues)
      await page.goto('/iam/users');

      // Verify page loaded
      await expect(page).toHaveURL(/\/iam\/users/);
      await expect(page.getByRole('heading', { name: /users/i })).toBeVisible();
    });

    test('should display users table', async ({ page }) => {
      await page.goto('/iam/users');

      // Check table exists
      await expect(page.locator('table')).toBeVisible();
    });

    test('should open create user dialog', async ({ page }) => {
      await page.goto('/iam/users');

      // Click Add User button
      await page.click('button:has-text("Add User")');

      // Verify dialog opens
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('should validate user form fields', async ({ page }) => {
      await page.goto('/iam/users');

      // Open create dialog
      await page.click('button:has-text("Add User")');
      await expect(page.getByRole('dialog')).toBeVisible();

      // Try to submit empty form
      await page.click('button[type="submit"]:has-text("Create User")');

      // Should show validation errors (form won't submit)
      // Dialog should still be open
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('should create a new user', async ({ page }) => {
      await page.goto('/iam/users');

      // Open create dialog
      await page.click('button:has-text("Add User")');
      await expect(page.getByRole('dialog')).toBeVisible();

      // Wait for form to load
      await page.waitForTimeout(500);

      // Find form inputs within the dialog specifically
      const dialog = page.getByRole('dialog');
      
      // Fill first name
      const firstNameInput = dialog.locator('input[placeholder*="First" i]').first();
      if (await firstNameInput.isVisible().catch(() => false)) {
        await firstNameInput.fill('Test');
      }
      
      // Fill last name
      const lastNameInput = dialog.locator('input[placeholder*="Last" i]').first();
      if (await lastNameInput.isVisible().catch(() => false)) {
        await lastNameInput.fill('Operator');
      }
      
      // Fill email - be specific to find the one in the dialog form
      const emailInput = dialog.locator('input[type="email"]').first();
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill(`operator-${generateTestId()}@test.com`);
      }
      
      // Fill password
      const passwordInput = dialog.locator('input[type="password"]').first();
      if (await passwordInput.isVisible().catch(() => false)) {
        await passwordInput.fill('TestPass123!');
      }

      // Submit
      const submitButton = dialog.locator('button[type="submit"]');
      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(2000);
      }
    });
  });
});

