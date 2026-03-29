/**
 * Patient Management E2E Tests
 *
 * Tests the patient list, search, and new patient form pages.
 * Verifies that UI elements render correctly and forms have proper fields.
 *
 * To run: E2E_BASE_URL=http://localhost:3000 npm run test:e2e
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { WebDriver, By } from 'selenium-webdriver'
import { createDriver, navigateTo, waitForElement, waitForUrl, elementExists, getElementText } from './selenium-helpers'
import { PatientsPage, NewPatientPage } from './page-objects/patients.page'

const E2E_ENABLED = !!process.env.E2E_BASE_URL
const describeE2E = E2E_ENABLED ? describe : describe.skip

describeE2E('Patient Management E2E Tests', () => {
  let driver: WebDriver
  let patientsPage: PatientsPage
  let newPatientPage: NewPatientPage

  beforeAll(async () => {
    driver = await createDriver()
    patientsPage = new PatientsPage(driver)
    newPatientPage = new NewPatientPage(driver)
  })

  afterAll(async () => {
    if (driver) await driver.quit()
  })

  describe('Patients List Page', () => {
    it('should redirect unauthenticated users to login', async () => {
      await navigateTo(driver, '/patients')
      await waitForUrl(driver, '/login', 10000)
      const currentUrl = await driver.getCurrentUrl()
      expect(currentUrl).toContain('/login')
    })
  })

  describe('Patients List Page (when authenticated)', () => {
    // Note: These tests require a logged-in session
    // They verify the page structure when accessible

    it('should have the "Patients" heading', async () => {
      await patientsPage.navigate()
      const title = await patientsPage.getHeadingText()
      expect(title).toContain('Patients')
    })

    it('should have a "New Patient" button', async () => {
      await patientsPage.navigate()
      expect(await patientsPage.newPatientButtonExists()).toBe(true)
    })

    it('should have a search input', async () => {
      await patientsPage.navigate()
      expect(await patientsPage.searchInputExists()).toBe(true)
    })

    it('should have search input with correct placeholder', async () => {
      await patientsPage.navigate()
      const input = await waitForElement(driver, By.css('input[type="text"]'))
      const placeholder = await input.getAttribute('placeholder')
      expect(placeholder).toContain('Search patients')
    })

    it('should navigate to new patient form', async () => {
      await patientsPage.navigate()
      await patientsPage.clickNewPatient()
      const currentUrl = await driver.getCurrentUrl()
      expect(currentUrl).toContain('/patients/new')
    })
  })

  describe('New Patient Form', () => {
    it('should display "Register New Patient" heading', async () => {
      await newPatientPage.navigate()
      const title = await newPatientPage.getHeadingText()
      expect(title).toContain('Register New Patient')
    })

    it('should have a back link to patients', async () => {
      await newPatientPage.navigate()
      const backLink = await elementExists(driver, By.linkText('← Back to patients'))
      expect(backLink).toBe(true)
    })

    it('should have personal information fields', async () => {
      await newPatientPage.navigate()
      expect(await elementExists(driver, By.id('firstName'))).toBe(true)
      expect(await elementExists(driver, By.id('lastName'))).toBe(true)
      expect(await elementExists(driver, By.id('email'))).toBe(true)
      expect(await elementExists(driver, By.id('phone'))).toBe(true)
    })

    it('should have date of birth field', async () => {
      await newPatientPage.navigate()
      expect(await elementExists(driver, By.id('dateOfBirth'))).toBe(true)
    })

    it('should have clinical data fields', async () => {
      await newPatientPage.navigate()
      expect(await elementExists(driver, By.id('height'))).toBe(true)
      expect(await elementExists(driver, By.id('weight'))).toBe(true)
      expect(await elementExists(driver, By.id('targetWeight'))).toBe(true)
    })

    it('should have goals and medical history textareas', async () => {
      await newPatientPage.navigate()
      expect(await elementExists(driver, By.id('goals'))).toBe(true)
      expect(await elementExists(driver, By.id('medicalHistory'))).toBe(true)
    })

    it('should have submit button with "Register Patient" text', async () => {
      await newPatientPage.navigate()
      const button = await waitForElement(driver, By.css('button[type="submit"]'))
      const text = await button.getText()
      expect(text).toContain('Register Patient')
    })

    it('should have cancel button linking to patients', async () => {
      await newPatientPage.navigate()
      const cancelLink = await elementExists(driver, By.css('a[href="/patients"]'))
      expect(cancelLink).toBe(true)
    })

    it('should have firstName and lastName as required fields', async () => {
      await newPatientPage.navigate()
      const firstName = await waitForElement(driver, By.id('firstName'))
      const lastName = await waitForElement(driver, By.id('lastName'))
      expect(await firstName.getAttribute('required')).not.toBeNull()
      expect(await lastName.getAttribute('required')).not.toBeNull()
    })
  })
})
