const path = require("path");
const createBundleRenderer = require("vue-server-renderer")
    .createBundleRenderer;
const MFS = require("memory-fs");

module.exports = ({ config, webpack }, htmlTemp, router) => {
    return new Promise((resolve, reject) => {
        const template = htmlTemp;
        const compiler = webpack(config);
        const mfs = new MFS();
        compiler.outputFileSystem = mfs;

        const watching = compiler.watch({}, (err, stats) => {
            if (err) {
                console.log(err);
                reject(err);
                watching.close();
                return;
            }

            stats = stats.toJson();
            stats.errors.forEach(function(err) {
                console.error(err);
            });
            stats.warnings.forEach(function(err) {
                console.warn(err);
            });

            let bundle = {
                entry: "server-bundle.js",
                files: {},
                maps: {}
            };

            mfs.readdirSync(compiler.outputPath).forEach(name => {
                if (name.match(/\.js$/)) {
                    bundle.files[name] = mfs.readFileSync(
                        path.join(compiler.outputPath, name),
                        "utf-8"
                    );
                } else if (name.match(/\.js\.map$/)) {
                    bundle.maps[name.replace(/\.map$/, "")] = JSON.parse(
                        mfs.readFileSync(
                            path.join(compiler.outputPath, name),
                            "utf-8"
                        )
                    );
                }
            });

            const renderer = createBundleRenderer(bundle, {
                template
            });

            renderer.renderToString(
                {
                    url: router
                },
                function(err, skeletonHtml) {
                    if (err) {
                        console.log(err);
                        reject(err);
                    } else {
                        resolve({
                            skeletonHtml
                        });
                    }
                    watching.close();
                }
            );
        });
    });
};
