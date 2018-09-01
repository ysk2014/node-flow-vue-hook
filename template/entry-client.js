import Vue from "vue";
import root from "@/app";
import { promisify, applyAsyncData } from "./utils";

if (!root.data || typeof root.data != "function") {
    throw new Error(
        "The app.js file must have a data method, and the data must be a function"
    );
}

const { app, router, store } = root.data();

let ssrData = window.__INITIAL_STATE__;

if (ssrData && store) {
    store.replaceState(ssrData);
}

if (router) {
    router.beforeResolve((to, from, next) => {
        let context = {
            _status: {
                redirected: false
            },
            params: to.params,
            query: to.query,
            next: next
        };

        if (store && store.state.SSR_FETCHED) {
            return next();
        }

        const matched = router.getMatchedComponents(to);

        if (!matched.length) {
            return next();
        }

        Promise.all(
            matched.map((Component, index) => {
                if (Component && typeof Component.asyncData === "function") {
                    if (!store && ssrData && ssrData[index]) {
                        applyAsyncData(Component, ssrData[index]);
                        return Promise.resolve(ssrData[index]);
                    } else {
                        return promisify(Component.asyncData, {
                            store,
                            route: to,
                            context
                        }).then(result => {
                            applyAsyncData(Component, result);
                            return result;
                        });
                    }
                } else {
                    return Promise.resolve(null);
                }
            })
        )
            .then(res => {
                if (context._status.redirected) {
                    next(false);
                } else {
                    next();
                }
            })
            .catch(next);
    });
    router.onReady(() => {
        createID();
        app.$mount(root.el || "#app");
        store && Vue.nextTick(() => (store.state.SSR_FETCHED = false));
    });
} else {
    createID();
    app.$mount(root.el || "#app");
}


function createID() {
    let id = root.el.split("#")[1];
    if (document.getElementById(id)) return;

    let el = document.createElement("div");
    el.setAttribute("id", id);
    document.body.appendChild(el);
}