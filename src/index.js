import { config } from "dotenv-flow"
import puppeteer from "puppeteer"

config()
const href = "https://web.facebook.com"

;(async () => {
  try {
    const browser = await puppeteer.launch({
      slowMo: 80,
      headless: false,
      defaultViewport: null
    })
    const page = await browser.newPage()
    page.setDefaultNavigationTimeout(0)
    page.setDefaultTimeout(0)

    await page.goto(href)

    // Login
    await page
      .waitForSelector("#email")
      .then(usernameField => usernameField.type(process.env.EMAIL_OR_PHONE))
    await page.type("#pass", process.env.PASSWORD)
    await page.click("button[type='submit']")

    // Feed
    await page.waitForNavigation({ waitUntil: "load" })
    await page.waitForSelector("div[role='feed'")

    let scroll = true
    let postCount = 1

    while (scroll) {
      const post = await page.waitForSelector(
        `div[aria-posinset="${postCount}"]`
      )

      const [likeButton, commentButton, adLink] = await Promise.all([
        post.$('div[aria-label="Like"]'),
        post.$('div[aria-label="Like"]'),
        post.$('a[aria-label="Sponsored"]')
      ])

      if (likeButton && commentButton && !adLink) {
        await likeButton.click()
        await commentButton.click()

        await page
          .waitForSelector('div[aria-label="Write a comment"]')
          .then(commentInput => {
            commentInput.type("Hi").then(() => {
              page.keyboard.press("Enter")
            })
          })
      }

      postCount++

      const loadedPosts = await page.$$('div[role="article"]')

      if (postCount === loadedPosts.length) {
        loadedPosts
          .at(-1)
          .$('div[aria-valuetext="Loading..."]')
          .then(skeleton => {
            if (!skeleton) {
              scroll = false
            }
          })
      }
    }
  } catch (error) {
    console.log(error)
  }
})()
