import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  send: vi.fn(async (_payload: { html: string; subject: string }) => ({
    data: { id: "email-1" },
    error: null,
  })),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));

import { POST } from "@/app/api/contact/send-proposal/route";

const validProposal = {
  clientInfo: { company: "테스트<b>회사</b>" },
  purposeAnalysis: { targetAudience: "직장인", purposes: ["인지도 향상"] },
  topStations: [
    {
      rank: 1,
      stationName: "강남",
      lineNumbers: ["2"],
      dailyTraffic: 100000,
      characteristics: "<img src=x onerror=alert(1)>",
    },
  ],
  expectedEffects: ["방문 증가"],
  budgetPlan: {
    inputBudget: "1000만원",
    monthlyEstimate: "800만원",
    recommendation: ["조명광고"],
  },
};

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("https://site.test/api/contact/send-proposal", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/contact/send-proposal", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "test-key";
    mocks.send.mockClear();
  });

  it("다른 Origin에서 온 요청은 403으로 거부하고 발송하지 않는다", async () => {
    const res = await POST(
      makeRequest(
        { proposal: validProposal, email: "a@b.co" },
        { origin: "https://evil.test" },
      ),
    );
    expect(res.status).toBe(403);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("제안서 구조가 잘못되면 400을 반환한다", async () => {
    const res = await POST(
      makeRequest({ proposal: { clientInfo: {} }, email: "a@b.co" }),
    );
    expect(res.status).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("잘못된 이메일 형식은 400을 반환한다", async () => {
    const res = await POST(
      makeRequest({ proposal: validProposal, email: "not-an-email" }),
    );
    expect(res.status).toBe(400);
  });

  it("사용자 입력을 HTML 이스케이프하여 발송한다", async () => {
    const res = await POST(
      makeRequest({ proposal: validProposal, email: "a@b.co" }),
    );
    expect(res.status).toBe(200);

    const payload = mocks.send.mock.calls[0][0] as {
      html: string;
      subject: string;
    };
    expect(payload.html).not.toContain("<b>회사</b>");
    expect(payload.html).toContain("테스트&lt;b&gt;회사&lt;/b&gt;");
    expect(payload.html).not.toContain("<img src=x");
    expect(payload.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("제목의 줄바꿈을 제거해 헤더 주입을 막는다", async () => {
    const proposal = {
      ...validProposal,
      clientInfo: { company: "회사\r\nBcc: x@y.z" },
    };
    await POST(makeRequest({ proposal, email: "a@b.co" }));
    const payload = mocks.send.mock.calls[0][0] as { subject: string };
    expect(payload.subject).not.toMatch(/[\r\n]/);
  });

  it("IP별 발송 횟수를 초과하면 429를 반환한다", async () => {
    const headers = { "x-forwarded-for": "203.0.113.9" };
    let last = 0;
    for (let i = 0; i < 6; i++) {
      last = (
        await POST(
          makeRequest({ proposal: validProposal, email: "a@b.co" }, headers),
        )
      ).status;
    }
    expect(last).toBe(429);
  });
});
