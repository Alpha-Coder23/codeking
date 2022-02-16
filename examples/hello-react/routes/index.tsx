import { useData } from "aleph/react";

let count = 0;

export const data = {
  get: (req: Request) => {
    return new Response(JSON.stringify({ count }));
  },
  post: async (req: Request) => {
    const { action } = await req.json();
    if (action === "increase") {
      count++;
    } else if (action === "decrease") {
      count--;
    }
    return new Response(JSON.stringify({ count }));
  },
};

export default function Index() {
  const { data, isLoading, isMutating, mutation } = useData<{ count: number }>();

  return (
    <div className="page">
      <head>
        <title>Hello World - Aleph.js</title>
      </head>
      <p className="logo">
        <img src="/assets/logo.svg" height="60" title="Aleph.js" />
      </p>
      <h1>
        Welcome to use <strong>Aleph.js</strong>!
      </h1>
      <p className="links">
        <a href="https://alephjs.org" target="_blank">Website</a>
        <span></span>
        <a href="https://alephjs.org/docs/get-started" target="_blank">
          Get Started
        </a>
        <span></span>
        <a href="https://alephjs.org/docs" target="_blank">Docs</a>
        <span></span>
        <a href="https://github.com/alephjs/aleph.js" target="_blank">Github</a>
      </p>
      <div className="counter">
        <span>Counter:</span>
        {isLoading && <em>...</em>}
        {!isLoading && <strong>{data?.count}</strong>}
        <button
          disabled={Boolean(isMutating)}
          onClick={() => mutation.post({ action: "decrease" }, true)}
        >
          -
        </button>
        <button
          disabled={Boolean(isMutating)}
          onClick={() => mutation.post({ action: "increase" }, true)}
        >
          +
        </button>
      </div>
      <p className="copyinfo">Built by Aleph.js in Deno</p>
    </div>
  );
}
