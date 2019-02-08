const fs = require('fs-extra')
const path = require('path')
const tweetShot = require('tweet-shot')

const { dist } = require('../../../koot.config')
const defaultPicDir = path.resolve(__dirname, '../../../', dist, 'public/tweet-pics')

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

    await fs.ensureDir(defaultPicDir)
    await removeOldPics(defaultPicDir)

    return await tweetShot(url, Object.assign({}, options, {
        headless: true,
        dest: defaultPicDir
    })).catch(err => {
        throw err
    })

}

module.exports = downloadTweetAssets
