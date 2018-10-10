let path = require("path");

exports.vendor = {
    enable: true,
    args: {
        name: "vendor",
        minChunks: function(module) {
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
};
