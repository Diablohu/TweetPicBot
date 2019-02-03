const run = async () => {
    const options = {
        headless: false,
        proxy: 'socks5'
    }
    console.log(await require('./parse-tweet.js')(
        'ogatatei', '1091511648244850689', options
    ))
    console.log(await require('./parse-tweet.js')(
        'yochris72', '1092055434234458112', options
    ))
    console.log(await require('./parse-tweet.js')(
        'Diablohu', '1090874382841307136', options
    ))
}
run()
