import React, { ComponentType, useCallback, useEffect, useRef, useState } from 'https://esm.sh/react'
import { DataContext, RouterContext } from './context.ts'
import { E404Page, E501App, E501Page, ErrorBoundary } from './error.ts'
import events from './events.ts'
import type { Routing } from './router.ts'
import type { PageProps, RouteModule, RouterURL } from './types.ts'
import util, { hashShort, reModuleExt } from './util.ts'

export function ALEPH({ initial }: {
    initial: {
        routing: Routing
        url: RouterURL
        staticData: Record<string, any>
        components: Record<string, ComponentType<any>>
        pageProps: PageProps
    }
}) {
    const ref = useRef({ routing: initial.routing })
    const [staticData, setStaticData] = useState(() => initial.staticData)
    const [e404, setE404] = useState(() => {
        const { E404 } = initial.components
        return {
            Component: E404 && util.isLikelyReactComponent(E404) ? E404 : E404Page
        }
    })
    const [app, setApp] = useState(() => {
        const { App } = initial.components
        return {
            Component: App ? (util.isLikelyReactComponent(App) ? App : E501App) : null
        }
    })
    const [page, setPage] = useState<{ url: RouterURL, pageProps: PageProps | null }>(() => {
        const { url, pageProps } = initial
        return { pageProps, url }
    })
    const onpopstate = useCallback(async () => {
        const { routing } = ref.current
        const { baseUrl } = routing
        const [url, pageModuleTree] = routing.createRouter()
        if (url.pagePath !== '') {
            const ctree: { id: string, Component?: ComponentType<any> }[] = pageModuleTree.map(({ id }) => ({ id }))
            const imports = pageModuleTree.map(async mod => {
                const { default: C } = await import(getModuleImportUrl(baseUrl, mod))
                if (mod.asyncDeps) {
                    // import async dependencies
                    for (const dep of mod.asyncDeps) {
                        await import(getModuleImportUrl(baseUrl, { id: dep.url.replace(reModuleExt, '.js'), hash: dep.hash }))
                    }
                }
                const pc = ctree.find(pc => pc.id === mod.id)
                if (pc) {
                    if (util.isLikelyReactComponent(C)) {
                        pc.Component = C
                    } else {
                        pc.Component = E501Page
                    }
                }
            })
            await Promise.all(imports)
            const pageProps: PageProps = {
                Page: ctree[0].Component || (() => null),
                pageProps: {}
            }
            ctree.slice(1).reduce((p, m) => {
                const c: PageProps = {
                    Page: m.Component || (() => null),
                    pageProps: {}
                }
                p.pageProps = c
                return c
            }, pageProps)
            setPage({ url, pageProps })
        } else {
            setPage({ url, pageProps: null })
        }
    }, [ref])

    useEffect(() => {
        window.addEventListener('popstate', onpopstate)
        events.on('popstate', onpopstate)

        return () => {
            window.removeEventListener('popstate', onpopstate)
            events.off('popstate', onpopstate)
        }
    }, [onpopstate])

    useEffect(() => {
        const { routing: { baseUrl } } = ref.current
        const onUpdateData = (data: any) => {
            console.log('[DATA]', data)
            setStaticData(data)
        }
        const onAddModule = async (mod: RouteModule) => {
            switch (mod.id) {
                case '/404.js': {
                    const { default: Component } = await import(getModuleImportUrl(baseUrl, mod, true))
                    if (util.isLikelyReactComponent(Component)) {
                        setE404({ Component })
                    } else {
                        setE404({ Component: E404Page })
                    }
                    break
                }
                case '/app.js': {
                    const { default: Component } = await import(getModuleImportUrl(baseUrl, mod, true))
                    if (util.isLikelyReactComponent(Component)) {
                        setApp({ Component })
                    } else {
                        setApp({ Component: E501App })
                    }
                    break
                }
                case '/data.js': {
                    const { default: data } = await import(getModuleImportUrl(baseUrl, mod, true))
                    console.log('[DATA]', data)
                    setStaticData(data)
                    break
                }
                default: {
                    if (mod.id.startsWith('/pages/')) {
                        const { routing } = ref.current
                        routing.update(mod)
                    }
                    break
                }
            }
        }
        const onRemoveModule = (moduleId: string) => {
            switch (moduleId) {
                case '/404.js':
                    setE404({ Component: E404Page })
                    break
                case '/app.js':
                    setApp({ Component: null })
                    break
                case '/data.js':
                    console.log('[DATA]', {})
                    setStaticData({})
                    break
                default:
                    if (moduleId.startsWith('/pages/')) {
                        const { routing } = ref.current
                        routing.removeRoute(moduleId)
                    }
                    break
            }
        }

        events.on('update-data', onUpdateData)
        events.on('add-module', onAddModule)
        events.on('remove-module', onRemoveModule)

        return () => {
            events.off('update-data', onUpdateData)
            events.off('add-module', onAddModule)
            events.off('remove-module', onRemoveModule)
        }
    }, [ref])

    return (
        React.createElement(
            ErrorBoundary,
            null,
            React.createElement(
                DataContext.Provider,
                { value: staticData },
                React.createElement(
                    RouterContext.Provider,
                    { value: page.url },
                    ...[
                        (page.pageProps && app.Component) && React.createElement(app.Component, page.pageProps),
                        (page.pageProps && !app.Component) && React.createElement(page.pageProps.Page, page.pageProps.pageProps),
                        !page.pageProps && React.createElement(e404.Component)
                    ].filter(Boolean),
                )
            )
        )
    )
}

export async function redirect(url: string, replace?: boolean) {
    const { location, history } = window as any

    if (util.isHttpUrl(url)) {
        location.href = url
        return
    }

    url = util.cleanPath(url)
    if (replace) {
        history.replaceState(null, '', url)
    } else {
        history.pushState(null, '', url)
    }
    events.emit('popstate', { type: 'popstate' })
}

export function getModuleImportUrl(baseUrl: string, mod: RouteModule, forceFetch = false) {
    return util.cleanPath(baseUrl + '/_aleph/' + util.trimSuffix(mod.id, '.js') + `.${mod.hash.slice(0, hashShort)}.js` + (forceFetch ? `?t=${Date.now()}` : ''))
}
