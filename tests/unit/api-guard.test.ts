import { describe, expect, it } from "vitest";
import {
  createRateLimiter,
  escapeHtml,
  getClientKey,
  isSameOrigin,
} from "@/lib/api-guard";

describe("escapeHtml", () => {
  it("HTML 특수문자를 이스케이프한다", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
    expect(escapeHtml("a & b's")).toBe("a &amp; b&#39;s");
  });

  it("null/undefined는 빈 문자열, 숫자는 문자열로 바꾼다", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(3)).toBe("3");
  });
});

describe("isSameOrigin", () => {
  it("Origin이 없으면 통과시킨다 (서버 간 호출)", () => {
    expect(
      isSameOrigin(new Request("https://site.test/api/x", { method: "POST" })),
    ).toBe(true);
  });

  it("Origin이 같은 사이트면 통과, 다르면 거부한다", () => {
    const same = new Request("https://site.test/api/x", {
      method: "POST",
      headers: { origin: "https://site.test" },
    });
    const other = new Request("https://site.test/api/x", {
      method: "POST",
      headers: { origin: "https://evil.test" },
    });
    expect(isSameOrigin(same)).toBe(true);
    expect(isSameOrigin(other)).toBe(false);
  });
});

describe("getClientKey", () => {
  it("x-forwarded-for의 첫 번째 IP를 사용한다", () => {
    const req = new Request("https://site.test", {
      headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" },
    });
    expect(getClientKey(req)).toBe("1.2.3.4");
    expect(getClientKey(new Request("https://site.test"))).toBe("unknown");
  });
});

describe("createRateLimiter", () => {
  it("윈도우 안에서 최대 횟수까지만 허용하고 이후 제한한다", () => {
    const limited = createRateLimiter({ windowMs: 1000, maxRequests: 2 });
    expect(limited("ip-a", 0)).toBe(false);
    expect(limited("ip-a", 100)).toBe(false);
    expect(limited("ip-a", 200)).toBe(true);
  });

  it("윈도우가 지나면 다시 허용하고, 키별로 독립적이다", () => {
    const limited = createRateLimiter({ windowMs: 1000, maxRequests: 1 });
    expect(limited("ip-a", 0)).toBe(false);
    expect(limited("ip-a", 500)).toBe(true);
    expect(limited("ip-b", 500)).toBe(false);
    expect(limited("ip-a", 1500)).toBe(false);
  });

  it("추적 키 수가 상한에 도달하면 새 키를 제한한다", () => {
    const limited = createRateLimiter({
      windowMs: 60_000,
      maxRequests: 5,
      maxKeys: 1,
    });
    expect(limited("ip-a", 0)).toBe(false);
    expect(limited("ip-b", 0)).toBe(true);
  });
});
