import type { Customer, SalesDetail } from "@/types";
import { formatCurrencyJPY } from "@/lib/format";

export type InvoiceExportPayload = {
  customer: Customer;
  targetMonth: string;
  closingDayLabel: string;
  total: number;
  details: SalesDetail[];
};

export function openInvoicePdfPrint() {
  window.print();
}

export function openGmailInvoiceDraft({ customer, targetMonth, closingDayLabel, total }: InvoiceExportPayload) {
  const subject = `${targetMonth} 請求書のご送付`;
  const body = [
    `${customer.billingName} ${customer.storeName} ご担当者様`,
    "",
    "いつもお世話になっております。",
    `${targetMonth}（${closingDayLabel}）分の請求書をお送りします。`,
    `ご請求金額: ${formatCurrencyJPY(total)}`,
    "",
    "ご確認のほど、よろしくお願いいたします。",
    "",
    "JVクリーニング",
  ].join("\n");
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: customer.email,
    su: subject,
    body,
  });
  window.open(`https://mail.google.com/mail/?${params.toString()}`, "_blank", "noopener,noreferrer");
}

export function downloadLineInvoiceImage({ customer, targetMonth, closingDayLabel, total, details }: InvoiceExportPayload) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1600;
  const context = canvas.getContext("2d");
  if (!context) return;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#0f172a";
  context.font = '700 54px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillText("請求書", 88, 120);

  context.font = '400 30px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillStyle = "#475569";
  context.fillText(`${targetMonth} / ${closingDayLabel}`, 88, 172);
  context.fillText("JVクリーニング", 850, 120);

  drawDivider(context, 88, 220, 1024, "#0f172a", 4);

  context.fillStyle = "#0f172a";
  context.font = '700 36px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillText(customer.billingName, 88, 310);
  context.font = '400 28px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillStyle = "#475569";
  context.fillText(customer.storeName, 88, 356);

  context.fillStyle = "#f8fafc";
  roundRect(context, 716, 266, 396, 144, 16);
  context.fill();
  context.fillStyle = "#64748b";
  context.font = '400 28px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillText("ご請求金額", 760, 320);
  context.fillStyle = "#0f172a";
  context.font = '700 46px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillText(formatCurrencyJPY(total), 760, 378);

  drawInvoiceRows(context, details.slice(0, 18), 88, 500);

  context.fillStyle = "#64748b";
  context.font = '400 24px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  const note = details.length > 18 ? `ほか ${details.length - 18} 件。詳細はPDF請求書をご確認ください。` : "詳細はPDF請求書もあわせてご確認ください。";
  context.fillText(note, 88, 1490);

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = buildInvoiceFilename(customer, targetMonth, "line.png");
  link.click();
}

export function buildInvoiceFilename(customer: Customer, targetMonth: string, suffix: string) {
  const safeName = `${customer.customerId}-${customer.storeName}`.replace(/[\\/:*?"<>|]/g, "_");
  return `${targetMonth}_${safeName}_${suffix}`;
}

function drawInvoiceRows(context: CanvasRenderingContext2D, details: SalesDetail[], x: number, y: number) {
  const widths = [190, 430, 150, 100, 160];
  const headers = ["日付", "商品名", "単価", "数量", "金額"];
  context.fillStyle = "#f1f5f9";
  context.fillRect(x, y, widths.reduce((sum, width) => sum + width, 0), 58);
  context.fillStyle = "#334155";
  context.font = '700 24px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';

  let columnX = x;
  headers.forEach((header, index) => {
    context.fillText(header, columnX + 18, y + 38);
    columnX += widths[index];
  });

  context.font = '400 23px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  details.forEach((detail, index) => {
    const rowY = y + 58 + index * 48;
    drawDivider(context, x, rowY, widths.reduce((sum, width) => sum + width, 0), "#e2e8f0", 1);
    context.fillStyle = "#0f172a";
    context.fillText(detail.deliveryDate, x + 18, rowY + 32);
    context.fillText(truncateCanvasText(context, detail.productName, 390), x + widths[0] + 18, rowY + 32);
    context.textAlign = "right";
    context.fillText(formatCurrencyJPY(detail.unitPrice), x + widths[0] + widths[1] + widths[2] - 18, rowY + 32);
    context.fillText(String(detail.quantity), x + widths[0] + widths[1] + widths[2] + widths[3] - 18, rowY + 32);
    context.fillText(formatCurrencyJPY(detail.amount), x + widths.reduce((sum, width) => sum + width, 0) - 18, rowY + 32);
    context.textAlign = "left";
  });
}

function drawDivider(context: CanvasRenderingContext2D, x: number, y: number, width: number, color: string, height: number) {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function truncateCanvasText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (context.measureText(value).width <= maxWidth) return value;
  let next = value;
  while (next.length > 0 && context.measureText(`${next}...`).width > maxWidth) {
    next = next.slice(0, -1);
  }
  return `${next}...`;
}
