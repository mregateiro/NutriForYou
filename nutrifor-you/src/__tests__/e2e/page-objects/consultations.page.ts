import { WebDriver, By } from 'selenium-webdriver'
import { navigateTo, waitForElement, getElementText, elementExists } from '../selenium-helpers'

export class ConsultationsPage {
  constructor(private driver: WebDriver) {}

  private heading = By.css('h1')
  private newConsultationButton = By.linkText('+ New Consultation')
  private statusFilter = By.css('select')
  private tableRows = By.css('tbody tr')
  private previousButton = By.xpath("//button[contains(text(), 'Previous')]")
  private nextButton = By.xpath("//button[contains(text(), 'Next')]")

  async navigate(): Promise<void> {
    await navigateTo(this.driver, '/consultations')
  }

  async isDisplayed(): Promise<boolean> {
    return elementExists(this.driver, this.heading)
  }

  async getPageTitle(): Promise<string> {
    return getElementText(this.driver, this.heading)
  }

  async clickNewConsultation(): Promise<void> {
    const button = await waitForElement(this.driver, this.newConsultationButton)
    await button.click()
  }

  async hasNewConsultationButton(): Promise<boolean> {
    return elementExists(this.driver, this.newConsultationButton)
  }

  async hasStatusFilter(): Promise<boolean> {
    return elementExists(this.driver, this.statusFilter)
  }

  async getConsultationCount(): Promise<number> {
    try {
      const rows = await this.driver.findElements(this.tableRows)
      return rows.length
    } catch {
      return 0
    }
  }

  async hasPagination(): Promise<boolean> {
    return elementExists(this.driver, this.previousButton) && elementExists(this.driver, this.nextButton)
  }
}
