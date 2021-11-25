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

      const { height } = await post.boundingBox()
      await page.mouse.wheel({ deltaY: height })

      const [author, refAuthor, adLink] = await Promise.all([
        post.$("h4"),
        post.$("h5"),
        post.$('a[aria-label="Sponsored"]')
      ])

      if ((author || refAuthor) && !adLink) {
        await post.$('div[aria-label="Like"]')
        // .then(likeButton => likeButton && likeButton.click())

        await post
          .$('div[aria-label="Leave a comment"]')
          .then(commentButton => commentButton && commentButton.click())

        await page
          .waitForSelector(
            `div[aria-posinset="${postCount}"] div[aria-label="Write a comment"]`
          )
          .then(commentInput => {
            commentInput.type("Hi").then(() => {
              // page.keyboard.press("Enter")
            })
          })
      }

      postCount++

      const loadedPosts = await page.$$('div[role="article"]')

      if (postCount === loadedPosts.length) {
        loadedPosts[loadedPosts.length - 1]
          .$('div[aria-valuetext="Loading..."]')
          .then(async skeleton => {
            // End loop if no more posts are loading after the last post
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
