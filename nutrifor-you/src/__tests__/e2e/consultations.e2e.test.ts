/**
 * Consultation Management E2E Tests
 *
 * Tests the consultations list page and its UI components.
 *
 * To run: E2E_BASE_URL=http://localhost:3000 npm run test:e2e
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { WebDriver, By } from 'selenium-webdriver'
import { createDriver, navigateTo, waitForUrl, elementExists, getElementText } from './selenium-helpers'
import { ConsultationsPage } from './page-objects/consultations.page'

const E2E_ENABLED = !!process.env.E2E_BASE_URL
const describeE2E = E2E_ENABLED ? describe : describe.skip

describeE2E('Consultation Management E2E Tests', () => {
  let driver: WebDriver
  let consultationsPage: ConsultationsPage

  beforeAll(async () => {
    driver = await createDriver()
    consultationsPage = new ConsultationsPage(driver)
  })

  afterAll(async () => {
    if (driver) await driver.quit()
  })

  describe('Consultations List Page', () => {
    it('should redirect unauthenticated users to login', async () => {
      await navigateTo(driver, '/consultations')
      await waitForUrl(driver, '/login', 10000)
      const currentUrl = await driver.getCurrentUrl()
      expect(currentUrl).toContain('/login')
    })
  })

  describe('Consultations List (when authenticated)', () => {
    it('should have the "Consultations" heading', async () => {
      await consultationsPage.navigate()
      const title = await consultationsPage.getPageTitle()
      expect(title).toContain('Consultations')
    })

    it('should have a "New Consultation" button', async () => {
      await consultationsPage.navigate()
      expect(await consultationsPage.hasNewConsultationButton()).toBe(true)
    })

    it('should have a status filter dropdown', async () => {
      await consultationsPage.navigate()
      expect(await consultationsPage.hasStatusFilter()).toBe(true)
    })

    it('should have the status filter with "All statuses" option', async () => {
      await consultationsPage.navigate()
      const select = await driver.findElement(By.css('select'))
      const options = await select.findElements(By.css('option'))
      const optionTexts = await Promise.all(options.map(o => o.getText()))
      expect(optionTexts).toContain('All statuses')
    })

    it('should have DRAFT and COMPLETED status filter options', async () => {
      await consultationsPage.navigate()
      const select = await driver.findElement(By.css('select'))
      const options = await select.findElements(By.css('option'))
      const optionValues = await Promise.all(options.map(o => o.getAttribute('value')))
      expect(optionValues).toContain('DRAFT')
      expect(optionValues).toContain('COMPLETED')
    })

    it('should have new consultation button linking to /consultations/new', async () => {
      await consultationsPage.navigate()
      const link = await driver.findElement(By.linkText('+ New Consultation'))
      const href = await link.getAttribute('href')
      expect(href).toContain('/consultations/new')
    })

    it('should show empty state when no consultations exist', async () => {
      await consultationsPage.navigate()
      const pageSource = await driver.getPageSource()
      // Check for either empty state message or empty table
      const hasEmptyState = pageSource.includes('No consultations') ||
        pageSource.includes('first consultation') ||
        (await consultationsPage.getConsultationCount()) === 0
      expect(hasEmptyState).toBe(true)
    })
  })
})
