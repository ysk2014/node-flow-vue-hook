export function promisify(fn, context) {
    let promise;
    if (fn.length === 2) {
        // fn(context, callback)
        promise = new Promise(resolve => {
            fn(context, function(err, data) {
                if (err) {
                    context.error(err);
                }
                data = data || {};
                resolve(data);
            });
        });
    } else {
        promise = fn(context);
    }
    if (
        !promise ||
        (!(promise instanceof Promise) && typeof promise.then !== "function")
    ) {
        promise = Promise.resolve(promise);
    }
    return promise;
}

const noopData = () => ({});

export function applyAsyncData(Component, asyncData) {
    const ComponentData = Component.data || noopData;
    // Prevent calling this method for each request on SSR context
    if (!asyncData && Component.hasAsyncData) {
        return;
    }
    Component.hasAsyncData = true;
    Component.data = function() {
        const data = ComponentData.call(this);
        return { ...data, ...asyncData };
    };
    if (Component._Ctor && Component._Ctor[0].options) {
        Component._Ctor[0].options.data = Component.data;
    }
}
