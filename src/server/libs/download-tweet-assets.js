const fs = require('fs-extra')
const path = require('path')
const puppeteer = require('puppeteer')
const glob = require('glob-promise')
const download = require('download')

const { dist } = require('../../../koot.config')

const twitterBaseUrl = `https://mobile.twitter.com/`
const thumbnailUrlStartWith = `https://pbs.twimg.com/media/`
const defaultPicDir = path.resolve(__dirname, '../../../', dist, 'public/tweet-pics')
const defaultViewport = {
    width: 800,
    height: 800,
    deviceScaleFactor: 1
}

const selectorTweetDetail = `article[data-testid="tweetDetail"]:last-of-type`

const removeOldPics = async (dir) => {
    // const timeDelta = 5 * 60 * 1000
    const timeDelta = 5 * 24 * 60 * 60 * 1000
    const now = Date.now()
    const files = (await fs.readdir(dir))
        .map(filename => path.resolve(dir, filename))
        .filter(file => {
            const lstat = fs.lstatSync(file)
            if (lstat.isDirectory())
                return false
            return (now - lstat.ctimeMs > timeDelta)
        })
    for (const file of files) {
        await fs.remove(file)
    }
}

/**
 * 分析推文，截图，下载全尺寸图片
 * @param {String} url 
 * @param {Object} options 
 * @param {Boolean} [options.headless] 
 * @param {String|Boolean} [options.proxy] 
 */
const downloadTweetAssets = async (url, options = {}) => {

    const {
        headless = true,
        proxy = false,
        // proxy = process.env.WEBPACK_BUILD_ENV === 'dev' ? 'socks5' : false,
        dirPics = defaultPicDir
    } = options
    await fs.ensureDir(dirPics)
    await removeOldPics(dirPics)

    // 分析推文URL
    const { userId, tweetId } = await (async () => {
        const fullUrl = /(?:^[a-z][a-z0-9+.-]*:|\/\/)/i.test(url)
            ? new URL(url)
            : new URL(url, twitterBaseUrl)
        // https://twitter.com/pockyfactory/status/1092296548346519552
        const matches = /\/([a-zA-Z0-9-_]+)\/status\/([0-9]+)/.exec(fullUrl.pathname)
        if (!Array.isArray(matches) || matches.length < 2) {
            throw new Error('invalid url input')
        }
        return {
            userId: matches[1],
            tweetId: matches[2]
        }
    })()

    // 检查是否已下载
    const resultFilename = `${userId}-${tweetId}.json`
    const resultPathname = path.resolve(dirPics, resultFilename)
    if (fs.existsSync(resultPathname))
        return await fs.readJSON(resultPathname)

    // 设定基础变量
    const tweetUrl = `https://mobile.twitter.com/${userId}/status/${tweetId}`
    // const url = `https://youtube.com`
    const result = {
        screenshot: `${userId}-${tweetId}_.jpg`,
        assets: []
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

    // 启动 Puppeteer
    const browser = await puppeteer.launch(puppeteerOptions)
    const page = await browser.newPage()
    await page.setDefaultNavigationTimeout(0)
    await page.goto(tweetUrl, {
        waitUntil: 'networkidle0'
    })

    const reject = async (err) => {
        await browser.close()
        throw err
    }

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
        .catch(async err => {
            await reject(new Error('tweet not found or invalid tweet page'))
        })

    // 模拟按下 ESC，尝试关闭可能出现的弹出框
    await page.keyboard.press('Escape')

    // 检查是否包含敏感内容开关
    // 如果有，打开开关
    {
        const $linksSafety = await page.$$('a[href="/settings/safety"]')
        for (const $linkSafety of $linksSafety) {
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
    }

    // 获取缩略图
    const selectorThumbnails = `${selectorTweetDetail} img[src^="${thumbnailUrlStartWith}"]`
    await page.waitForSelector(selectorThumbnails)
        .catch(err => {
            reject(new Error('tweet page parsing failed: no thumbnail found'))
        })
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
    {
        const assets = thumbnails
            .map(thumbnail => {
                const url = new URL(thumbnail)
                // /media/xxxxxxx?format=jpg&name=small
                const matches = /^\/media\/([a-zA-Z0-9_-]+)$/.exec(url.pathname)
                if (!Array.isArray(matches) || matches.length < 2)
                    return undefined
                return {
                    filename: matches[1],
                    format: url.searchParams.format || url.searchParams.get('format') || 'jpg',
                    thumbnail
                }
            })
            .filter(obj => typeof obj === 'object')
        await Promise.all(assets.map(({ filename, format }, index) =>
            new Promise(async (resolve, reject) => {
                const downloadUrl = `${thumbnailUrlStartWith}${filename}.${format}:orig`
                const destFilename = `${userId}-${tweetId}-${filename}.${format}`
                const destPathname = path.resolve(dirPics, destFilename)
                result.assets[index] = {
                    url: downloadUrl,
                    file: false
                }
                await download(
                    downloadUrl,
                    dirPics,
                    {
                        filename: destFilename,
                        proxy: proxy === 'socks5' ? 'socks5://127.0.0.1:1080' : undefined
                    }
                )
                    .catch(err =>
                        reject(`download fail - thumbnail: ${assets[index].thumbnail} | download: ${downloadUrl}`)
                    )
                if (fs.existsSync(destPathname)) {
                    result.assets[index].file = destFilename
                }
                resolve()
            })
        )).catch(async err => await reject(err))
    }

    // 等待缩略图
    await page.evaluate(async ({ selectorThumbnails }) => {
        const thumbnails = document.querySelectorAll(selectorThumbnails)
        if (!thumbnails || !thumbnails.length)
            return true
        await Promise.all(Array.from(thumbnails).map(el =>
            new Promise(resolve => {
                const check = () => {
                    if (el.complete)
                        return resolve()
                    setTimeout(check, 10)
                }
                check()
            })
        ))
    }, { selectorThumbnails })

    // 截图
    {
        const rect = await page.evaluate(({ selectorTweetDetail }) => {
            const elTweet = document.querySelector(selectorTweetDetail)
            // 获取位置
            const { top, left, height, width } = document.querySelector(selectorTweetDetail)
                .getBoundingClientRect()

            // 重置滚动条
            document.documentElement.scrollTop = 0
            document.body.scrollTop = top

            return { top, left, height, width }
        }, { selectorTweetDetail })
        await page.setViewport({
            width: parseInt(rect.width),
            height: parseInt(rect.height),
            deviceScaleFactor: 1
        })
        await page.screenshot({
            path: path.resolve(dirPics, result.screenshot),
            type: 'jpeg',
            quality: 60,
            clip: {
                x: 0,
                y: 0,
                width: rect.width,
                height: rect.height
            }
        })
    }

    // 关闭
    await browser.close()

    // 创建 flag 文件
    await fs.writeJSON(resultPathname, result)

    return result
}

module.exports = downloadTweetAssets
