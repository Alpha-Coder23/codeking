import { serve } from "aleph/server";
import ssr from "aleph/vue-ssr";
import VueLoader from "aleph/vue-loader";

// pre-import route modules
import routeModules from "./routes/_export.ts";

serve({
  baseUrl: import.meta.url,
  routes: "./routes/**/*.{vue,ts}",
  routeModules,
  loaders: [new VueLoader()],
  ssr,
});
