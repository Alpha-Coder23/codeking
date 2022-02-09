import React from 'react'
import { useData } from 'aleph/react'

let count = 0

export const data = {
  get: (req: Request, ctx: Context) => {
    return new Response(JSON.stringify({
      deno: Deno.version.deno,
      count
    }))
  },
  post: async (req: Request, ctx: Context) => {
    const { action } = await req.json()
    if (action === 'increment') {
      count++
    } else if (action === 'decrement') {
      count--
    }
    return new Response(JSON.stringify({
      deno: Deno.version.deno,
      count
    }))
  }
}

export default function Home() {
  const { data, isLoading, isMutating, mutation } = useData<{ count: number, deno: string }>()

  return (
    <div className="page">
      <head>
        <title>Hello World - Aleph.js</title>
        <link rel="stylesheet" href="../style/index.css" />
      </head>
      <p className="logo">
        <img src="/logo.svg" height="75" title="Aleph.js" />
      </p>
      <h1>Welcome to use <strong>Aleph.js</strong>!</h1>
      <p className="links">
        <a href="https://alephjs.org" target="_blank">Website</a>
        <span></span>
        <a href="https://alephjs.org/docs/get-started" target="_blank">Get Started</a>
        <span></span>
        <a href="https://alephjs.org/docs" target="_blank">Docs</a>
        <span></span>
        <a href="https://github.com/alephjs/aleph.js" target="_blank">Github</a>
      </p>
      <div className="counter">
        <span>Counter:</span>
        {isLoading && (
          <em>...</em>
        )}
        {!isLoading && (
          <strong>{data?.count}</strong>
        )}
        <button disabled={!!isMutating} onClick={() => mutation.post({ action: 'decrease' }, true)}>-</button>
        <button disabled={!!isMutating} onClick={() => mutation.post({ action: 'increase' }, true)}>+</button>
      </div>
      <p className="copyinfo">Built by Aleph.js in Deno {data?.deno}</p>
    </div>
  )
}
