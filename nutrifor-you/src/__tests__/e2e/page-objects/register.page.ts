import { WebDriver, By } from 'selenium-webdriver'
import {
  navigateTo,
  waitForElement,
  fillInput,
  clickElement,
  getElementText,
  elementExists,
} from '../selenium-helpers'

export class RegisterPage {
  private driver: WebDriver

  private firstNameInput = By.id('firstName')
  private lastNameInput = By.id('lastName')
  private emailInput = By.id('email')
  private passwordInput = By.id('password')
  private confirmPasswordInput = By.id('confirmPassword')
  private submitButton = By.css('button[type="submit"]')
  private errorMessage = By.css('.bg-red-50')
  private loginLink = By.linkText('Sign in')
  private heading = By.css('h1')
  private subheading = By.css('h2')

  constructor(driver: WebDriver) {
    this.driver = driver
  }

  async navigate(): Promise<void> {
    await navigateTo(this.driver, '/register')
  }

  async register(
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ): Promise<void> {
    await fillInput(this.driver, this.firstNameInput, firstName)
    await fillInput(this.driver, this.lastNameInput, lastName)
    await fillInput(this.driver, this.emailInput, email)
    await fillInput(this.driver, this.passwordInput, password)
    await fillInput(this.driver, this.confirmPasswordInput, password)
    await clickElement(this.driver, this.submitButton)
  }

  async getErrorMessage(): Promise<string> {
    return getElementText(this.driver, this.errorMessage)
  }

  async clickLoginLink(): Promise<void> {
    await clickElement(this.driver, this.loginLink)
  }

  async isDisplayed(): Promise<boolean> {
    return elementExists(this.driver, this.subheading)
  }

  async getHeadingText(): Promise<string> {
    return getElementText(this.driver, this.heading)
  }

  async getSubheadingText(): Promise<string> {
    return getElementText(this.driver, this.subheading)
  }

  async getSubmitButtonText(): Promise<string> {
    return getElementText(this.driver, this.submitButton)
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

  async passwordInputExists(): Promise<boolean> {
    return elementExists(this.driver, this.passwordInput)
  }

  async confirmPasswordInputExists(): Promise<boolean> {
    return elementExists(this.driver, this.confirmPasswordInput)
  }

  async submitButtonExists(): Promise<boolean> {
    return elementExists(this.driver, this.submitButton)
  }

  async loginLinkExists(): Promise<boolean> {
    return elementExists(this.driver, this.loginLink)
  }
}
