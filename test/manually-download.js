const fs = require('fs-extra')
const download = require('../src/server/libs/download-tweet-assets')

const run = async () => {
    const options = {
        // headless: false,
        proxy: 'socks5://127.0.0.1:1080'
    }
    const urls = (await fs.readFile('./manually-download.txt', 'utf-8'))
        .split('\n')
        .filter(url => !!url)

    for (const url of urls) {
        console.log('')
        console.log(url)
        const result = await download(url, options)
            .catch(err => console.error(err))
        console.log(result)
        console.log('')
    }
}
run()
