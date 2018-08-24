import root from "@/app";
import { promisify, applyAsyncData } from "./utils";

export default context => {
    return new Promise((resolve, reject) => {
        if (!root.data || typeof root.data != "function") {
            return reject(
                new Error(
                    "The app.js file must have a data method, and the data must be a function"
                )
            );
        }

        const { app, router, store } = root.data();

        context._status = {
            redirected: false,
            error: null,
            serverRendered: true
        };
        if (app.$meta) {
            context.meta = app.$meta();
        }

        let fetch = Components => {
            Promise.all(
                Components.map(Component => {
                    if (
                        Component.asyncData &&
                        typeof Component.asyncData === "function"
                    ) {
                        return promisify(Component.asyncData, {
                            store,
                            route: router ? router.currentRoute : null,
                            context
                        }).then(result => {
                            applyAsyncData(Component, result);
                            return result;
                        });
                    } else {
                        return Promise.resolve(null);
                    }
                })
            )
                .then(results => {
                    if (store) {
                        context.state = store.state;
                        store.state.SSR_FETCHED = true;
                    } else {
                        context.state = results || [];
                    }

                    return resolve(app);
                })
                .catch(reject);
        };

        if (!router) {
            return resolve(app);
        }

        const { params, query } = router.resolve(context.url).route;

        context.params = params;
        context.query = query;

        router.push(context.url);

        router.onReady(() => {
            const matchedComponents = router.getMatchedComponents();

            if (!matchedComponents.length) {
                return reject({ url: "/404" });
            }
            return fetch(matchedComponents);
        }, reject);
    });
};
