import { DependencyList, useContext, useEffect, useState } from 'https://esm.sh/react'
import { RouterContext } from './context.ts'
import { AsyncUseDenoError } from './error.ts'
import events from './events.ts'

export function useRouter() {
    return useContext(RouterContext)
}

export function useDeno<T = any>(callback: () => (T | Promise<T>), browser?: boolean, deps?: DependencyList) {
    const id = arguments[3] // generated by compiler
    const { pathname, query } = useRouter()
    const [data, setDate] = useState<T>(() => {
        const global = window as any
        const { _useDenoAsyncData: asyncData } = global
        const useDenoUrl = `useDeno://${pathname}?${query.toString()}`
        const key = `${useDenoUrl}#${id}`
        if (asyncData && key in asyncData) {
            return asyncData[key]
        } else if (typeof Deno !== 'undefined' && Deno.version.deno) {
            const ret = callback()
            if (ret instanceof Promise) {
                events.emit(useDenoUrl, id, ret.then(data => {
                    if (asyncData) {
                        asyncData[key] = data
                    }
                    events.emit(useDenoUrl, id, data)
                }), true)
                throw new AsyncUseDenoError('async useDeno')
            } else {
                if (asyncData) {
                    asyncData[key] = ret
                }
                events.emit(useDenoUrl, id, ret)
                return ret
            }
        }
        return global[key] || null
    })

    useEffect(() => {
        if (browser) {
            const ret = callback()
            if (ret instanceof Promise) {
                ret.then(setDate)
            } else {
                setDate(ret)
            }
        }
    }, deps)

    return data
}
