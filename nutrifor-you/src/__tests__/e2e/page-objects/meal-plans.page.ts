import { WebDriver, By } from 'selenium-webdriver'
import { navigateTo, waitForElement, getElementText, elementExists } from '../selenium-helpers'

export class MealPlansPage {
  constructor(private driver: WebDriver) {}

  private heading = By.css('h1')
  private newMealPlanButton = By.css('a[href*="/meal-plans/generate"], a[href*="/meal-plans/new"]')
  private tableRows = By.css('tbody tr')
  private previousButton = By.xpath("//button[contains(text(), 'Previous')]")
  private nextButton = By.xpath("//button[contains(text(), 'Next')]")

  async navigate(): Promise<void> {
    await navigateTo(this.driver, '/meal-plans')
  }

  async isDisplayed(): Promise<boolean> {
    return elementExists(this.driver, this.heading)
  }

  async getPageTitle(): Promise<string> {
    return getElementText(this.driver, this.heading)
  }

  async hasNewMealPlanButton(): Promise<boolean> {
    return elementExists(this.driver, this.newMealPlanButton)
  }

  async clickNewMealPlan(): Promise<void> {
    const button = await waitForElement(this.driver, this.newMealPlanButton)
    await button.click()
  }

  async getMealPlanCount(): Promise<number> {
    try {
      const rows = await this.driver.findElements(this.tableRows)
      return rows.length
    } catch {
      return 0
    }
  }
}
