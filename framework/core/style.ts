/// <reference lib="dom" />

import util from '../../shared/util.ts'

const styleMap = new Map<string, { css?: string, href?: string }>()
const inDeno = typeof Deno !== 'undefined' && typeof Deno.version?.deno === 'string'

export function removeCSS(url: string, recoverable?: boolean) {
  const { document } = window
  Array.from(document.head.children).forEach(el => {
    if (el.getAttribute('data-module-id') === url) {
      if (recoverable) {
        const tag = el.tagName.toLowerCase()
        if (tag === 'style') {
          styleMap.set(url, { css: el.innerHTML })
        } else if (tag === 'link') {
          const href = el.getAttribute('href')
          if (href) {
            styleMap.set(url, { href })
          }
        }
      }
      document.head.removeChild(el)
    }
  })
}

export function recoverCSS(url: string) {
  if (styleMap.has(url)) {
    applyCSS(url, styleMap.get(url)!)
  }
}

export function applyCSS(url: string, { css, href }: { css?: string, href?: string }) {
  if (!inDeno) {
    const { document } = window as any
    const ssr = Array.from<any>(document.head.children).find((el: any) => {
      return el.getAttribute('data-module-id') === url && el.hasAttribute('ssr')
    })
    if (ssr) {
      // apply the css at next time
      ssr.removeAttribute('ssr')
    } else {
      const prevEls = Array.from(document.head.children).filter((el: any) => {
        return el.getAttribute('data-module-id') === url
      })
      let el: any
      if (util.isFilledString(css)) {
        el = document.createElement('style')
        el.type = 'text/css'
        el.appendChild(document.createTextNode(css))
      } else if (util.isFilledString(href)) {
        el = document.createElement('link')
        el.rel = 'stylesheet'
        el.href = href
      } else {
        throw new Error('applyCSS: missing css')
      }
      el.setAttribute('data-module-id', url)
      document.head.appendChild(el)
      if (prevEls.length > 0) {
        prevEls.forEach(el => document.head.removeChild(el))
      }
    }
  }
}
