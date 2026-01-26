"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export type PanelState = {
  panel: string;
  panelId?: string;
  params: Record<string, string>;
};

export type PanelParams = Record<string, string | undefined> & { panelId?: string };

type PanelRoutingOptions = {
  router?: AppRouterInstance;
  pathname?: string;
  searchParams?: URLSearchParams;
};

function getSearchParams(options?: PanelRoutingOptions) {
  if (options?.searchParams) return new URLSearchParams(options.searchParams.toString());
  if (typeof window !== "undefined") return new URLSearchParams(window.location.search);
  return new URLSearchParams();
}

function applyUrl(params: URLSearchParams, options?: PanelRoutingOptions) {
  const pathname = options?.pathname || (typeof window !== "undefined" ? window.location.pathname : "/");
  const search = params.toString();
  const nextUrl = search ? `${pathname}?${search}` : pathname;
  if (options?.router) {
    options.router.replace(nextUrl, { scroll: false });
    return;
  }
  if (typeof window !== "undefined") {
    window.history.replaceState({}, "", nextUrl);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

function clearPanelParams(params: URLSearchParams) {
  Array.from(params.keys()).forEach((key) => {
    if (key === "panel" || key === "panelId" || key.startsWith("panel_")) {
      params.delete(key);
    }
  });
}

export function readPanel(searchParams?: URLSearchParams | null): PanelState | null {
  const params = searchParams ?? (typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null);
  if (!params) return null;
  const panel = params.get("panel");
  if (!panel) return null;
  const panelId = params.get("panelId") || undefined;
  const extras: Record<string, string> = {};
  params.forEach((value, key) => {
    if (key.startsWith("panel_")) {
      extras[key.replace("panel_", "")] = value;
    }
  });
  return { panel, panelId, params: extras };
}

export function setPanel(panel: string, params: PanelParams = {}, options?: PanelRoutingOptions) {
  const nextParams = getSearchParams(options);
  clearPanelParams(nextParams);
  nextParams.set("panel", panel);
  if (params.panelId) {
    nextParams.set("panelId", params.panelId);
  }
  Object.entries(params).forEach(([key, value]) => {
    if (key === "panelId") return;
    if (value === undefined || value === null || value === "") return;
    nextParams.set(`panel_${key}`, String(value));
  });
  applyUrl(nextParams, options);
}

export function clearPanel(options?: PanelRoutingOptions) {
  const nextParams = getSearchParams(options);
  clearPanelParams(nextParams);
  applyUrl(nextParams, options);
}
