import { createAdminClient } from "@/lib/supabase/server";
import { EmailProvider, EmailPayload, getEmailProvider, LogOnlyEmailProvider } from "./provider";

export interface SendEmailOptions {
  orderId?: string | null;
  recipient: string;
  template: string;
  subject: string;
  html: string;
  text?: string;
  metadata?: Record<string, any>;
  provider?: EmailProvider;
  adminClient?: any;
}

export interface SendEmailOutcome {
  success: boolean;
  messageId?: string;
  error?: string;
  loggedOnly?: boolean;
}

/**
 * Send an email notification safely.
 * GUARANTEE: Never throws or fails the caller. Failures are logged to console
 * and recorded into the `email_events` database table.
 */
export async function sendEmailSafely(
  options: SendEmailOptions
): Promise<SendEmailOutcome> {
  const {
    orderId,
    recipient,
    template,
    subject,
    html,
    text,
    metadata = {},
    provider: explicitProvider,
    adminClient: explicitAdminClient,
  } = options;

  let outcome: SendEmailOutcome = { success: false };

  try {
    const provider = explicitProvider ?? getEmailProvider();
    const payload: EmailPayload = {
      to: recipient,
      subject,
      html,
      text,
    };

    const res = await provider.sendEmail(payload);

    if (res.success) {
      const isLogged = provider instanceof LogOnlyEmailProvider;
      outcome = {
        success: true,
        messageId: res.messageId,
        loggedOnly: isLogged,
      };

      await recordEmailEvent({
        orderId,
        recipient,
        template,
        subject,
        status: isLogged ? "LOGGED" : "SENT",
        error_message: null,
        metadata: {
          ...metadata,
          messageId: res.messageId,
          provider: provider.constructor.name,
        },
        adminClient: explicitAdminClient,
      });
    } else {
      const errorMsg = res.error || "Email provider returned failure";
      console.error(
        `[EMAIL_SEND_FAILED] To: ${recipient}, Template: ${template}, Error: ${errorMsg}`
      );
      outcome = { success: false, error: errorMsg };

      await recordEmailEvent({
        orderId,
        recipient,
        template,
        subject,
        status: "FAILED",
        error_message: errorMsg,
        metadata: {
          ...metadata,
          provider: provider.constructor.name,
        },
        adminClient: explicitAdminClient,
      });
    }
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(
      `[EMAIL_SEND_EXCEPTION] To: ${recipient}, Template: ${template}, Exception: ${errorMsg}`
    );
    outcome = { success: false, error: errorMsg };

    try {
      await recordEmailEvent({
        orderId,
        recipient,
        template,
        subject,
        status: "FAILED",
        error_message: errorMsg,
        metadata,
        adminClient: explicitAdminClient,
      });
    } catch (recordErr) {
      console.error("[EMAIL_RECORD_FATAL] Failed to record email_event in DB:", recordErr);
    }
  }

  return outcome;
}

async function recordEmailEvent(event: {
  orderId?: string | null;
  recipient: string;
  template: string;
  subject: string;
  status: "SENT" | "FAILED" | "LOGGED";
  error_message: string | null;
  metadata?: Record<string, any>;
  adminClient?: any;
}) {
  try {
    const admin = event.adminClient ?? createAdminClient();
    const { error } = await admin.from("email_events").insert({
      order_id: event.orderId || null,
      recipient: event.recipient,
      template: event.template,
      subject: event.subject,
      status: event.status,
      error_message: event.error_message,
      metadata: event.metadata || {},
    });

    if (error) {
      console.error("[EMAIL_EVENT_INSERT_ERROR]", error);
    }
  } catch (err) {
    console.error("[EMAIL_EVENT_INSERT_EXCEPTION]", err);
  }
}
