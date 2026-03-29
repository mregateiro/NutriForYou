/**
 * Navigation E2E Tests
 *
 * Tests application-wide navigation behavior:
 * - Home page redirect
 * - Auth page accessibility without login
 * - Protected page redirects when unauthenticated
 *
 * To run: E2E_BASE_URL=http://localhost:3000 npm run test:e2e
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { WebDriver } from 'selenium-webdriver'
import { createDriver, navigateTo, waitForUrl } from './selenium-helpers'

const E2E_ENABLED = !!process.env.E2E_BASE_URL
const describeE2E = E2E_ENABLED ? describe : describe.skip

describeE2E('Navigation E2E Tests', () => {
  let driver: WebDriver

  beforeAll(async () => {
    driver = await createDriver()
  })

  afterAll(async () => {
    if (driver) await driver.quit()
  })

  describe('Home Page', () => {
    it('should redirect root to /dashboard (which may redirect to /login)', async () => {
      await navigateTo(driver, '/')
      const currentUrl = await driver.getCurrentUrl()
      // Root redirects to /dashboard. If not authenticated, /dashboard redirects to /login
      expect(currentUrl).toMatch(/\/(dashboard|login)/)
    })
  })

  describe('Auth Pages Accessibility', () => {
    it('should allow access to login page without authentication', async () => {
      await navigateTo(driver, '/login')
      const currentUrl = await driver.getCurrentUrl()
      expect(currentUrl).toContain('/login')
    })

    it('should allow access to register page without authentication', async () => {
      await navigateTo(driver, '/register')
      const currentUrl = await driver.getCurrentUrl()
      expect(currentUrl).toContain('/register')
    })

    it('should allow access to forgot password page without authentication', async () => {
      await navigateTo(driver, '/forgot-password')
      const currentUrl = await driver.getCurrentUrl()
      expect(currentUrl).toContain('/forgot-password')
    })
  })

  describe('Protected Routes', () => {
    it('should redirect /dashboard to /login when unauthenticated', async () => {
      await navigateTo(driver, '/dashboard')
      await waitForUrl(driver, '/login', 10000)
      const currentUrl = await driver.getCurrentUrl()
      expect(currentUrl).toContain('/login')
    })

    it('should redirect /patients to /login when unauthenticated', async () => {
      await navigateTo(driver, '/patients')
      await waitForUrl(driver, '/login', 10000)
      const currentUrl = await driver.getCurrentUrl()
      expect(currentUrl).toContain('/login')
    })

    it('should redirect /consultations to /login when unauthenticated', async () => {
      await navigateTo(driver, '/consultations')
      await waitForUrl(driver, '/login', 10000)
      const currentUrl = await driver.getCurrentUrl()
      expect(currentUrl).toContain('/login')
    })

    it('should redirect /meal-plans to /login when unauthenticated', async () => {
      await navigateTo(driver, '/meal-plans')
      await waitForUrl(driver, '/login', 10000)
      const currentUrl = await driver.getCurrentUrl()
      expect(currentUrl).toContain('/login')
    })

    it('should redirect /agenda to /login when unauthenticated', async () => {
      await navigateTo(driver, '/agenda')
      await waitForUrl(driver, '/login', 10000)
      const currentUrl = await driver.getCurrentUrl()
      expect(currentUrl).toContain('/login')
    })

    it('should redirect /finances to /login when unauthenticated', async () => {
      await navigateTo(driver, '/finances')
      await waitForUrl(driver, '/login', 10000)
      const currentUrl = await driver.getCurrentUrl()
      expect(currentUrl).toContain('/login')
    })

    it('should redirect /settings to /login when unauthenticated', async () => {
      await navigateTo(driver, '/settings')
      await waitForUrl(driver, '/login', 10000)
      const currentUrl = await driver.getCurrentUrl()
      expect(currentUrl).toContain('/login')
    })

    it('should redirect /admin to /login when unauthenticated', async () => {
      await navigateTo(driver, '/admin')
      await waitForUrl(driver, '/login', 10000)
      const currentUrl = await driver.getCurrentUrl()
      expect(currentUrl).toContain('/login')
    })
  })
})
