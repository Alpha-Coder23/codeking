// Pre-imports router modules for serverless env that doesn't support the dynamic import.
// This module will be updated automaticlly in develoment mode, do NOT edit it manually.

Reflect.set(globalThis, "UNOCSS", await import("@unocss/core"));

import * as $0 from "./index.tsx";

export default {
  "/": $0,
};
