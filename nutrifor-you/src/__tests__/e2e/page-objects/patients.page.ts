import { WebDriver, By } from 'selenium-webdriver'
import {
  navigateTo,
  waitForElement,
  fillInput,
  clickElement,
  getElementText,
  elementExists,
} from '../selenium-helpers'

export class PatientsPage {
  private driver: WebDriver

  private heading = By.css('h1')
  private newPatientButton = By.linkText('+ New Patient')
  private searchInput = By.css(
    'input[placeholder="Search patients by name, email, or phone..."]'
  )
  private patientRows = By.css('tbody tr')
  private tableHeaders = By.css('thead th')

  constructor(driver: WebDriver) {
    this.driver = driver
  }

  async navigate(): Promise<void> {
    await navigateTo(this.driver, '/patients')
  }

  async clickNewPatient(): Promise<void> {
    await clickElement(this.driver, this.newPatientButton)
  }

  async searchPatients(query: string): Promise<void> {
    await fillInput(this.driver, this.searchInput, query)
  }

  async getPatientCount(): Promise<number> {
    try {
      const rows = await this.driver.findElements(this.patientRows)
      return rows.length
    } catch {
      return 0
    }
  }

  async isDisplayed(): Promise<boolean> {
    return elementExists(this.driver, this.heading)
  }

  async getHeadingText(): Promise<string> {
    return getElementText(this.driver, this.heading)
  }

  async newPatientButtonExists(): Promise<boolean> {
    return elementExists(this.driver, this.newPatientButton)
  }

  async searchInputExists(): Promise<boolean> {
    return elementExists(this.driver, this.searchInput)
  }

  async getTableHeaders(): Promise<string[]> {
    const headers = await this.driver.findElements(this.tableHeaders)
    return Promise.all(headers.map((h) => h.getText()))
  }
}

export class NewPatientPage {
  private driver: WebDriver

  private heading = By.css('h1')
  private backLink = By.linkText('← Back to patients')
  private firstNameInput = By.id('firstName')
  private lastNameInput = By.id('lastName')
  private emailInput = By.id('email')
  private phoneInput = By.id('phone')
  private dateOfBirthInput = By.id('dateOfBirth')
  private genderSelect = By.id('gender')
  private heightInput = By.id('height')
  private weightInput = By.id('weight')
  private targetWeightInput = By.id('targetWeight')
  private goalsTextarea = By.id('goals')
  private medicalHistoryTextarea = By.id('medicalHistory')
  private submitButton = By.css('button[type="submit"]')
  private cancelLink = By.linkText('Cancel')

  constructor(driver: WebDriver) {
    this.driver = driver
  }

  async navigate(): Promise<void> {
    await navigateTo(this.driver, '/patients/new')
  }

  async isDisplayed(): Promise<boolean> {
    return elementExists(this.driver, this.heading)
  }

  async getHeadingText(): Promise<string> {
    return getElementText(this.driver, this.heading)
  }

  async backLinkExists(): Promise<boolean> {
    return elementExists(this.driver, this.backLink)
  }

  async firstNameInputExists(): Promise<boolean> {
    return elementExists(this.driver, this.firstNameInput)
  }

  async lastNameInputExists(): Promise<boolean> {
    return elementExists(this.driver, this.lastNameInput)
  }

  async emailInputExists(): Promise<boolean> {
    return elementExists(this.driver, this.emailInput)
  }

  async phoneInputExists(): Promise<boolean> {
    return elementExists(this.driver, this.phoneInput)
  }

  async dateOfBirthInputExists(): Promise<boolean> {
    return elementExists(this.driver, this.dateOfBirthInput)
  }

  async genderSelectExists(): Promise<boolean> {
    return elementExists(this.driver, this.genderSelect)
  }

  async heightInputExists(): Promise<boolean> {
    return elementExists(this.driver, this.heightInput)
  }

  async weightInputExists(): Promise<boolean> {
    return elementExists(this.driver, this.weightInput)
  }

  async targetWeightInputExists(): Promise<boolean> {
    return elementExists(this.driver, this.targetWeightInput)
  }

  async goalsTextareaExists(): Promise<boolean> {
    return elementExists(this.driver, this.goalsTextarea)
  }

  async medicalHistoryTextareaExists(): Promise<boolean> {
    return elementExists(this.driver, this.medicalHistoryTextarea)
  }

  async submitButtonExists(): Promise<boolean> {
    return elementExists(this.driver, this.submitButton)
  }

  async cancelLinkExists(): Promise<boolean> {
    return elementExists(this.driver, this.cancelLink)
  }

  async getSubmitButtonText(): Promise<string> {
    return getElementText(this.driver, this.submitButton)
  }
}
