const run = async () => {
    const result = await require('./parse-tweet.js')('ogatatei', '1091511648244850689', {
        headless: false,
        proxy: 'socks5'
    })
    console.log(result)
}
run()
