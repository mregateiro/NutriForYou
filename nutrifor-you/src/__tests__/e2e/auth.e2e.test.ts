/**
 * Authentication E2E Tests
 *
 * Tests the login and registration flows using Selenium WebDriver.
 * These tests verify that auth pages render correctly, forms have proper
 * fields and validation, and navigation between auth pages works.
 *
 * To run: E2E_BASE_URL=http://localhost:3000 npm run test:e2e
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { WebDriver, By } from 'selenium-webdriver'
import { createDriver, navigateTo, waitForElement, elementExists, getElementText } from './selenium-helpers'
import { LoginPage } from './page-objects/login.page'
import { RegisterPage } from './page-objects/register.page'

const E2E_ENABLED = !!process.env.E2E_BASE_URL
const describeE2E = E2E_ENABLED ? describe : describe.skip

describeE2E('Authentication E2E Tests', () => {
  let driver: WebDriver
  let loginPage: LoginPage
  let registerPage: RegisterPage

  beforeAll(async () => {
    driver = await createDriver()
    loginPage = new LoginPage(driver)
    registerPage = new RegisterPage(driver)
  })

  afterAll(async () => {
    if (driver) await driver.quit()
  })

  describe('Login Page', () => {
    it('should render the login page', async () => {
      await loginPage.navigate()
      expect(await loginPage.isDisplayed()).toBe(true)
    })

    it('should display the correct heading', async () => {
      await loginPage.navigate()
      const title = await getElementText(driver, By.css('h2'))
      expect(title).toContain('Sign in')
    })

    it('should have email input field', async () => {
      await loginPage.navigate()
      const emailExists = await elementExists(driver, By.id('email'))
      expect(emailExists).toBe(true)
    })

    it('should have password input field', async () => {
      await loginPage.navigate()
      const passwordExists = await elementExists(driver, By.id('password'))
      expect(passwordExists).toBe(true)
    })

    it('should have a submit button with "Sign in" text', async () => {
      await loginPage.navigate()
      const button = await waitForElement(driver, By.css('button[type="submit"]'))
      const text = await button.getText()
      expect(text).toContain('Sign in')
    })

    it('should have a link to the register page', async () => {
      await loginPage.navigate()
      const linkExists = await elementExists(driver, By.linkText('Create one'))
      expect(linkExists).toBe(true)
    })

    it('should have a link to forgot password', async () => {
      await loginPage.navigate()
      const linkExists = await elementExists(driver, By.linkText('Forgot your password?'))
      expect(linkExists).toBe(true)
    })

    it('should have email input with type="email"', async () => {
      await loginPage.navigate()
      const input = await waitForElement(driver, By.id('email'))
      const type = await input.getAttribute('type')
      expect(type).toBe('email')
    })

    it('should have password input with type="password"', async () => {
      await loginPage.navigate()
      const input = await waitForElement(driver, By.id('password'))
      const type = await input.getAttribute('type')
      expect(type).toBe('password')
    })

    it('should have required attribute on email field', async () => {
      await loginPage.navigate()
      const input = await waitForElement(driver, By.id('email'))
      const required = await input.getAttribute('required')
      expect(required).not.toBeNull()
    })

    it('should have required attribute on password field', async () => {
      await loginPage.navigate()
      const input = await waitForElement(driver, By.id('password'))
      const required = await input.getAttribute('required')
      expect(required).not.toBeNull()
    })
  })

  describe('Register Page', () => {
    it('should render the register page', async () => {
      await registerPage.navigate()
      expect(await registerPage.isDisplayed()).toBe(true)
    })

    it('should display the correct heading', async () => {
      await registerPage.navigate()
      const title = await getElementText(driver, By.css('h2'))
      expect(title).toContain('Create your account')
    })

    it('should have all registration form fields', async () => {
      await registerPage.navigate()
      expect(await elementExists(driver, By.id('firstName'))).toBe(true)
      expect(await elementExists(driver, By.id('lastName'))).toBe(true)
      expect(await elementExists(driver, By.id('email'))).toBe(true)
      expect(await elementExists(driver, By.id('password'))).toBe(true)
      expect(await elementExists(driver, By.id('confirmPassword'))).toBe(true)
    })

    it('should have a submit button with "Create account" text', async () => {
      await registerPage.navigate()
      const button = await waitForElement(driver, By.css('button[type="submit"]'))
      const text = await button.getText()
      expect(text).toContain('Create account')
    })

    it('should have a link to login page', async () => {
      await registerPage.navigate()
      const linkExists = await elementExists(driver, By.linkText('Sign in'))
      expect(linkExists).toBe(true)
    })

    it('should show password requirements helper text', async () => {
      await registerPage.navigate()
      const pageSource = await driver.getPageSource()
      expect(pageSource).toContain('Min 8 characters')
    })
  })

  describe('Navigation between auth pages', () => {
    it('should navigate from login to register', async () => {
      await loginPage.navigate()
      await loginPage.clickRegisterLink()
      const currentUrl = await driver.getCurrentUrl()
      expect(currentUrl).toContain('/register')
    })

    it('should navigate from register to login', async () => {
      await registerPage.navigate()
      await registerPage.clickLoginLink()
      const currentUrl = await driver.getCurrentUrl()
      expect(currentUrl).toContain('/login')
    })
  })
})
