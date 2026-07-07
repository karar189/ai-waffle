import type { CasperMarketsResponse } from "./types";

async function j<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error ?? res.statusText);
  }
  return data as T;
}

export const marketsApi = {
  list: () =>
    fetch("/api/markets", {
      cache: "no-store",
    }).then(j<CasperMarketsResponse>),
};
