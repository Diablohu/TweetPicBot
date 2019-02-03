import koaRouter from 'koa-router'

/** @type {Object} 服务器路由对象 (koa-router) */
export const router = koaRouter()

/** @type {Object} 服务器路由表 */
export default router.routes()


// ----------------------------------------------------------------------------


router.get('/api/json-test', async (ctx) => {
    ctx.set('Access-Control-Allow-Origin', '*')
    ctx.body = {
        "test": "json",
        "current_timestamp": Date.now()
    }
})
