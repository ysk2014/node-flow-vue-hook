const ssr = require("./ssr.js");

class PrerenderWebpackPlugin {
    constructor(options) {
        this.options = options;
    }

    apply(compiler) {
        compiler.hooks.compilation.tap("PrerenderWebpackPlugin", (compilation) => {
            compilation.hooks.htmlWebpackPluginBeforeHtmlProcessing.tapAsync("PrerenderWebpackPlugin", (htmlPluginData, callback)=> {
                let router = htmlPluginData.plugin.options.router || "/";
                ssr(this.options, htmlPluginData.html, router).then(ref => {
                    htmlPluginData.html = ref.skeletonHtml;
                    callback(null, htmlPluginData);
                    return;
                });
            })
        })
    }
}

module.exports = PrerenderWebpackPlugin;
