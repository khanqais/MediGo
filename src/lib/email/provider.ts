/**
 * Email provider interface and implementations.
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  sendEmail(payload: EmailPayload): Promise<EmailSendResult>;
}

/**
 * Resend API implementation.
 */
export class ResendEmailProvider implements EmailProvider {
  private apiKey: string;
  private defaultFrom: string;

  constructor(apiKey: string, defaultFrom = "MediQuick <care@example.com>") {
    this.apiKey = apiKey;
    this.defaultFrom = defaultFrom;
  }

  async sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: payload.from || this.defaultFrom,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg =
          data?.message ||
          data?.error ||
          `Resend API error with HTTP ${response.status}`;
        return {
          success: false,
          error: errorMsg,
        };
      }

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Network error connecting to Resend",
      };
    }
  }
}

/**
 * Log-only fallback provider when no API key is configured.
 */
export class LogOnlyEmailProvider implements EmailProvider {
  async sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
    const id = `log-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    console.log(
      `[EMAIL_LOG_FALLBACK] Sent email '${payload.subject}' to <${payload.to}> (ID: ${id})`
    );
    return {
      success: true,
      messageId: id,
    };
  }
}

/**
 * Factory to get email provider based on environment.
 */
export function getEmailProvider(overrideKey?: string): EmailProvider {
  const apiKey = overrideKey ?? process.env.RESEND_API_KEY;
  if (apiKey && apiKey.trim().length > 0 && !apiKey.startsWith("re_xxxxxx")) {
    return new ResendEmailProvider(apiKey);
  }
  return new LogOnlyEmailProvider();
}
