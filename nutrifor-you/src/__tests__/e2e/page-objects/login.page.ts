import { WebDriver, By } from 'selenium-webdriver'
import {
  navigateTo,
  waitForElement,
  fillInput,
  clickElement,
  getElementText,
  elementExists,
} from '../selenium-helpers'

export class LoginPage {
  private driver: WebDriver

  private emailInput = By.id('email')
  private passwordInput = By.id('password')
  private submitButton = By.css('button[type="submit"]')
  private errorMessage = By.css('.bg-red-50')
  private registerLink = By.linkText('Create one')
  private forgotPasswordLink = By.linkText('Forgot your password?')
  private heading = By.css('h1')
  private subheading = By.css('h2')

  constructor(driver: WebDriver) {
    this.driver = driver
  }

  async navigate(): Promise<void> {
    await navigateTo(this.driver, '/login')
  }

  async login(email: string, password: string): Promise<void> {
    await fillInput(this.driver, this.emailInput, email)
    await fillInput(this.driver, this.passwordInput, password)
    await clickElement(this.driver, this.submitButton)
  }

  async getErrorMessage(): Promise<string> {
    return getElementText(this.driver, this.errorMessage)
  }

  async clickRegisterLink(): Promise<void> {
    await clickElement(this.driver, this.registerLink)
  }

  async clickForgotPasswordLink(): Promise<void> {
    await clickElement(this.driver, this.forgotPasswordLink)
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

  async emailInputExists(): Promise<boolean> {
    return elementExists(this.driver, this.emailInput)
  }

  async passwordInputExists(): Promise<boolean> {
    return elementExists(this.driver, this.passwordInput)
  }

  async submitButtonExists(): Promise<boolean> {
    return elementExists(this.driver, this.submitButton)
  }

  async registerLinkExists(): Promise<boolean> {
    return elementExists(this.driver, this.registerLink)
  }

  async forgotPasswordLinkExists(): Promise<boolean> {
    return elementExists(this.driver, this.forgotPasswordLink)
  }
}
