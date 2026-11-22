import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

describe("App routing", () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

  it("matches a page for / instead of falling back to not found", () => {
    const matches = router.matchRoutes("/");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches all core application routes", () => {
    const routesToTest = [
      "/",
      "/patients",
      "/patients/PAT-0001",
      "/patients/new",
      "/tests",
      "/billing",
      "/billing/new",
      "/billing/LAB-2026-0001",
      "/stock",
      "/reports",
      "/reports/daily-statement",
      "/settings",
      "/help",
    ];

    for (const path of routesToTest) {
      const matches = router.matchRoutes(path);
      expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
    }
  });
});
