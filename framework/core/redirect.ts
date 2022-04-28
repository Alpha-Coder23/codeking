import util from "../../lib/util.ts";
import events from "./events.ts";

let routerReady = false;
let preRedirect: URL | null = null;

const onrouterready = (_: Record<string, unknown>) => {
  events.off("routerready", onrouterready);
  if (preRedirect) {
    events.emit("popstate", { type: "popstate", url: preRedirect });
    preRedirect = null;
  }
  routerReady = true;
};
events.on("routerready", onrouterready);

export function redirect(url: string, replace?: boolean) {
  const { location } = window;

  if (!util.isFilledString(url)) {
    return;
  }

  if (util.isLikelyHttpURL(url) || url.startsWith("file://") || url.startsWith("mailto:") || url.startsWith("data:")) {
    location.href = url;
    return;
  }

  const to = new URL(url, location.href);
  if (to.href === location.href) {
    return;
  }

  if (replace) {
    history.replaceState(null, "", to);
  } else {
    history.pushState(null, "", to);
  }

  if (routerReady) {
    events.emit("popstate", { type: "popstate", url: to });
  } else {
    preRedirect = to;
  }
}
