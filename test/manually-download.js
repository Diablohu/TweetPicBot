const fs = require('fs-extra')
const path = require('path')
const tweetShot = require('tweet-shot')

const run = async () => {
    const options = {
        // headless: false,
        proxy: 'socks5://127.0.0.1:1080',
        dest: path.resolve(__dirname, '../dist/public/tweet-pics')
    }
    const urls = (await fs.readFile(path.resolve(__dirname, './manually-download.txt'), 'utf-8'))
        .split('\n')
        .filter(url => !!url)

    for (const url of urls) {
        console.log('')
        console.log(url)
        const result = await tweetShot(url, options)
            .catch(err => console.error(err))
        console.log(result)
        console.log('')
    }
}
run()
