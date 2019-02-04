const parseTweet = require('./parse-tweet')

const run = async () => {
    const options = {
        // headless: false,
        proxy: 'socks5'
    }
    const urls = [
        'https://twitter.com/pockyfactory/status/1092296548346519552',
        'amiamihobbynews/status/1092286251846094849',
        'twitter.com/kamosu_kamosuzo/status/1092022920258322432',
        'mobile.twitter.com/YoshiHon/status/1092266835091705856'
    ]

    for (const url of urls) {
        console.log('')
        console.log(url)
        const result = await parseTweet(url, options)
            .catch(err => console.error(err))
        console.log(result)
        console.log('')
    }
}
run()
