import { gzipEncode } from 'https://deno.land/x/wasm_gzip@v1.0.0/mod.ts'
import log from './log.ts'
import type { ServerRequest } from './std.ts'
import type { APIRequest, APIRequestURL, APIResponse, RouterURL } from './types.ts'

export class AlephAPIRequest implements APIRequest {
    #req: ServerRequest
    #url: APIRequestURL
    #cookies: ReadonlyMap<string, string>

    constructor(req: ServerRequest, url: RouterURL) {
        this.#req = req

        const paramsMap = new Map<string, string>()
        for (const key in url.params) {
            paramsMap.set(key, url.params[key])
        }
        this.#url = {
            pathname: url.pathname,
            params: paramsMap,
            query: url.query,
        }
        this.#cookies = new Map() // todo: parse cookies
    }

    get url(): APIRequestURL {
        return this.#url
    }

    get cookies(): ReadonlyMap<string, string> {
        return this.#cookies
    }

    get method(): string {
        return this.#req.method
    }

    get proto(): string {
        return this.#req.proto
    }

    get protoMinor(): number {
        return this.#req.protoMinor
    }

    get protoMajor(): number {
        return this.#req.protoMajor
    }

    get headers(): Headers {
        return this.#req.headers
    }
}

export class AlephAPIResponse implements APIResponse {
    #req: ServerRequest
    #headers: Headers
    #status: number

    constructor(req: ServerRequest) {
        this.#req = req
        this.#headers = new Headers({
            'Status': '200',
            'Server': 'Aleph.js',
            'Date': (new Date).toUTCString(),
        })
        this.#status = 200
    }

    status(code: number): this {
        this.#headers.set('status', code.toString())
        this.#status = code
        return this
    }

    addHeader(key: string, value: string): this {
        this.#headers.append(key, value)
        return this
    }

    setHeader(key: string, value: string): this {
        this.#headers.set(key, value)
        return this
    }

    removeHeader(key: string): this {
        this.#headers.delete(key)
        return this
    }

    async end(status: number) {
        return this.#req.respond({
            status,
            headers: this.#headers,
        }).catch(err => log.warn('ServerRequest.respond:', err.message))
    }

    async send(data: string | Uint8Array | ArrayBuffer, contentType?: string, gzip = false) {
        let body: Uint8Array
        if (typeof data === 'string') {
            body = new TextEncoder().encode(data)
        } else if (data instanceof ArrayBuffer) {
            body = new Uint8Array(data)
        } else if (data instanceof Uint8Array) {
            body = data
        } else {
            return
        }
        if (contentType) {
            this.#headers.set('Content-Type', contentType)
        }
        if (gzip && this.#req.headers.get('accept-encoding')?.includes('gzip') && body.length > 1024) {
            this.#headers.set('Vary', 'Origin')
            this.#headers.set('Content-Encoding', 'gzip')
            body = gzipEncode(body)
        }
        return this.#req.respond({
            status: this.#status,
            headers: this.#headers,
            body
        }).catch(err => log.warn('ServerRequest.respond:', err.message))
    }

    async json(data: any) {
        this.#headers.set('Content-Type', 'application/json')
        return this.#req.respond({
            status: this.#status,
            headers: this.#headers,
            body: JSON.stringify(data)
        }).catch(err => log.warn('ServerRequest.respond:', err.message))
    }
}
