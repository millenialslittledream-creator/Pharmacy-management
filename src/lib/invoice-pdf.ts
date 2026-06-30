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

  doc.fontSize(16).font("Helvetica-Bold").text(org.name);
  doc.fontSize(9).font("Helvetica").fillColor("#555");
  const orgLine = [org.address, org.phone].filter(Boolean).join("  ·  ");
  if (orgLine) doc.text(orgLine);
  if (org.gstin) doc.text(`GSTIN: ${org.gstin}`);
  doc.fillColor("#000");

  doc.moveDown(0.5);
  doc.fontSize(11).font("Helvetica-Bold").text(invoice.invoice_no);
  doc.fontSize(9).font("Helvetica").text(new Date(invoice.created_at).toLocaleString());
  if (customer) {
    doc.text(`Billed to: ${customer.name}${customer.phone ? ` (${customer.phone})` : ""}`);
  }

  doc.moveDown(1);

  const colX = { name: 40, qty: 280, rate: 330, disc: 390, taxable: 440, tax: 500, total: 555 - 60 };
  const tableTop = doc.y;
  doc.fontSize(8).font("Helvetica-Bold");
  doc.text("Medicine", colX.name, tableTop);
  doc.text("Qty", colX.qty, tableTop, { width: 40, align: "right" });
  doc.text("Rate", colX.rate, tableTop, { width: 50, align: "right" });
  doc.text("Disc%", colX.disc, tableTop, { width: 40, align: "right" });
  doc.text("Taxable", colX.taxable, tableTop, { width: 55, align: "right" });
  if (hasTax) doc.text("Tax", colX.tax, tableTop, { width: 50, align: "right" });
  doc.moveTo(40, tableTop + 12).lineTo(555, tableTop + 12).strokeColor("#ccc").stroke();

  let y = tableTop + 18;
  doc.font("Helvetica").fontSize(8);
  for (const item of items) {
    const name = item.medicine_batches?.medicines?.name ?? "—";
    doc.text(name, colX.name, y, { width: 230 });
    doc.text(String(item.qty), colX.qty, y, { width: 40, align: "right" });
    doc.text(item.unit_rate.toFixed(2), colX.rate, y, { width: 50, align: "right" });
    doc.text(String(item.discount_pct), colX.disc, y, { width: 40, align: "right" });
    doc.text(item.line_total.toFixed(2), colX.taxable, y, { width: 55, align: "right" });
    if (hasTax) {
      doc.text(
        item.tax_rate > 0 ? `${item.tax_rate}%/${item.tax_amount.toFixed(2)}` : "—",
        colX.tax,
        y,
        { width: 50, align: "right" },
      );
    }
    y += 16;
  }

  doc.moveTo(40, y).lineTo(555, y).strokeColor("#ccc").stroke();
  y += 10;

  doc.font("Helvetica").fontSize(9);
  const totalsLine = (label: string, value: string, bold = false) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica");
    doc.text(label, 380, y, { width: 100, align: "left" });
    doc.text(value, 480, y, { width: 75, align: "right" });
    y += 14;
  };
  totalsLine("Taxable value", invoice.taxable_value.toFixed(2));
  if (hasTax) {
    totalsLine("CGST", invoice.cgst_total.toFixed(2));
    totalsLine("SGST", invoice.sgst_total.toFixed(2));
  }
  totalsLine("Discount", `-${invoice.discount_total.toFixed(2)}`);
  totalsLine("Grand total", invoice.grand_total.toFixed(2), true);
  totalsLine("Payment mode", invoice.payment_mode);

  doc.end();
  return done;
}
