import type { ComponentType } from 'https://esm.sh/react'
import { createElement } from 'https://esm.sh/react'
import { hydrate, render } from 'https://esm.sh/react-dom'
import { reModuleExt } from '../../shared/constants.ts'
import { Route, RouteModule, Routing } from '../core/routing.ts'
import { AlephRoot, importModule } from './root.ts'

export default async function bootstrap({
    baseUrl,
    defaultLocale,
    locales,
    routes,
    preloadModules,
    renderMode
}: {
    baseUrl: string
    defaultLocale: string
    locales: string[]
    routes: Route[]
    preloadModules: RouteModule[],
    renderMode: 'ssr' | 'spa'
}) {
    const { document } = window as any
    const ssrDataEl = document.querySelector('#ssr-data')
    const routing = new Routing(routes, baseUrl, defaultLocale, locales)
    const [url, pageModuleTree] = routing.createRouter()
    const sysComponents: Record<string, ComponentType> = {}
    const pageComponentTree: { url: string, Component?: ComponentType }[] = pageModuleTree.map(({ url }) => ({ url }))

    await Promise.all([...preloadModules, ...pageModuleTree].map(async mod => {
        const { default: C } = await importModule(baseUrl, mod)
        switch (mod.url.replace(reModuleExt, '')) {
            case '/404 ':
                sysComponents['E404'] = C
                break
            case '/app ':
                sysComponents['App'] = C
                break
            default:
                const pc = pageComponentTree.find(pc => pc.url === mod.url)
                if (pc) {
                    pc.Component = C
                }
                break
        }
    }))

    if (ssrDataEl) {
        const ssrData = JSON.parse(ssrDataEl.innerText)
        for (const key in ssrData) {
            Object.assign(window, { [`useDeno://${url.pathname}#${key}`]: ssrData[key] })
        }
    }

    const rootEl = createElement(
        AlephRoot,
        {
            url,
            routing,
            sysComponents,
            pageComponentTree
        }
    )
    const mountPoint = document.querySelector('main')
    if (renderMode === 'ssr') {
        hydrate(rootEl, mountPoint)
    } else {
        render(rootEl, mountPoint)
    }

    // remove ssr head elements, set a timmer to avoid the tab title flash
    setTimeout(() => {
        Array.from(document.head.children).forEach((el: any) => {
            if (el.hasAttribute('ssr') && el.tagName.toLowerCase() !== 'style') {
                document.head.removeChild(el)
            }
        })
    }, 0)
}
