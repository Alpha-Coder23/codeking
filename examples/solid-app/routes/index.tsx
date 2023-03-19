import { For } from "solid-js";

const externalLinks = [
  ["Get Started", "https://alephjs.org/docs/get-started"],
  ["Docs", "https://alephjs.org/docs"],
  ["Github", "https://github.com/alephjs/aleph.js"],
];

export default function Index() {
  return (
    <div class="screen index">
      <p class="logo">
        <img src="./assets/logo.svg" width="70" height="70" title="Aleph.js" />
        <img src="./assets/solid.svg" width="70" height="70" title="SolidJS" />
      </p>
      <h1>
        The Fullstack Framework in Deno.
      </h1>
      <p>
        <strong>Aleph.js</strong> gives you the best developer experience for building web applications<br />{" "}
        with modern toolings. <label>SolidJS experimental version</label>.
      </p>
      <div class="external-links">
        <For each={externalLinks}>
          {([text, href]) => (
            <a
              href={href}
              target="_blank"
            >
              {text}
            </a>
          )}
        </For>
      </div>
      <nav>
        <a
          role="button"
          href="/todos"
        >
          Todos App Demo
        </a>
      </nav>
    </div>
  );
}
