/*
 * @Author: Robin LEI
 * @Date: 2022-05-15 16:50:53
 * @LastEditTime: 2025-04-09 11:44:41
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\vue.config.js
 */
'use strict'
const path = require('path')

function resolve(dir) {
    return path.join(__dirname, dir)
}

const name = 'PDF预览' // page title
// If your port is set to 80,
// use administrator privileges to execute the command line.
// For example, Mac: sudo npm run
const port = 8098 // dev port

// All configuration item explanations can be find in https://cli.vuejs.org/config/
module.exports = {
    /**
     * You will need to set publicPath if you plan to deploy your site under a sub path,
     * for example GitHub Pages. If you plan to deploy your site to https://foo.github.io/bar/,
     * then publicPath should be set to "/bar/".
     * In most cases please use '/' !!!
     * Detail: https://cli.vuejs.org/config/#publicpath
     */
    publicPath: '/',
    outputDir: 'dist',
    assetsDir: 'static',
    lintOnSave: false, // 不启用 eslint 检测 process.env.NODE_ENV === 'development',
    productionSourceMap: false,
    devServer: {
        port: port,
        open: true,
        overlay: {
            warnings: false,
            errors: true
        },
    },
    configureWebpack: {
        resolve: {
            alias: {
                '@': resolve('src'),
                'pdfjs-dist': resolve('./node_modules/pdfjs-dist/legacy/build/pdf.js')
            }
        }
    }
}