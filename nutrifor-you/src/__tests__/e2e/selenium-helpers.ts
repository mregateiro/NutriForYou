import { Builder, Browser, WebDriver, By, until } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000'

export function getBaseUrl(): string {
  return BASE_URL
}

export async function createDriver(): Promise<WebDriver> {
  const options = new chrome.Options()
  options.addArguments(
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--window-size=1920,1080'
  )

  const service = new chrome.ServiceBuilder('/usr/bin/chromedriver')

  const driver = await new Builder()
    .forBrowser(Browser.CHROME)
    .setChromeOptions(options)
    .setChromeService(service)
    .build()

  await driver.manage().setTimeouts({ implicit: 5000, pageLoad: 15000 })
  return driver
}

export async function navigateTo(
  driver: WebDriver,
  path: string
): Promise<void> {
  await driver.get(`${BASE_URL}${path}`)
}

export async function waitForElement(
  driver: WebDriver,
  locator: By,
  timeout = 10000
) {
  return driver.wait(until.elementLocated(locator), timeout)
}

export async function waitForUrl(
  driver: WebDriver,
  urlPart: string,
  timeout = 10000
): Promise<void> {
  await driver.wait(until.urlContains(urlPart), timeout)
}

export async function fillInput(
  driver: WebDriver,
  locator: By,
  value: string
): Promise<void> {
  const element = await waitForElement(driver, locator)
  await element.clear()
  await element.sendKeys(value)
}

export async function clickElement(
  driver: WebDriver,
  locator: By
): Promise<void> {
  const element = await waitForElement(driver, locator)
  await element.click()
}

export async function getElementText(
  driver: WebDriver,
  locator: By
): Promise<string> {
  const element = await waitForElement(driver, locator)
  return element.getText()
}

export async function elementExists(
  driver: WebDriver,
  locator: By
): Promise<boolean> {
  try {
    await driver.findElement(locator)
    return true
  } catch {
    return false
  }
}

export async function takeScreenshot(
  driver: WebDriver,
  name: string
): Promise<void> {
  const screenshot = await driver.takeScreenshot()
  const fs = await import('fs')
  const path = await import('path')
  const dir = path.join(__dirname, '..', '..', '..', 'test-screenshots')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, `${name}.png`), screenshot, 'base64')
}
