const path = require("path");
const ExtractTextPlugin = require('extract-text-webpack-plugin');
let loader = require("./config/loader");

module.exports = class VueHook {
    constructor(options = {}) {
        
    }

    apply(builder) {
        builder.on("base-config", (base) => {
            base.setConfig({
                fallback: "vue-style-loader"
            });

            base.setExtensions(['.vue']);
            base.setAlias({
                "@": path.resolve(builder.options.srcDir),
                "vue$": "vue/dist/vue.esm.js"
            });
        });

        builder.on("merge-loader", base => {
            loader.vue.options = this.vueLoader(base.config);
            base.mergeLoader(loader);
        });
    }

    cssLoaders(options) {
        options = options || {};

        const cssLoader = {
            loader: 'css-loader',
            options: Object.assign({}, {
                sourceMap: options.sourceMap
            }, options.loaderOptions.css)
        };

        var postcssLoader = {
            loader: 'postcss-loader',
            options: Object.assign({}, {
                useConfigFile: false
            }, options.loaderOptions.postcss)
        }
        
        function generateLoaders (loader, loaderOptions) {
            const loaders = [cssLoader, postcssLoader];

            if (options.extract && options.imerge) {
                loaders.push({
                    loader: 'imerge-loader'
                })
            }

            if (loader) {
                loaders.push({
                    loader: loader + '-loader',
                    options: Object.assign({}, loaderOptions, {
                        sourceMap: options.sourceMap
                    }, options.loaderOptions[loader])
                })
            }
        
            
            if (options.extract) {
                return ExtractTextPlugin.extract({
                    use: loaders,
                    fallback: options.fallback
                })
            } else {
                return [options.fallback].concat(loaders)
            }
        }

        return {
            css: generateLoaders(),
            postcss: generateLoaders(),
            less: generateLoaders('less'),
            sass: generateLoaders('sass', { indentedSyntax: true }),
            scss: generateLoaders('sass'),
            stylus: generateLoaders('stylus'),
            styl: generateLoaders('stylus')
        }
    }

    vueLoader({ cssSourceMap, extract, fallback, imerge, loaderOptions}) {
        let cssLoaders = this.cssLoaders({
            sourceMap: cssSourceMap,
            extract: extract,
            fallback: fallback,
            imerge: imerge,
            loaderOptions: loaderOptions
        });

        
        let postcss = loaderOptions.postcss;
        
        if (typeof loaderOptions.postcss.plugins == "function") {
            postcss = Object.assign({}, loaderOptions.postcss, {
                useConfigFile: false,
                plugins: loaderOptions.postcss.plugins()
            })
        }

        return {
            loaders:  Object.assign({}, {
                js: {
                    loader: 'babel-loader',
                    options: Object.assign({}, loaderOptions.babel)
                }
            }, cssLoaders),
            cssSourceMap: cssSourceMap,
            postcss: postcss,
            preserveWhitespace: false,
            transformToRequire: {
                video: 'src',
                source: 'src',
                img: 'src',
                image: 'xlink:href'
            }
        }
    }
}