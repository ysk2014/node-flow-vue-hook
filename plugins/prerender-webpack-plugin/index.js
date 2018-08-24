const ssr = require("./ssr.js");

const PrerenderWebpackPlugin = function VuePrerenderWebpackPlugin(options) {
    this.options = options;
};

PrerenderWebpackPlugin.prototype.apply = function apply(compiler) {
    compiler.plugin("compilation", compilation => {
        compilation.plugin(
            "html-webpack-plugin-before-html-processing",
            (htmlPluginData, callback) => {
                let router = htmlPluginData.plugin.options.router || "/";
                ssr(this.options, htmlPluginData.html, router).then(ref => {
                    htmlPluginData.html = ref.skeletonHtml;
                    callback(null, htmlPluginData);
                    return;
                });
            }
        );
    });
};

module.exports = PrerenderWebpackPlugin;
