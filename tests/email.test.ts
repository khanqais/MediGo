import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ResendEmailProvider,
  LogOnlyEmailProvider,
  getEmailProvider,
  renderOrderConfirmation,
  renderStatusUpdate,
  renderRefundInitiated,
  sendEmailSafely,
  EmailProvider,
} from "../src/lib/email";

describe("Email Templates", () => {
  it("renders order confirmation template correctly", () => {
    const rendered = renderOrderConfirmation({
      id: "12345678-1111-2222-3333-444455556666",
      total_amount: 549,
      items: [
        { name: "Paracetamol 500mg", quantity: 2, price: 50 },
        { name: "Cetirizine 10mg", quantity: 1, price: 40 },
      ],
      delivery_address: "123 MG Road, Bengaluru",
    });

    expect(rendered.subject).toContain("12345678");
    expect(rendered.subject).toContain("Order Confirmed");
    expect(rendered.html).toContain("Paracetamol 500mg x 2");
    expect(rendered.html).toContain("₹549.00");
    expect(rendered.html).toContain("123 MG Road, Bengaluru");
    expect(rendered.text).toContain("Total: ₹549.00");
  });

  const statuses = [
    "PACKED",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
  ] as const;

  statuses.forEach((status) => {
    it(`renders status update template for ${status}`, () => {
      const rendered = renderStatusUpdate(status, {
        id: "abcdef01-2222-3333-4444-555566667777",
        notes: `Note for ${status}`,
      });

      expect(rendered.subject).toContain("ABCDEF01");
      expect(rendered.html.toLowerCase()).toContain(status.replace(/_/g, " ").toLowerCase());
      expect(rendered.html).toContain(`Note for ${status}`);
      expect(rendered.text).toContain(`Note for ${status}`);
    });
  });

  it("renders refund initiated template correctly", () => {
    const rendered = renderRefundInitiated({
      id: "99887766-1111-2222-3333-444455556666",
      amount: 450,
      refundId: "rfnd_test_12345",
    });

    expect(rendered.subject).toContain("Refund Initiated");
    expect(rendered.subject).toContain("99887766");
    expect(rendered.html).toContain("₹450.00");
    expect(rendered.html).toContain("rfnd_test_12345");
    expect(rendered.text).toContain("rfnd_test_12345");
  });
});

describe("Email Providers", () => {
  const originalEnv = process.env.RESEND_API_KEY;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalEnv;
    }
    vi.restoreAllMocks();
  });

  it("LogOnlyEmailProvider logs email and returns success", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const provider = new LogOnlyEmailProvider();
    const result = await provider.sendEmail({
      to: "patient@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      text: "Hello",
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toMatch(/^log-/);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[EMAIL_LOG_FALLBACK]")
    );
  });

  it("ResendEmailProvider sends payload to Resend API and handles success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "resend_msg_123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new ResendEmailProvider("re_valid_key_123");
    const result = await provider.sendEmail({
      to: "user@example.com",
      subject: "Invoice",
      html: "<p>Bill</p>",
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("resend_msg_123");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer re_valid_key_123",
        }),
      })
    );
  });

  it("ResendEmailProvider handles API error response gracefully", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: "Domain not verified" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new ResendEmailProvider("re_bad_key");
    const result = await provider.sendEmail({
      to: "user@example.com",
      subject: "Invoice",
      html: "<p>Bill</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Domain not verified");
  });

  it("ResendEmailProvider catches network exception", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Connection refused"))
    );

    const provider = new ResendEmailProvider("re_test_key");
    const result = await provider.sendEmail({
      to: "user@example.com",
      subject: "Invoice",
      html: "<p>Bill</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Connection refused");
  });

  it("getEmailProvider factory selects correct provider", () => {
    delete process.env.RESEND_API_KEY;
    expect(getEmailProvider()).toBeInstanceOf(LogOnlyEmailProvider);

    process.env.RESEND_API_KEY = "re_xxxxxx";
    expect(getEmailProvider()).toBeInstanceOf(LogOnlyEmailProvider);

    process.env.RESEND_API_KEY = "re_live_valid_key_999";
    expect(getEmailProvider()).toBeInstanceOf(ResendEmailProvider);
  });
});

describe("sendEmailSafely & email_events Table Logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records successful send in email_events table without throwing", async () => {
    const insertedEvents: any[] = [];
    const mockAdminClient = {
      from: vi.fn(() => ({
        insert: vi.fn(async (record) => {
          insertedEvents.push(record);
          return { data: [record], error: null };
        }),
      })),
    };

    const mockProvider: EmailProvider = {
      sendEmail: vi.fn().mockResolvedValue({
        success: true,
        messageId: "mock_msg_success_1",
      }),
    };

    const outcome = await sendEmailSafely({
      orderId: "order-111",
      recipient: "customer@example.com",
      template: "order_confirmation",
      subject: "Order Confirmed",
      html: "<p>Thanks</p>",
      provider: mockProvider,
      adminClient: mockAdminClient,
    });

    expect(outcome.success).toBe(true);
    expect(outcome.messageId).toBe("mock_msg_success_1");
    expect(insertedEvents.length).toBe(1);
    expect(insertedEvents[0].status).toBe("SENT");
    expect(insertedEvents[0].recipient).toBe("customer@example.com");
    expect(insertedEvents[0].order_id).toBe("order-111");
  });

  it("NEVER fails caller when provider returns failure and records FAILED status in email_events", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const insertedEvents: any[] = [];
    const mockAdminClient = {
      from: vi.fn(() => ({
        insert: vi.fn(async (record) => {
          insertedEvents.push(record);
          return { data: [record], error: null };
        }),
      })),
    };

    const failingProvider: EmailProvider = {
      sendEmail: vi.fn().mockResolvedValue({
        success: false,
        error: "SMTP 550 Mailbox full",
      }),
    };

    // Caller must not have an uncaught error
    const outcome = await sendEmailSafely({
      orderId: "order-222",
      recipient: "bounced@example.com",
      template: "status_update_SHIPPED",
      subject: "Order Shipped",
      html: "<p>Shipped</p>",
      provider: failingProvider,
      adminClient: mockAdminClient,
    });

    expect(outcome.success).toBe(false);
    expect(outcome.error).toBe("SMTP 550 Mailbox full");
    expect(insertedEvents.length).toBe(1);
    expect(insertedEvents[0].status).toBe("FAILED");
    expect(insertedEvents[0].error_message).toBe("SMTP 550 Mailbox full");
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("NEVER fails caller even when email provider throws an unexpected exception", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const insertedEvents: any[] = [];
    const mockAdminClient = {
      from: vi.fn(() => ({
        insert: vi.fn(async (record) => {
          insertedEvents.push(record);
          return { data: [record], error: null };
        }),
      })),
    };

    const throwingProvider: EmailProvider = {
      sendEmail: vi.fn().mockRejectedValue(new Error("Network socket destroyed")),
    };

    const outcome = await sendEmailSafely({
      orderId: "order-333",
      recipient: "crash@example.com",
      template: "refund_initiated",
      subject: "Refund Initiated",
      html: "<p>Refund</p>",
      provider: throwingProvider,
      adminClient: mockAdminClient,
    });

    expect(outcome.success).toBe(false);
    expect(outcome.error).toContain("Network socket destroyed");
    expect(insertedEvents.length).toBe(1);
    expect(insertedEvents[0].status).toBe("FAILED");
    expect(insertedEvents[0].error_message).toContain("Network socket destroyed");
  });

  it("NEVER fails caller if database insert itself throws", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockAdminClient = {
      from: vi.fn(() => ({
        insert: vi.fn().mockRejectedValue(new Error("Database disconnected")),
      })),
    };

    const throwingProvider: EmailProvider = {
      sendEmail: vi.fn().mockRejectedValue(new Error("Fatal provider error")),
    };

    const outcome = await sendEmailSafely({
      orderId: "order-444",
      recipient: "dbdown@example.com",
      template: "order_confirmation",
      subject: "Order",
      html: "<p>Hi</p>",
      provider: throwingProvider,
      adminClient: mockAdminClient,
    });

    expect(outcome.success).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
