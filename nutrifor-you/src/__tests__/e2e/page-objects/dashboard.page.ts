import { WebDriver, By } from 'selenium-webdriver'
import {
  navigateTo,
  waitForElement,
  getElementText,
  elementExists,
} from '../selenium-helpers'

export class DashboardPage {
  private driver: WebDriver

  private heading = By.css('h1')
  private welcomeMessage = By.css('p.text-gray-600')

  constructor(driver: WebDriver) {
    this.driver = driver
  }

  async navigate(): Promise<void> {
    await navigateTo(this.driver, '/dashboard')
  }

  async isDisplayed(): Promise<boolean> {
    return elementExists(this.driver, this.heading)
  }

  async getPageTitle(): Promise<string> {
    return getElementText(this.driver, this.heading)
  }

  async getWelcomeText(): Promise<string> {
    return getElementText(this.driver, this.welcomeMessage)
  }

  async welcomeMessageExists(): Promise<boolean> {
    return elementExists(this.driver, this.welcomeMessage)
  }
}
