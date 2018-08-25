const path = require("path");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const nodeExternals = require("webpack-node-externals");
let PrerenderWebpackPlugin = require("./plugins/prerender-webpack-plugin");
let rules = require("./config/rules");
let plugins = require("./config/plugins");

module.exports = class VueHook {
    constructor(options = {}) {
        this.options = Object.assign({}, options);

        if (this.options.routes) {
            this.options.routes.forEach(route => {
                let arr = route.split("/").filter(k => k);

                plugins["html_" + arr.join("_")] = {
                    enable: true,
                    type: "client",
                    name: "html-webpack-plugin",
                    withimg: false,
                    args() {
                        return {
                            filename: "./" + arr.join("/") + ".html",
                            template: path.resolve(
                                this.baseDir,
                                this.config.html.template.path
                            ),
                            router: route,
                            inject: true,
                            chunksSortMode: "dependency",
                            minify: {
                                removeComments: true,
                                collapseWhitespace: true,
                                removeAttributeQuotes: true,
                                useShortDoctype: true,
                                removeEmptyAttributes: true,
                                removeStyleLinkTypeAttributes: true,
                                keepClosingSlash: true,
                                minifyJS: true,
                                minifyCSS: true,
                                minifyURLs: true
                            }
                        };
                    }
                };
            });
        }
    }

    apply(builder) {
        builder.on("base-config", config => {
            config.setConfig({
                fallback: "vue-style-loader"
            });

            config.update("resolve.extensions", old => {
                old.push(".vue");
                return old;
            });

            config.update("resolve.alias", old => {
                return Object.assign({}, old, {
                    "@": path.resolve(builder.get("srcDir")),
                    vue$: "vue/dist/vue.esm.js"
                });
            });
        });

        builder.on("merge-rule", config => {
            rules.vue.options = this.vueLoader(config.config);
            config.mergeRule(rules);
        });

        if (builder.options.mode != "vue-prerender") return;

        builder.on("client-config", config => {
            let entry = {
                app: path.join(__dirname, "./template/entry-client.js"),
                vendor: ["vue"].concat(this.options.vendor).filter(v => v)
            };

            if (config.env == "dev") {
                entry.app = [
                    "webpack-hot-middleware/client?name=client&reload=true&timeout=30000".replace(
                        /\/\//g,
                        "/"
                    ),
                    entry.app
                ];
            }

            config.set("entry", entry);
        });

        builder.on("merge-plugin", config => {
            plugins.PrerenderWebpackPlugin = {
                enable: true,
                type: "client",
                env: ["test", "prod"],
                name: PrerenderWebpackPlugin,
                args() {
                    return {
                        config: builder.serverWebpackConfig,
                        webpack: config.webpack
                    };
                }
            };
            config.mergePlugin(plugins);
        });

        builder.on("server-config", config => {
            config.set(
                "entry",
                path.join(__dirname, "./template/entry-server.js")
            );
            config.update("externals", old => {
                old.push(
                    nodeExternals({
                        whitelist: [
                            /es6-promise|\.(?!(?:js|json)$).{1,5}$/i,
                            /\.css$/
                        ]
                    })
                );
                return old;
            });

            config.update("output", old => {
                return Object.assign({}, old, {
                    filename: "server-bundle.js"
                });
            });
        });
    }

    cssLoaders(options) {
        options = options || {};

        const cssLoader = {
            loader: "css-loader",
            options: Object.assign(
                {},
                {
                    sourceMap: options.sourceMap
                },
                options.loaderOptions.css
            )
        };

        var postcssLoader = {
            loader: "postcss-loader",
            options: Object.assign(
                {},
                {
                    useConfigFile: false
                },
                options.loaderOptions.postcss
            )
        };

        function generateLoaders(loader, loaderOptions) {
            const loaders = [cssLoader, postcssLoader];

            if (options.extract && options.imerge) {
                loaders.push({
                    loader: "imerge-loader"
                });
            }

            if (loader) {
                loaders.push({
                    loader: loader + "-loader",
                    options: Object.assign(
                        {},
                        loaderOptions,
                        {
                            sourceMap: options.sourceMap
                        },
                        options.loaderOptions[loader]
                    )
                });
            }

            if (options.extract) {
                return ExtractTextPlugin.extract({
                    use: loaders,
                    fallback: options.fallback
                });
            } else {
                return [options.fallback].concat(loaders);
            }
        }

        return {
            css: generateLoaders(),
            postcss: generateLoaders(),
            less: generateLoaders("less"),
            sass: generateLoaders("sass", { indentedSyntax: true }),
            scss: generateLoaders("sass"),
            stylus: generateLoaders("stylus"),
            styl: generateLoaders("stylus")
        };
    }

    vueLoader({ cssSourceMap, extract, fallback, imerge, loaderOptions }) {
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
            });
        }

        return {
            loaders: Object.assign(
                {},
                {
                    js: {
                        loader: "babel-loader",
                        options: Object.assign({}, loaderOptions.babel)
                    }
                },
                cssLoaders
            ),
            cssSourceMap: cssSourceMap,
            postcss: postcss,
            preserveWhitespace: false,
            transformToRequire: {
                video: "src",
                source: "src",
                img: "src",
                image: "xlink:href"
            }
        };
    }
};
