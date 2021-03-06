import React from 'react'
import { extend } from 'koot'

const PageHome = extend({
    pageinfo: () => ({
        title: __('title')
    }),
    styles: require('./styles.less')
})(
    ({ routeParams, ...props }) => (
        <div {...props}>
            FORM
        </div>
    )
)

export default PageHome
