import PDFDocument from "pdfkit";

type InvoiceItem = {
  qty: number;
  unit_rate: number;
  discount_pct: number;
  line_total: number;
  tax_rate: number;
  tax_amount: number;
  medicine_batches: {
    batch_no: string;
    medicines: { name: string; unit: string | null; hsn_code: string | null } | null;
  } | null;
};

type InvoiceData = {
  invoice_no: string;
  created_at: string;
  payment_mode: string;
  status: string;
  grand_total: number;
  discount_total: number;
  taxable_value: number;
  cgst_total: number;
  sgst_total: number;
};

type OrgData = { name: string; gstin: string | null; address: string | null; phone: string | null };
type CustomerData = { name: string; phone: string | null } | null;

const BRAND = "#14532d";
const GRAY = "#6b7280";
const LIGHT_RULE = "#e5e7eb";
const LEFT = 40;
const RIGHT = 555;

export async function generateInvoicePdf(
  invoice: InvoiceData,
  items: InvoiceItem[],
  org: OrgData,
  customer: CustomerData,
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const hasTax = invoice.cgst_total > 0 || invoice.sgst_total > 0;

  // Top accent bar
  doc.rect(LEFT, doc.y, RIGHT - LEFT, 3).fill(BRAND);
  doc.moveDown(1.2);

  // Header: org name + status badge, side by side
  const headerY = doc.y;
  doc.fillColor("#111").font("Helvetica-Bold").fontSize(18);
  const orgNameWidth = doc.widthOfString(org.name);
  doc.text(org.name, LEFT, headerY);

  const statusText = invoice.status.toUpperCase();
  doc.font("Helvetica-Bold").fontSize(8);
  const statusTextWidth = doc.widthOfString(statusText);
  const badgeWidth = statusTextWidth + 16;
  const badgeX = LEFT + orgNameWidth + 12;
  const badgeY = headerY + 5;
  const isReturned = invoice.status === "returned";
  doc.roundedRect(badgeX, badgeY, badgeWidth, 16, 8).fill(isReturned ? "#fee2e2" : "#dcfce7");
  doc
    .fillColor(isReturned ? "#991b1b" : "#166534")
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(statusText, badgeX + 8, badgeY + 4);

  doc.x = LEFT;
  doc.y = headerY + 30;
  doc.fillColor(GRAY).font("Helvetica").fontSize(9);
  const orgLine = [org.address, org.phone].filter(Boolean).join("   ·   ");
  if (orgLine) doc.text(orgLine, LEFT);
  if (org.gstin) doc.text(`GSTIN: ${org.gstin}`, LEFT);

  doc.moveDown(0.6);
  doc.fillColor("#111").font("Helvetica-Bold").fontSize(10).text(invoice.invoice_no, LEFT);
  doc.fillColor(GRAY).font("Helvetica").fontSize(9).text(new Date(invoice.created_at).toLocaleString(), LEFT);
  if (customer) {
    doc.text(`Billed to: ${customer.name}${customer.phone ? ` (${customer.phone})` : ""}`, LEFT);
  }

  doc.moveDown(1);

  const col = { name: 40, hsn: 215, qty: 270, rate: 310, disc: 360, taxable: 400, tax: 450, total: 505 };
  const colW = { name: 170, hsn: 50, qty: 35, rate: 45, disc: 35, taxable: 45, tax: 50, total: 50 };

  const tableTop = doc.y;
  doc.fillColor(GRAY).font("Helvetica-Bold").fontSize(7.5);
  doc.text("MEDICINE", col.name, tableTop);
  doc.text("HSN", col.hsn, tableTop, { width: colW.hsn });
  doc.text("QTY", col.qty, tableTop, { width: colW.qty, align: "right" });
  doc.text("RATE", col.rate, tableTop, { width: colW.rate, align: "right" });
  doc.text("DISC%", col.disc, tableTop, { width: colW.disc, align: "right" });
  doc.text("TAXABLE", col.taxable, tableTop, { width: colW.taxable, align: "right" });
  if (hasTax) doc.text("TAX", col.tax, tableTop, { width: colW.tax, align: "right" });
  doc.text("TOTAL", col.total, tableTop, { width: colW.total, align: "right" });

  doc
    .moveTo(LEFT, tableTop + 14)
    .lineTo(RIGHT, tableTop + 14)
    .strokeColor(LIGHT_RULE)
    .lineWidth(1)
    .stroke();

  let y = tableTop + 20;
  for (const item of items) {
    const name = item.medicine_batches?.medicines?.name ?? "—";
    const hsn = item.medicine_batches?.medicines?.hsn_code ?? "—";
    doc.fillColor("#111").font("Helvetica").fontSize(8.5);
    doc.text(name, col.name, y, { width: colW.name });
    doc.fillColor(GRAY).fontSize(8).text(hsn, col.hsn, y, { width: colW.hsn });
    doc.fillColor("#111").fontSize(8.5);
    doc.text(String(item.qty), col.qty, y, { width: colW.qty, align: "right" });
    doc.text(item.unit_rate.toFixed(2), col.rate, y, { width: colW.rate, align: "right" });
    doc.text(String(item.discount_pct), col.disc, y, { width: colW.disc, align: "right" });
    doc.text(item.line_total.toFixed(2), col.taxable, y, { width: colW.taxable, align: "right" });
    if (hasTax) {
      doc.fillColor(GRAY).fontSize(7.5);
      doc.text(
        item.tax_rate > 0 ? `${item.tax_rate}% · ${item.tax_amount.toFixed(2)}` : "—",
        col.tax,
        y,
        { width: colW.tax, align: "right" },
      );
    }
    doc.fillColor("#111").font("Helvetica-Bold").fontSize(8.5);
    doc.text((item.line_total + item.tax_amount).toFixed(2), col.total, y, { width: colW.total, align: "right" });
    y += 18;
  }

  doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor(LIGHT_RULE).lineWidth(1).stroke();
  y += 12;

  const totalsLine = (label: string, value: string, bold = false) => {
    doc.fillColor(bold ? "#111" : GRAY).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 11 : 9);
    doc.text(label, 360, y, { width: 110, align: "left" });
    doc.text(value, 470, y, { width: 85, align: "right" });
    y += bold ? 18 : 15;
  };
  totalsLine("Taxable value", invoice.taxable_value.toFixed(2));
  if (hasTax) {
    totalsLine("CGST", invoice.cgst_total.toFixed(2));
    totalsLine("SGST", invoice.sgst_total.toFixed(2));
  }
  totalsLine("Discount", `-${invoice.discount_total.toFixed(2)}`);
  doc.moveTo(360, y).lineTo(RIGHT, y).strokeColor(LIGHT_RULE).lineWidth(1).stroke();
  y += 6;
  totalsLine("Grand total", invoice.grand_total.toFixed(2), true);
  totalsLine("Payment mode", invoice.payment_mode.toUpperCase());

  doc.end();
  return done;
}
