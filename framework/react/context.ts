import { createContext } from "https://esm.sh/react@17.0.2";

export type ContextProps = {
  url: URL;
  dataCache: Map<string, { data?: unknown; dataCacheTtl?: number }>;
  ssrHeadCollection?: string[];
};

export default createContext<ContextProps>({
  url: new URL("http://localhost/"),
  dataCache: new Map(),
});
