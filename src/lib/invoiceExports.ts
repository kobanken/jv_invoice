import type { Customer, SalesDetail } from "@/types";
import { formatCurrencyJPY } from "@/lib/format";

export type InvoiceExportPayload = {
  customer: Customer;
  targetMonth: string;
  closingDayLabel: string;
  total: number;
  details: SalesDetail[];
  dueDate?: string;
  periodLabel?: string;
  notes?: string;
};

export type InvoiceImageKind = "statement" | "invoice";

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

export function downloadLineInvoiceImage(payload: InvoiceExportPayload, kind: InvoiceImageKind = "invoice") {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1600;
  const context = canvas.getContext("2d");
  if (!context) return;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (kind === "statement") {
    drawStatementImage(context, payload);
  } else {
    drawInvoiceImage(context, payload);
  }

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = buildInvoiceFilename(payload.customer, payload.targetMonth, `${kind}.png`);
  link.click();
}

export function downloadLineInvoiceImages(payload: InvoiceExportPayload) {
  downloadLineInvoiceImage(payload, "statement");
  downloadLineInvoiceImage(payload, "invoice");
}

export function buildInvoiceFilename(customer: Customer, targetMonth: string, suffix: string) {
  const safeName = `${customer.customerId}-${customer.storeName}`.replace(/[\\/:*?"<>|]/g, "_");
  return `${targetMonth}_${safeName}_${suffix}`;
}

function drawInvoiceImage(
  context: CanvasRenderingContext2D,
  { customer, targetMonth, closingDayLabel, total, details, dueDate, periodLabel, notes }: InvoiceExportPayload,
) {
  context.font = '400 30px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillStyle = "#475569";
  context.fillText(`${targetMonth} / ${closingDayLabel}`, 88, 172);
  context.fillText("JVクリーニング", 802, 120);
  context.font = '400 22px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillText("〒951-8053 新潟県新潟市中央区川端町2-12", 640, 166);
  if (dueDate) context.fillText(`お支払い期限: ${dueDate}`, 818, 204);

  drawDivider(context, 88, 220, 1024, "#0f172a", 4);

  context.fillStyle = "#0f172a";
  context.font = '700 36px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillText(customer.billingName, 88, 310);
  context.font = '400 28px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillStyle = "#475569";
  context.fillText(customer.storeName, 88, 356);
  if (periodLabel) context.fillText(`対象期間: ${periodLabel}`, 88, 400);

  context.fillStyle = "#0f172a";
  context.font = '700 54px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillText("請求書", 88, 462);
  context.fillStyle = "#f8fafc";
  roundRect(context, 88, 492, 396, 144, 16);
  context.fill();
  context.fillStyle = "#64748b";
  context.font = '400 28px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillText("ご請求金額", 132, 546);
  context.fillStyle = "#0f172a";
  context.font = '700 46px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillText(formatCurrencyJPY(total), 132, 604);

  const visibleDetails = details.slice(0, 12);
  drawInvoiceRows(context, visibleDetails, 88, 710);

  context.fillStyle = "#f8fafc";
  context.fillRect(88, 1360, 1024, 86);
  context.fillStyle = "#334155";
  context.font = '700 24px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillText("備考", 112, 1394);
  context.font = '400 23px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillText(notes || "ご不明点がございましたらお問い合わせください。", 112, 1432);

  context.fillStyle = "#64748b";
  context.font = '400 24px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  const note = details.length > visibleDetails.length ? `ほか ${details.length - visibleDetails.length} 件。詳細はPDF請求書をご確認ください。` : "詳細はPDF請求書もあわせてご確認ください。";
  context.fillText(note, 88, 1490);
}

function drawStatementImage(
  context: CanvasRenderingContext2D,
  { customer, targetMonth, closingDayLabel, total, details, periodLabel }: InvoiceExportPayload,
) {
  context.fillStyle = "#0f172a";
  context.font = '700 54px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillText("請求明細", 88, 120);

  context.font = '400 30px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillStyle = "#475569";
  context.fillText(`${targetMonth} / ${closingDayLabel}`, 88, 172);
  context.fillText("JVクリーニング", 850, 120);
  if (periodLabel) context.fillText(`対象期間: ${periodLabel}`, 640, 172);

  drawDivider(context, 88, 220, 1024, "#0f172a", 4);

  context.fillStyle = "#0f172a";
  context.font = '700 36px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillText(customer.billingName, 88, 310);
  context.font = '400 28px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillStyle = "#475569";
  context.fillText(customer.storeName, 88, 356);

  drawStatementMatrix(context, buildStatementMatrix(details), 88, 430);

  context.fillStyle = "#f8fafc";
  roundRect(context, 716, 1328, 396, 112, 16);
  context.fill();
  context.fillStyle = "#64748b";
  context.font = '400 26px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillText("税込合計", 760, 1378);
  context.fillStyle = "#0f172a";
  context.font = '700 44px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillText(formatCurrencyJPY(total), 760, 1428);

  context.fillStyle = "#64748b";
  context.font = '400 24px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  context.fillText("配送日ごとの請求明細表です。", 88, 1490);
}

type StatementMatrix = {
  dates: string[];
  rows: {
    key: string;
    itemName: string;
    unitPrice: number;
    quantities: Record<string, number>;
    totalQuantity: number;
    amount: number;
  }[];
};

function buildStatementMatrix(details: SalesDetail[]): StatementMatrix {
  const dates = Array.from(new Set(details.map((detail) => detail.deliveryDate))).sort((a, b) => a.localeCompare(b));
  const grouped = new Map<string, StatementMatrix["rows"][number]>();
  details.forEach((detail) => {
    const key = `${detail.productName}|${detail.unitPrice}`;
    const current = grouped.get(key) ?? {
      key,
      itemName: detail.productName,
      unitPrice: detail.unitPrice,
      quantities: {},
      totalQuantity: 0,
      amount: 0,
    };
    current.quantities[detail.deliveryDate] = (current.quantities[detail.deliveryDate] ?? 0) + detail.quantity;
    current.totalQuantity += detail.quantity;
    current.amount += detail.amount;
    grouped.set(key, current);
  });
  return {
    dates,
    rows: Array.from(grouped.values()).sort((a, b) => a.itemName.localeCompare(b.itemName)),
  };
}

function drawStatementMatrix(context: CanvasRenderingContext2D, matrix: StatementMatrix, x: number, y: number) {
  const tableWidth = 1024;
  const itemWidth = 280;
  const unitWidth = 120;
  const qtyWidth = 100;
  const amountWidth = 150;
  const availableDateWidth = tableWidth - itemWidth - unitWidth - qtyWidth - amountWidth;
  const dateWidth = matrix.dates.length > 0 ? Math.max(34, Math.floor(availableDateWidth / matrix.dates.length)) : availableDateWidth;
  const widths = [itemWidth, ...matrix.dates.map(() => dateWidth), unitWidth, qtyWidth, amountWidth];
  const headers = ["商品名", ...matrix.dates.map(formatDayLabel), "単価", "数量", "金額"];
  drawTableHeader(context, headers, widths, x, y);

  context.font = '400 21px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  matrix.rows.slice(0, 18).forEach((row, rowIndex) => {
    const rowY = y + 58 + rowIndex * 44;
    drawDivider(context, x, rowY, tableWidth, "#e2e8f0", 1);
    context.fillStyle = "#0f172a";
    context.fillText(truncateCanvasText(context, row.itemName, itemWidth - 32), x + 16, rowY + 30);

    let columnX = x + itemWidth;
    matrix.dates.forEach((date) => {
      context.textAlign = "center";
      const quantity = row.quantities[date];
      if (quantity) context.fillText(formatQuantity(quantity), columnX + dateWidth / 2, rowY + 30);
      columnX += dateWidth;
    });

    context.textAlign = "right";
    context.fillText(formatCurrencyJPY(row.unitPrice), columnX + unitWidth - 16, rowY + 30);
    columnX += unitWidth;
    context.fillText(formatQuantity(row.totalQuantity), columnX + qtyWidth - 16, rowY + 30);
    columnX += qtyWidth;
    context.fillText(formatCurrencyJPY(row.amount), columnX + amountWidth - 16, rowY + 30);
    context.textAlign = "left";
  });
}

function formatDayLabel(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${Number(match[2])}/${Number(match[3])}` : value;
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}

function drawInvoiceRows(context: CanvasRenderingContext2D, details: SalesDetail[], x: number, y: number) {
  const widths = [190, 430, 150, 100, 160];
  const headers = ["日付", "商品名", "単価", "数量", "金額"];
  drawTableHeader(context, headers, widths, x, y);

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

function drawTableHeader(context: CanvasRenderingContext2D, headers: string[], widths: number[], x: number, y: number) {
  context.fillStyle = "#f1f5f9";
  context.fillRect(x, y, widths.reduce((sum, width) => sum + width, 0), 58);
  context.fillStyle = "#334155";
  context.font = '700 24px Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';

  let columnX = x;
  headers.forEach((header, index) => {
    context.fillText(header, columnX + 18, y + 38);
    columnX += widths[index];
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
