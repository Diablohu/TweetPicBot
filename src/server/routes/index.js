import koaRouter from 'koa-router'
import downloadTweetAssets from '../libs/download-tweet-assets'

/** @type {Object} 服务器路由对象 (koa-router) */
export const router = koaRouter()

/** @type {Object} 服务器路由表 */
export default router.routes()


// ----------------------------------------------------------------------------


router.get('/api/tweet-assets', async (ctx) => {

    ctx.set('Access-Control-Allow-Origin', '*')

    if (typeof ctx.query !== 'object' || !ctx.query.url) {
        ctx.status = 500
        ctx.body = "invalid parameter: url"
        return
    }

    let error
    const result = await downloadTweetAssets(ctx.query.url,{
        proxy: __DEV__ ? 'socks5' : undefined
    })
        .catch(err => error = err)

    if (error) {
        ctx.status = 500
        ctx.body = error
        return
    }

    ctx.body = result
})
