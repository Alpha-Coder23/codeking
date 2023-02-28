// Exports router modules for serverless env that doesn't support the dynamic import.
// This module will be updated automaticlly in develoment mode, do NOT edit it manually.
// deno-fmt-ignore-file
// deno-lint-ignore-file
// @ts-nocheck
var c=Object.defineProperty;var i=(e,a)=>{for(var l in a)c(e,l,{get:a[l],enumerable:!0})};var s={};i(s,{default:()=>n});import{ssrAttribute as g}from"solid-js/web";import{ssr as h}from"solid-js/web";import{escape as r}from"solid-js/web";import{ssrHydrationKey as p}from"solid-js/web";import{createComponent as u}from"solid-js/web";import{ssr as m}from"solid-js/web";import{ssrHydrationKey as f}from"solid-js/web";var v=["<header",'><div class="header-wrapper"><h1><a href="/"><svg viewBox="0 0 60 12.09" fill="currentColor"><title>Aleph.js</title><path d="M5.86,6.11c0,.07,0,.18.06.31s0,.28.08.44a4.06,4.06,0,0,1,.07.56q0,.31,0,.6V9.7H4.54V7.86h-3V9.7H0V8a6.71,6.71,0,0,1,.07-1c0-.35.09-.6.13-.76S.26,6,.27,6L1.41,1.89A1.65,1.65,0,0,1,2,1a1.68,1.68,0,0,1,1-.34,1.68,1.68,0,0,1,1,.34,1.7,1.7,0,0,1,.61.88L5.83,6Zm-4.05.17H4.29L3.21,2.35a.16.16,0,0,0-.16-.12.13.13,0,0,0-.15.12Z"></path><path d="M13.57,9.31a2.42,2.42,0,0,1-1.51.51A2.49,2.49,0,0,1,9.57,7.33v-5H7.62V.78h3.52V7.33a.89.89,0,0,0,.27.65.86.86,0,0,0,.65.28.93.93,0,0,0,.59-.21A.9.9,0,0,0,13,7.53L14.46,8A2.46,2.46,0,0,1,13.57,9.31Z"></path><path d="M18.81,2.94a2.38,2.38,0,0,1,1.77.73,2.42,2.42,0,0,1,.73,1.77V7H17.4v.32a1,1,0,0,0,.94.94h.55a.88.88,0,0,0,.58-.21,1,1,0,0,0,.33-.52L21.3,8a2.47,2.47,0,0,1-.89,1.33,2.36,2.36,0,0,1-1.52.52h-.55a2.51,2.51,0,0,1-2.5-2.5V5.44a2.49,2.49,0,0,1,2.5-2.5Zm.94,2.73V5.44a.94.94,0,0,0-.94-.94h-.47a.88.88,0,0,0-.66.28.87.87,0,0,0-.28.66v.23Z"></path><path d="M28.37,3.66a2.45,2.45,0,0,1,.73,1.78V7.32a2.45,2.45,0,0,1-.73,1.77,2.41,2.41,0,0,1-1.78.73h-.08a2.28,2.28,0,0,1-1.33-.42V12H23.62V3.06h1.56v.3a2.28,2.28,0,0,1,1.33-.42h.08A2.44,2.44,0,0,1,28.37,3.66Zm-.84,1.78a.94.94,0,0,0-.94-.94h-.46a.92.92,0,0,0-.66.28.91.91,0,0,0-.29.66V7.32a1,1,0,0,0,.95.94h.46a.94.94,0,0,0,.94-.94Z"></path><path d="M36.07,3.66a2.45,2.45,0,0,1,.73,1.78V9.7H35.24V5.44a1,1,0,0,0-.94-.94h-.47a.9.9,0,0,0-.66.28.87.87,0,0,0-.28.66V9.7H31.32V.78h1.57V3.36a2.26,2.26,0,0,1,1.33-.42h.08A2.44,2.44,0,0,1,36.07,3.66Z"></path><path d="M41,7.48h1.57V9.7H41Z"></path><path d="M51.17,9v.76a2.32,2.32,0,1,1-4-1.65,2.24,2.24,0,0,1,1.65-.67h.75V4.62H47.07V3.06h4.1V7.45H52.6V9ZM48.86,9a.75.75,0,0,0-.76.76.71.71,0,0,0,.22.53.74.74,0,0,0,.54.23.72.72,0,0,0,.53-.23.71.71,0,0,0,.22-.53V9Zm.75-9h1.56V2.23H49.61Z"></path><path d="M56,7.81a.56.56,0,0,0,.17.32.53.53,0,0,0,.34.13h1.41a.51.51,0,0,0,.51-.51c0-.34-.22-.53-.67-.56l-1.11-.12a2.21,2.21,0,0,1-1.45-.66A1.9,1.9,0,0,1,54.65,5a2,2,0,0,1,.6-1.47,2,2,0,0,1,1.46-.6h1.18a2,2,0,0,1,1.27.43,2,2,0,0,1,.74,1.12l-1.5.44a.53.53,0,0,0-.17-.31.52.52,0,0,0-.34-.12H56.71a.49.49,0,0,0-.36.15.48.48,0,0,0-.14.36c0,.3.2.47.63.51L58,5.64a2.22,2.22,0,0,1,1.42.68A2,2,0,0,1,60,7.75a2.08,2.08,0,0,1-2.07,2.07H56.52a2,2,0,0,1-1.27-.44,2.05,2.05,0,0,1-.74-1.11Z"></path></svg></a></h1><nav><a href="https://deno.land/x/aleph"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><title>Deno Land</title><mask id="deno-logo-mask"><circle fill="white" cx="256" cy="256" r="230"></circle></mask><circle fill="currentColor" cx="256" cy="256" r="256"></circle><path mask="url(#deno-logo-mask)" stroke="white" stroke-width="25" stroke-linecap="round" d="M71 319l17-63M107.964 161.095l17-63M36.93 221l17-63M125.964 385l17-63M160.372 486.829l17-63M230 456.329l17-63M206.257 92.587l17-63M326.395 173.004l17-63M452.182 304.693l17-63M409.124 221l17-63M299.027 54.558l17-63M400.624 86.058l17-63"></path><path mask="url(#deno-logo-mask)" fill="white" stroke="currentColor" stroke-width="12" d="M252.225 344.418c-86.65 2.61-144.576-34.5-144.576-94.363 0-61.494 60.33-111.145 138.351-111.145 37.683 0 69.532 10.65 94.392 30.092 21.882 17.113 37.521 40.526 45.519 66.312 2.574 8.301 22.863 83.767 61.112 227.295l1.295 4.86-159.793 74.443-1.101-8.063c-8.85-64.778-16.546-113.338-23.076-145.634-3.237-16.004-6.178-27.96-8.79-35.794-1.227-3.682-2.355-6.361-3.303-7.952a12.56 12.56 0 00-.03-.05z"></path><circle mask="url(#deno-logo-mask)" cx="262" cy="203" r="16"></circle></svg></a><a href="https://github.com/alephjs/aleph.js"><svg viewBox="0 0 1024 1024" fill="currentColor"><title>Github</title><path d="M512-0.001c-282.778 0-512.001 229.581-512.001 512.871 0 226.56 146.688 418.816 350.157 486.606 25.6 4.71 34.919-11.111 34.919-24.73 0-12.134-0.409-44.442-0.666-87.193-142.439 30.976-172.493-68.761-172.493-68.761-23.245-59.29-56.832-75.059-56.832-75.059-46.489-31.744 3.533-31.129 3.533-31.129 51.354 3.584 78.388 52.838 78.388 52.838 45.671 78.336 119.86 55.705 148.992 42.599 4.71-33.126 17.92-55.705 32.563-68.506-113.664-12.954-233.217-56.986-233.217-253.492 0-55.962 19.968-101.785 52.685-137.626-5.274-12.954-22.835-65.126 5.017-135.681 0 0 43.008-13.824 140.8 52.531 38.411-10.894 82.534-17.188 128.116-17.255h0.038c43.52 0.205 87.297 5.888 128.205 17.255 97.741-66.355 140.646-52.583 140.646-52.583 27.955 70.605 10.343 122.778 5.12 135.731 32.768 35.84 52.633 81.664 52.633 137.626 0 197.018-119.757 240.384-233.78 253.082 18.38 15.821 34.714 47.104 34.714 94.977 0 68.506-0.614 123.853-0.614 140.646 0 13.722 9.216 29.696 35.226 24.678 205.067-70.281 349.85-261.406 349.85-486.346 0-0.073 0-0.146 0-0.22v0.012c0-283.29-229.274-512.871-512.001-512.871z"></path></svg></a></nav></div></header>'];function t(){return m(v,f())}var H=["<div",' class="screen index"><p class="logo"><img src="./assets/logo.svg" width="70" height="70" title="Aleph.js"><img src="./assets/solid.svg" width="70" height="70" title="SolidJS"></p><h1>The Fullstack Framework in Deno.</h1><p><strong>Aleph.js</strong> gives you the best developer experience for building web applications<br> with modern toolings. <label>SolidJS experimental version</label>.</p><div class="external-links">','</div><nav><a role="button" href="/todos">Todos App Demo</a></nav></div>'],V=["<a",' target="_blank">',"</a>"],M=[["Get Started","https://alephjs.org/docs/get-started"],["Docs","https://alephjs.org/docs"],["Github","https://github.com/alephjs/aleph.js"]];function n(){return[u(t,{}),h(H,p(),r(M.map(([e,a])=>h(V,p()+g("href",r(a,!0),!1),r(e)))))]}var o={};i(o,{default:()=>d});import{ssr as _}from"solid-js/web";import{ssrHydrationKey as k}from"solid-js/web";import{createComponent as w}from"solid-js/web";var A=["<div",' class="screen"><p><em>WIP</em></p></div>'];function d(){return[w(t,{}),_(A,k())]}var B={"/":s,"/todos":o,depGraph:{"modules":[{"specifier":"./routes/index.tsx","deps":[{"specifier":"./components/Header.tsx"}]},{"specifier":"./routes/todos.tsx","deps":[{"specifier":"./components/Header.tsx"}]},{"specifier":"./components/Header.tsx"}]}};export{B as default};
