import { useCallback, useContext, useEffect, useMemo, useState } from "https://esm.sh/react@17.0.2";
import MainContext from "./context.ts";

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
export type FetchError = { method: HttpMethod; status: number; message: string };
export type DataState<T> = { data?: T; error?: FetchError; isLoading?: boolean; isMutating?: HttpMethod };
export type UpdateStrategy<T> = "none" | "replace" | {
  optimisticUpdate?: (data: T) => T;
  onFailure?: (error: FetchError) => void;
  replace?: boolean;
};

export const useData = <T = unknown>(path?: string): DataState<T> & { mutation: typeof mutation } => {
  const { dataUrl: dataUrlCtx, dataCache } = useContext(MainContext);
  const dataUrl = useMemo(() => path || dataUrlCtx, [path, dataUrlCtx]);
  const [dataStore, setDataStore] = useState<DataState<T>>(() => {
    if (dataCache.has(dataUrl)) {
      const { data, dataCacheTtl } = dataCache.get(dataUrl)!;
      if (!dataCacheTtl || Date.now() < dataCacheTtl) {
        return { data: data as T };
      }
    }
    return {};
  });
  const action = useCallback(async (method: HttpMethod, fetcher: Promise<Response>, update: UpdateStrategy<T>) => {
    const updateIsObject = update && typeof update === "object" && update !== null;
    const optimistic = updateIsObject && typeof update.optimisticUpdate === "function";
    const replace = update === "replace" || (updateIsObject && !!update.replace);

    let rollbackData: T | undefined = undefined;
    if (optimistic) {
      const optimisticUpdate = update.optimisticUpdate!;
      setDataStore((store) => {
        if (store.data !== undefined) {
          rollbackData = store.data;
          return { data: optimisticUpdate(clone(store.data)) };
        }
        return store;
      });
    } else {
      setDataStore(({ data }) => ({ data, isMutating: method }));
    }

    const res = await fetcher;
    if (res.status >= 400) {
      const message = await res.text();
      const error: FetchError = { method, status: res.status, message };
      if (optimistic) {
        setDataStore({ data: rollbackData });
        update.onFailure?.(error);
      } else {
        setDataStore(({ data }) => ({ data, error }));
      }
      return res;
    }

    if (res.status >= 300) {
      const redirectUrl = res.headers.get("Location");
      if (redirectUrl) {
        location.href = redirectUrl;
      } else {
        if (optimistic) {
          setDataStore({ data: rollbackData });
        } else {
          setDataStore(({ data }) => ({ data }));
        }
        return res;
      }
    }

    if (replace && res.ok) {
      try {
        const data = await res.json();
        const cc = res.headers.get("Cache-Control");
        const dataCacheTtl = cc && cc.includes("max-age") ? Date.now() + parseInt(cc.split("=")[1]) * 1000 : undefined;
        setDataStore({ data });
        dataCache.set(dataUrl, { data, dataCacheTtl });
      } catch (err) {
        const error: FetchError = { method, status: 0, message: "Invalid JSON data: " + err.message };
        if (optimistic) {
          setDataStore({ data: rollbackData });
          update.onFailure?.(error);
        } else {
          setDataStore(({ data }) => ({ data, error }));
        }
      }
      return res;
    }

    setDataStore(({ data }) => ({ data }));
    return res;
  }, []);
  const mutation = useMemo(() => {
    return {
      post: (data?: unknown, update?: UpdateStrategy<T>) => {
        return action("post", jsonFetch("post", dataUrl, data), update ?? "none");
      },
      put: (data?: unknown, update?: UpdateStrategy<T>) => {
        return action("put", jsonFetch("put", dataUrl, data), update ?? "none");
      },
      patch: (data?: unknown, update?: UpdateStrategy<T>) => {
        return action("patch", jsonFetch("patch", dataUrl, data), update ?? "none");
      },
      delete: (params?: Record<string, string>, update?: UpdateStrategy<T>) => {
        const url = new URL(dataUrl, globalThis.location?.href);
        if (params) {
          for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
          }
        }
        return action("delete", fetch(url.toString(), { method: "delete", redirect: "manual" }), update ?? "none");
      },
    };
  }, [path, dataUrl]);

  useEffect(() => {
    const now = Date.now();
    if (
      dataUrl &&
      (!dataCache.has(dataUrl) || (dataCache.get(dataUrl)!.dataCacheTtl || now + 1000) < now)
    ) {
      if (!dataCache.has(dataUrl)) {
        setDataStore({ isLoading: true });
      }
      fetch(dataUrl, { headers: { "X-Fetch-Data": "true" } })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            const cc = res.headers.get("Cache-Control");
            const dataCacheTtl = cc && cc.includes("max-age") ? now + parseInt(cc.split("=")[1]) * 1000 : undefined;
            setDataStore({ data });
            dataCache.set(dataUrl, { data, dataCacheTtl });
          } else {
            const message = await res.text();
            setDataStore({ error: { method: "get", status: res.status, message } });
          }
        })
        .catch((err) => {
          setDataStore({ error: { method: "get", status: 0, message: err.message } });
        });
    }
  }, [dataCache, dataUrl]);

  return { ...dataStore, mutation };
};

function jsonFetch(method: string, href: string, data: unknown) {
  return fetch(href, {
    method,
    body: typeof data === "object" ? JSON.stringify(data) : "null",
    redirect: "manual",
    headers: { "Content-Type": "application/json" },
  });
}

function clone<T>(obj: T): T {
  // deno-lint-ignore ban-ts-comment
  // @ts-ignore
  return typeof structuredClone === "function" ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
}
