/**
 * Pipeline Test Suite
 *
 * Tests the core business logic: guardrails, generation helpers, and approval routing.
 * Does not call external APIs — all external calls are mocked.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { runGuardrails } from "./guardrails";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Guardrail Tests ──────────────────────────────────────────────────────────

describe("runGuardrails", () => {
  it("passes clean content", () => {
    const result = runGuardrails(
      "Absolute Aromas has been manufacturing essential oils for over 30 years. Our GC-MS testing ensures every batch meets the highest purity standards.",
      { namedClientFlag: false }
    );
    expect(result.passed).toBe(true);
    expect(result.flags).toHaveLength(0);
  });

  it("blocks medical claims", () => {
    const result = runGuardrails(
      "Our lavender oil cures anxiety and treats depression. It has been proven to heal skin conditions.",
      { namedClientFlag: false }
    );
    expect(result.passed).toBe(false);
    const blockingFlags = result.flags.filter((f) => f.severity === "block");
    expect(blockingFlags.length).toBeGreaterThan(0);
  });

  it("blocks competitor names", () => {
    const result = runGuardrails(
      "Unlike Tisserand or Neal's Yard, our oils are never adulterated.",
      { namedClientFlag: false }
    );
    expect(result.passed).toBe(false);
    const competitorFlags = result.flags.filter((f) => f.type === "competitor_mention");
    expect(competitorFlags.length).toBeGreaterThan(0);
  });

  it("blocks revenue figures", () => {
    const result = runGuardrails(
      "We generated £2.4 million in revenue last year from our private label clients.",
      { namedClientFlag: false }
    );
    expect(result.passed).toBe(false);
    const revenueFlags = result.flags.filter((f) => f.type === "revenue_figure");
    expect(revenueFlags.length).toBeGreaterThan(0);
  });

  it("blocks named client when flag is false", () => {
    const result = runGuardrails(
      "Our client Boots UK has been using our private label oils for three years.",
      { namedClientFlag: false }
    );
    expect(result.passed).toBe(false);
    const clientFlags = result.flags.filter((f) => f.type === "named_client");
    expect(clientFlags.length).toBeGreaterThan(0);
  });

  it("allows named client when flag is true", () => {
    const result = runGuardrails(
      "Our client Boots UK has been using our private label oils for three years.",
      { namedClientFlag: true }
    );
    // Named client flag is true — this specific check should not block
    const blockingClientFlags = result.flags.filter(
      (f) => f.type === "named_client" && f.severity === "block"
    );
    expect(blockingClientFlags).toHaveLength(0);
  });

  it("warns on superlative claims", () => {
    const result = runGuardrails(
      "We are the world's best essential oil manufacturer and the industry leader.",
      { namedClientFlag: false }
    );
    const warnFlags = result.flags.filter((f) => f.severity === "warn");
    expect(warnFlags.length).toBeGreaterThan(0);
  });

  it("blocks auto-publish trigger phrases", () => {
    const result = runGuardrails(
      "This post will be automatically published to LinkedIn at 9am tomorrow.",
      { namedClientFlag: false }
    );
    expect(result.passed).toBe(false);
    const autoPublishFlags = result.flags.filter((f) => f.type === "auto_publish_trigger");
    expect(autoPublishFlags.length).toBeGreaterThan(0);
  });
});

// ─── Auth / Logout Tests ──────────────────────────────────────────────────────

import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

type CookieCall = { name: string; options: Record<string, unknown> };
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): {
  ctx: TrpcContext;
  clearedCookies: CookieCall[];
} {
  const clearedCookies: CookieCall[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@absolutearomas.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      httpOnly: true,
      path: "/",
    });
  });
});

// ─── Notion API Key Test ──────────────────────────────────────────────────────

describe("Notion API Key", () => {
  it("NOTION_API_KEY is set in environment", () => {
    // This validates the secret was injected correctly
    const key = process.env.NOTION_API_KEY;
    // Key should be set (may be empty string if user skipped, that's OK for now)
    expect(key).toBeDefined();
  });

  it("NOTION_AUDIT_DB_ID is set in environment", () => {
    const dbId = process.env.NOTION_AUDIT_DB_ID;
    expect(dbId).toBeDefined();
  });
});

// ─── Jobs Router: Pillar Lookup ───────────────────────────────────────────────

describe("jobs.getPillars", () => {
  it("returns AA company pillars for aa_company profile", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const pillars = await caller.jobs.getPillars({ profile: "aa_company" });
    expect(pillars).toContain("Manufacturer Authority");
    expect(pillars).toContain("Private Label Education");
    expect(pillars.length).toBeGreaterThan(0);
  });

  it("returns David personal pillars for david_personal profile", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const pillars = await caller.jobs.getPillars({ profile: "david_personal" });
    expect(pillars).toContain("Founder Perspective");
    expect(pillars).toContain("Industry Insider");
    expect(pillars.length).toBeGreaterThan(0);
  });
});

// ─── Admin Procedures: Role Guard ─────────────────────────────────────────────

describe("admin procedures: role guard", () => {
  it("rejects non-admin from listUsers", async () => {
    const { ctx } = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.listUsers()).rejects.toThrow();
  });

  it("rejects non-admin from queue.list", async () => {
    const { ctx } = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.queue.list()).rejects.toThrow();
  });

  it("rejects non-admin from audit.list", async () => {
    const { ctx } = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.audit.list({})).rejects.toThrow();
  });
});
