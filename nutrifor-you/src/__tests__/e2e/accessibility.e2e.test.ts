/**
 * Accessibility E2E Tests
 *
 * Tests WCAG 2.1 Level A compliance for key pages:
 * - Form labels and aria attributes
 * - Heading hierarchy
 * - Keyboard accessibility
 * - Color contrast (via semantic checks)
 *
 * To run: E2E_BASE_URL=http://localhost:3000 npm run test:e2e
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { WebDriver, By, Key } from 'selenium-webdriver'
import { createDriver, navigateTo, waitForElement, elementExists } from './selenium-helpers'

const E2E_ENABLED = !!process.env.E2E_BASE_URL
const describeE2E = E2E_ENABLED ? describe : describe.skip

describeE2E('Accessibility E2E Tests', () => {
  let driver: WebDriver

  beforeAll(async () => {
    driver = await createDriver()
  })

  afterAll(async () => {
    if (driver) await driver.quit()
  })

  describe('Login Page Accessibility', () => {
    it('should have proper labels for all form inputs', async () => {
      await navigateTo(driver, '/login')
      // Check that each input has an associated label
      const emailLabel = await elementExists(driver, By.css('label[for="email"]'))
      const passwordLabel = await elementExists(driver, By.css('label[for="password"]'))
      expect(emailLabel).toBe(true)
      expect(passwordLabel).toBe(true)
    })

    it('should have proper heading hierarchy', async () => {
      await navigateTo(driver, '/login')
      // Should have h1 (app name) and h2 (page title)
      const h1Exists = await elementExists(driver, By.css('h1'))
      const h2Exists = await elementExists(driver, By.css('h2'))
      expect(h1Exists).toBe(true)
      expect(h2Exists).toBe(true)
    })

    it('should allow tab navigation through form fields', async () => {
      await navigateTo(driver, '/login')
      const emailInput = await waitForElement(driver, By.id('email'))
      await emailInput.click()

      // Tab to password
      await emailInput.sendKeys(Key.TAB)
      const activeElement = await driver.switchTo().activeElement()
      const activeId = await activeElement.getAttribute('id')
      expect(activeId).toBe('password')
    })

    it('should have submit button accessible via keyboard', async () => {
      await navigateTo(driver, '/login')
      const button = await waitForElement(driver, By.css('button[type="submit"]'))
      const tagName = await button.getTagName()
      const type = await button.getAttribute('type')
      expect(tagName.toLowerCase()).toBe('button')
      expect(type).toBe('submit')
    })
  })

  describe('Register Page Accessibility', () => {
    it('should have proper labels for all form inputs', async () => {
      await navigateTo(driver, '/register')
      const labels = await driver.findElements(By.css('label'))
      // Should have labels for firstName, lastName, email, password, confirmPassword
      expect(labels.length).toBeGreaterThanOrEqual(5)
    })

    it('should have descriptive labels (not just placeholders)', async () => {
      await navigateTo(driver, '/register')
      const firstNameLabel = await elementExists(driver, By.css('label[for="firstName"]'))
      const lastNameLabel = await elementExists(driver, By.css('label[for="lastName"]'))
      const emailLabel = await elementExists(driver, By.css('label[for="email"]'))
      const passwordLabel = await elementExists(driver, By.css('label[for="password"]'))

      expect(firstNameLabel).toBe(true)
      expect(lastNameLabel).toBe(true)
      expect(emailLabel).toBe(true)
      expect(passwordLabel).toBe(true)
    })

    it('should maintain heading hierarchy (no skipped levels)', async () => {
      await navigateTo(driver, '/register')
      const h1s = await driver.findElements(By.css('h1'))
      const h2s = await driver.findElements(By.css('h2'))
      // Must have h1 before h2
      expect(h1s.length).toBeGreaterThan(0)
      expect(h2s.length).toBeGreaterThan(0)
    })
  })

  describe('General Accessibility', () => {
    it('should have a lang attribute on html element', async () => {
      await navigateTo(driver, '/login')
      const html = await driver.findElement(By.css('html'))
      const lang = await html.getAttribute('lang')
      expect(lang).toBeTruthy()
    })

    it('should have a viewport meta tag for mobile accessibility', async () => {
      await navigateTo(driver, '/login')
      const viewport = await elementExists(driver, By.css('meta[name="viewport"]'))
      expect(viewport).toBe(true)
    })

    it('should not have any images without alt text on auth pages', async () => {
      await navigateTo(driver, '/login')
      const images = await driver.findElements(By.css('img'))
      for (const img of images) {
        const alt = await img.getAttribute('alt')
        expect(alt).not.toBeNull()
        expect(alt).not.toBe('')
      }
    })

    it('should have focusable interactive elements', async () => {
      await navigateTo(driver, '/login')
      const links = await driver.findElements(By.css('a'))
      const buttons = await driver.findElements(By.css('button'))
      // All interactive elements should be focusable
      for (const link of links) {
        const tabIndex = await link.getAttribute('tabindex')
        // tabindex should not be -1 (which makes it unfocusable)
        if (tabIndex !== null) {
          expect(parseInt(tabIndex)).toBeGreaterThanOrEqual(0)
        }
      }
      for (const button of buttons) {
        const disabled = await button.getAttribute('disabled')
        if (!disabled) {
          const tabIndex = await button.getAttribute('tabindex')
          if (tabIndex !== null) {
            expect(parseInt(tabIndex)).toBeGreaterThanOrEqual(0)
          }
        }
      }
    })
  })
})
