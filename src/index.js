import { config } from "dotenv-flow"
import puppeteer from "puppeteer"

config()

const href = "https://web.facebook.com"

/**
 * Replace `undefined` with the link to your page
 * If you wish to run script on the Feed, leave the `undefined`
 *
 * @type {string}
 * @example
 * const fbPage = "https://web.facebook.com/Derek-Oware-104213128257975"; // Run automation on my Facebook page
 * or
 * const fbPage = undefined; // Run automation on Facebook news feed
 */
const fbPage = undefined

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
    await page.click('button[type="submit"]')

    await page.waitForNavigation({ waitUntil: "load" })

    if (fbPage) {
      // Page
      await page.goto(fbPage)
      await page.waitForSelector('div[role="main"]')
    } else {
      // Feed
      await page.waitForSelector('div[role="feed"')
    }

    let scroll = true
    let postCount = 1

    while (scroll) {
      const post = await page.waitForSelector(
        `div[aria-posinset="${postCount}"]`
      )

      const { height } = await post.boundingBox()
      await page.mouse.wheel({ deltaY: height })

      const [pageAuthor, feedAuthor, refAuthor, adLink] = await Promise.all([
        post.$("h3"),
        post.$("h4"),
        post.$("h5"),
        post.$('a[aria-label="Sponsored"]')
      ])

      if ((feedAuthor || pageAuthor || refAuthor) && !adLink) {
        await post
          .$('div[aria-label="Like"]')
          .then(likeButton => likeButton && likeButton.click())

        await post
          .$('div[aria-label="Leave a comment"]')
          .then(commentButton => commentButton && commentButton.click())

        await page
          .waitForSelector(
            `div[aria-posinset="${postCount}"] div[aria-label="Write a comment"]`
          )
          .then(commentInput => {
            commentInput.type("Hi").then(() => {
              page.keyboard.press("Enter")
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
