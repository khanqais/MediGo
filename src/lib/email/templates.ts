/**
 * Transactional email HTML and plain text templates.
 */

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface OrderItemSummary {
  name: string;
  quantity: number;
  price: number;
}

export interface OrderConfirmationData {
  id: string;
  total_amount: number;
  items?: OrderItemSummary[];
  delivery_address?: string;
}

export function renderOrderConfirmation(data: OrderConfirmationData): RenderedEmail {
  const shortId = data.id.slice(0, 8).toUpperCase();
  const subject = `Order Confirmed - #${shortId} | MediQuick`;

  const itemsListHtml = (data.items || [])
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${item.name} x ${item.quantity}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const itemsListText = (data.items || [])
    .map((item) => `- ${item.name} x ${item.quantity}: ₹${(item.price * item.quantity).toFixed(2)}`)
    .join("\n");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
      <h2 style="color: #0f766e; margin-bottom: 8px;">Order Confirmed!</h2>
      <p style="font-size: 16px; margin-top: 0;">Thank you for ordering with MediQuick. Your order <strong>#${shortId}</strong> has been received and is being processed by our pharmacy team.</p>
      
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <h4 style="margin: 0 0 12px 0; color: #334155;">Order Summary</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${itemsListHtml || "<tr><td>Items included in your order</td></tr>"}
          <tr>
            <td style="padding: 12px 0 0 0; font-weight: bold;">Total Amount</td>
            <td style="padding: 12px 0 0 0; font-weight: bold; text-align: right; color: #0f766e;">₹${Number(data.total_amount).toFixed(2)}</td>
          </tr>
        </table>
      </div>

      ${data.delivery_address ? `<p style="font-size: 13px; color: #64748b;">Delivering to: ${data.delivery_address}</p>` : ""}

      <p style="font-size: 14px; color: #475569; margin-top: 24px;">You can view and track your order anytime from your <a href="http://localhost:3000/orders/${data.id}" style="color: #0f766e;">MediQuick Account</a>.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8;">MediQuick Pharmacy • Licensed under the Drugs and Cosmetics Act • Care contact: care@example.com</p>
    </div>
  `.trim();

  const text = `
Order Confirmed! - #${shortId}

Thank you for your order with MediQuick.
Order ID: #${shortId}
Total: ₹${Number(data.total_amount).toFixed(2)}

Items:
${itemsListText || "Items listed in your account"}

Track your order: http://localhost:3000/orders/${data.id}
  `.trim();

  return { subject, html, text };
}

export type SupportedOrderStatus =
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

const STATUS_MESSAGES: Record<SupportedOrderStatus, { title: string; desc: string; color: string }> = {
  PACKED: {
    title: "Order Packed & Verified",
    desc: "Your medicines have been safely packed and checked by our verified pharmacist.",
    color: "#0284c7",
  },
  SHIPPED: {
    title: "Order Shipped",
    desc: "Your order is on the way via our trusted courier partner.",
    color: "#4f46e5",
  },
  OUT_FOR_DELIVERY: {
    title: "Out for Delivery",
    desc: "Our delivery partner is in your area and your medicines will arrive shortly.",
    color: "#0d9488",
  },
  DELIVERED: {
    title: "Order Delivered",
    desc: "Your order has been safely delivered. We hope you feel better soon!",
    color: "#16a34a",
  },
  CANCELLED: {
    title: "Order Cancelled",
    desc: "Your order has been cancelled. Any reserved stock has been returned to pharmacy inventory.",
    color: "#dc2626",
  },
};

export interface StatusUpdateData {
  id: string;
  notes?: string;
  total_amount?: number;
}

export function renderStatusUpdate(
  status: SupportedOrderStatus,
  data: StatusUpdateData
): RenderedEmail {
  const shortId = data.id.slice(0, 8).toUpperCase();
  const info = STATUS_MESSAGES[status];
  const subject = `Order #${shortId} - ${info.title} | MediQuick`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
      <h2 style="color: ${info.color}; margin-bottom: 8px;">${info.title}</h2>
      <p style="font-size: 15px; line-height: 1.5;">${info.desc}</p>
      
      <div style="background-color: #f8fafc; border-left: 4px solid ${info.color}; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px;"><strong>Order ID:</strong> #${shortId}</p>
        ${data.notes ? `<p style="margin: 6px 0 0 0; font-size: 13px; color: #475569;">${data.notes}</p>` : ""}
      </div>

      <p style="font-size: 14px; margin-top: 24px;">View live details and status history in your <a href="http://localhost:3000/orders/${data.id}" style="color: #0f766e;">order tracking portal</a>.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8;">MediQuick Pharmacy • Licensed under the Drugs and Cosmetics Act • Care contact: care@example.com</p>
    </div>
  `.trim();

  const text = `
Order #${shortId} - ${info.title}

${info.desc}
${data.notes ? `Details: ${data.notes}\n` : ""}
Track: http://localhost:3000/orders/${data.id}
  `.trim();

  return { subject, html, text };
}

export interface RefundInitiatedData {
  id: string;
  amount: number;
  refundId?: string;
  paymentMethod?: string;
}

export function renderRefundInitiated(data: RefundInitiatedData): RenderedEmail {
  const shortId = data.id.slice(0, 8).toUpperCase();
  const subject = `Refund Initiated - Order #${shortId} | MediQuick`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
      <h2 style="color: #0f766e; margin-bottom: 8px;">Refund Initiated</h2>
      <p style="font-size: 15px; line-height: 1.5;">A refund of <strong>₹${Number(data.amount).toFixed(2)}</strong> has been initiated for cancelled Order <strong>#${shortId}</strong>.</p>
      
      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 14px;"><strong>Refund Amount:</strong> ₹${Number(data.amount).toFixed(2)}</p>
        ${data.refundId ? `<p style="margin: 6px 0 0 0; font-size: 13px; color: #475569;"><strong>Gateway Refund ID:</strong> ${data.refundId}</p>` : ""}
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #475569;">Bank turnaround: 5–7 business days depending on your bank / UPI provider.</p>
      </div>

      <p style="font-size: 13px; color: #64748b;">If you do not see the credit after 7 business days, please quote Refund ID to our support at care@example.com.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8;">MediQuick Pharmacy • Licensed under the Drugs and Cosmetics Act</p>
    </div>
  `.trim();

  const text = `
Refund Initiated - Order #${shortId}

A refund of ₹${Number(data.amount).toFixed(2)} has been initiated for Order #${shortId}.
${data.refundId ? `Gateway Refund ID: ${data.refundId}\n` : ""}
Bank turnaround: 5-7 business days.
Questions? Contact care@example.com.
  `.trim();

  return { subject, html, text };
}
