const run = async () => {
    const options = {
        headless: false,
        proxy: 'socks5'
    }
    console.log(await require('./parse-tweet.js')(
        'https://twitter.com/pockyfactory/status/1092296548346519552', options
    ))
    console.log(await require('./parse-tweet.js')(
        'amiamihobbynews/status/1092286251846094849', options
    ))
    console.log(await require('./parse-tweet.js')(
        'twitter.com/kamosu_kamosuzo/status/1092022920258322432', options
    ))
    console.log(await require('./parse-tweet.js')(
        'mobile.twitter.com/YoshiHon/status/1092266835091705856', options
    ))
}
run()
