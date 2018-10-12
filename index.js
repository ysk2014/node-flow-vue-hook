const path = require("path");
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
            config.mergeRule(rules);
        });

        builder.on("merge-plugin", config => {
            if (builder.options.mode == "vue-prerender") {
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
            }
            config.mergePlugin(plugins);
        });

        if (builder.options.mode != "vue-prerender") return;

        builder.on("client-config", config => {
            let entry = {
                app: path.join(__dirname, "./template/entry-client.js")
            };

            // if (config.env == "dev") {
            //     entry.app = [
            //         "webpack-hot-middleware/client?name=client&reload=true&timeout=30000".replace(
            //             /\/\//g,
            //             "/"
            //         ),
            //         entry.app
            //     ];
            // }

            config.set("entry", entry);
        });

        builder.on("merge-optimization", (config) => {
            config.mergeOptimization({
                splitChunks: {
                    cacheGroups: {
                        vendor: {
                            test: function(module) {
                                // any required modules inside node_modules are extracted to vendor
                                return (
                                    module.resource &&
                                    /\.js$/.test(module.resource) &&
                                    module.resource.indexOf(
                                        path.join(process.cwd(), "./node_modules")
                                    ) === 0 &&
                                    !/node_modules[\/\\]{1}flow\-vue\-hook[\/\\]{1}template[\/\\]{1}/.test(
                                        module.resource
                                    ) &&
                                    !/\.(css|less|scss|sass|styl|stylus|vue)$/.test(module.request)
                                );
                            }
                        }
                    }
                }
            });
        })

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
                            /\.css$/,
                            /\?vue&type=style/
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
};
