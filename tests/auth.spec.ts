// =============================================================================
// Authentication E2E Tests - Read Water
// =============================================================================
// Tests: Login, Validation, Logout
// =============================================================================

import { test, expect } from '@playwright/test';
import { TEST_ADMIN, login } from './fixtures';

test.describe('Authentication', () => {
  test.describe('Login Flow', () => {
    test('should display login page with all elements', async ({ page }) => {
      await page.goto('/login');

      // Check page title/header
      await expect(page.getByText('Read Water')).toBeVisible();
      await expect(page.getByText('Sign in to your account')).toBeVisible();

      // Check form elements
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

      // Check demo credentials hint
      await expect(page.getByText('admin@readwater.io')).toBeVisible();
    });

    test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
      await page.goto('/login');

      // Fill credentials
      await page.fill('#email', TEST_ADMIN.email);
      await page.fill('#password', TEST_ADMIN.password);

      // Click submit
      await page.click('button[type="submit"]');

      // Wait for redirect to dashboard
      await page.waitForURL('/', { timeout: 15000 });

      // Verify dashboard is displayed
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

      // Verify user info is shown in sidebar
      await expect(page.locator('.sidebar-link').first()).toBeVisible();
    });

    test('should show error message with invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill wrong credentials
      await page.fill('#email', 'wrong@example.com');
      await page.fill('#password', 'wrongpassword');

      // Click submit
      await page.click('button[type="submit"]');

      // Wait for error message (should stay on login page)
      await expect(page).toHaveURL(/.*login/);

      // Error message should be visible
      await expect(page.locator('.bg-destructive\\/10')).toBeVisible({ timeout: 5000 });
    });

    test('should disable submit button when fields are empty', async ({ page }) => {
      await page.goto('/login');

      // Check submit button is disabled
      const submitButton = page.getByRole('button', { name: /sign in/i });
      await expect(submitButton).toBeDisabled();

      // Fill only email
      await page.fill('#email', TEST_ADMIN.email);
      await expect(submitButton).toBeDisabled();

      // Clear email, fill only password
      await page.fill('#email', '');
      await page.fill('#password', 'password');
      await expect(submitButton).toBeDisabled();

      // Fill both - should be enabled
      await page.fill('#email', TEST_ADMIN.email);
      await expect(submitButton).toBeEnabled();
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      await page.goto('/login');

      // Fill invalid email
      await page.fill('#email', 'invalid-email');
      await page.fill('#password', 'somepassword');

      // Should show validation error
      await expect(page.getByText(/valid email/i)).toBeVisible();

      // Submit button should be disabled
      await expect(page.getByRole('button', { name: /sign in/i })).toBeDisabled();
    });

    test('should toggle password visibility', async ({ page }) => {
      await page.goto('/login');

      const passwordInput = page.locator('#password');
      const toggleButton = page.locator('button[type="button"]').filter({ has: page.locator('svg') });

      // Initially password should be hidden
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Fill password
      await page.fill('#password', 'testpassword');

      // Click toggle
      await toggleButton.click();

      // Password should be visible
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Click toggle again
      await toggleButton.click();

      // Password should be hidden again
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  test.describe('Logout Flow', () => {
    test('should logout and redirect to login page', async ({ page }) => {
      // First login
      await login(page);

      // Verify on dashboard
      await expect(page).toHaveURL('/');

      // Find and click logout button in sidebar
      const logoutButton = page.locator('button').filter({ has: page.locator('svg.lucide-log-out') });
      await logoutButton.click();

      // Should redirect to login
      await page.waitForURL(/.*login/, { timeout: 5000 });
      await expect(page).toHaveURL(/.*login/);

      // Login form should be visible
      await expect(page.locator('#email')).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route unauthenticated', async ({ page }) => {
      // Try to access dashboard directly without login
      await page.goto('/');

      // Should redirect to login
      await expect(page).toHaveURL(/.*login/);
    });

    test('should redirect to login when accessing any protected route', async ({ page }) => {
      const protectedRoutes = [
        '/customers',
        '/meters',
        '/devices',
        '/profiles',
        '/iam/tenants',
        '/iam/users',
        '/settings',
      ];

      for (const route of protectedRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL(/.*login/);
      }
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain session after page refresh', async ({ page }) => {
      // Login
      await login(page);

      // Verify on dashboard
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

      // Refresh page
      await page.reload();

      // Should still be on dashboard (session persisted)
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    });
  });
});

