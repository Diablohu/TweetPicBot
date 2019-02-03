const path = require('path')
const puppeteer = require('puppeteer')

const dirPics = path.resolve(__dirname, '../pics')

const thumbnailUrlStartWith = `https://pbs.twimg.com/media/`
const defaultViewport = {
    width: 800,
    height: 800,
    deviceScaleFactor: 1
}

const selectorTweetDetail = `article[data-testid="tweetDetail"]`

const removeOldPics = async () => {

}

/**
 * 分析推文，截图，下载全尺寸图片
 * @param {String} user 
 * @param {String} tweetId 
 * @param {Object} options 
 * @param {Boolean} [options.headless] 
 * @param {String|Boolean} [options.proxy] 
 */
const parseTweet = async (user, tweetId, options = {}) => {
    await removeOldPics()

    const {
        headless = true,
        proxy = false
    } = options

    const url = `https://mobile.twitter.com/${user}/status/${tweetId}`
    // const url = `https://youtube.com`
    const pics = {
        screenshot: path.resolve(dirPics, `${user}-${tweetId}-shot.jpg`)
    }

    const puppeteerOptions = {
        headless,
        defaultViewport,
        timeout: 0
    }
    if (proxy === 'socks5') {
        if (!Array.isArray(puppeteerOptions.args))
            puppeteerOptions.args = []
        puppeteerOptions.args.push(`--proxy-server=socks5://127.0.0.1:1080`)
        // puppeteerOptions.executablePath = path.resolve('C:/Program Files (x86)/Google/Chrome/Application/chrome.exe')
    }

    const browser = await puppeteer.launch(puppeteerOptions)
    const page = await browser.newPage()
    await page.setDefaultNavigationTimeout(0)
    await page.goto(url, {
        waitUntil: 'networkidle0'
    })

    // 阻止 service-worker
    await page._client.send('ServiceWorker.enable')
    await page._client.send('ServiceWorker.stopAllWorkers')

    // 修改 DOM / 样式
    await page.evaluate(({ selectorTweetDetail }) => {
        document.documentElement.style.overflow = 'hidden'
        document.body.style.overflow = 'hidden'
        // document.querySelectorAll(`${selectorTweetDetail} > div[role="group"]`)[0].style.display = 'none'
        // document.querySelectorAll(`${selectorTweetDetail} > div`)[0].style.display = 'none'
        document.querySelector(`${selectorTweetDetail} > div:last-child`).remove()
        document.querySelector(`${selectorTweetDetail} > div:last-child`).remove()
        document.querySelector('header[role="banner"]').style.display = 'none'
    }, { selectorTweetDetail })

    // 检查是否包含敏感内容开关
    // 如果有，打开开关
    {
        const $linkSafety = await page.$('a[href="/settings/safety"]')
        if ($linkSafety && typeof $linkSafety === 'object') {
            await page.evaluate(() => {
                const buttonParent = document.querySelector('a[href="/settings/safety"]')
                    .parentNode
                    .parentNode
                    .parentNode
                const button = buttonParent.querySelectorAll('div[role="button"]')
                if (button.length) {
                    button[0].click()
                }
            })
        }
    }

    // 获取缩略图
    const selectorThumbnails = `${selectorTweetDetail} img[src^="${thumbnailUrlStartWith}"]`
    await page.waitForSelector(selectorThumbnails)
    const thumbnails = await page.evaluate(({ selectorThumbnails }) => {
        const thumbnails = document.querySelectorAll(selectorThumbnails)
        if (!thumbnails || !thumbnails.length)
            return []
        return Array.from(thumbnails).map(el => el.getAttribute('src'))
    }, { selectorThumbnails })
    if (!thumbnails.length) {
        await browser.close()
        return false
    }

    // 下载全图
    // await Promise.all(thumbnails.map(url => page.waitForRequest(url)))

    // 截图
    const rect = await page.evaluate(({ selectorTweetDetail }) => {
        const { top, left, height, width } = document.querySelector(selectorTweetDetail)
            .getBoundingClientRect()
        return { top, left, height, width }
    }, { selectorTweetDetail })
    await page.setViewport({
        width: parseInt(rect.width),
        height: parseInt(rect.height) + parseInt(rect.top),
        deviceScaleFactor: 1
    })
    await page.screenshot({
        path: pics.screenshot,
        type: 'jpeg',
        quality: 60,
        clip: {
            x: 0,
            y: rect.top,
            width: rect.width,
            height: rect.top + rect.height
        }
    })

    await browser.close()

    return pics
}

module.exports = parseTweet
