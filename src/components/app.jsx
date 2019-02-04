import React from 'react'
import { extend } from 'koot'

const App = extend({
    styles: require('./app.less')
})(
    ({ className, children, ...props }) => (
        <div className={className}>
            <Nav className="nav" {...props} />
            <Main className="main" children={children} {...props} />
        </div>
    )
)

const Nav = ({ routeParams, ...props }) => (
    <nav {...props}></nav>
)

const Main = ({ routeParams, ...props }) => (
    <main {...props} />
)

export default App
