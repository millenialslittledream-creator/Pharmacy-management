// The stock "template": the ordered list of fields used by the one-by-one
// "Add medicine" form, the bulk-import CSV template and the import parser.
// The CEO can add, remove and reorder fields; this module is the single
// source of truth so all of them stay in sync.

export type FieldType = "text" | "number" | "date";

export type TemplateField = {
  key: string;
  label: string;
  type: FieldType;
  custom?: boolean;
};

type BuiltinField = {
  label: string;
  type: FieldType;
  required?: boolean;
  aliases?: string[];
  samples: [string, string];
};

// Fields the system knows how to store. Required ones can never be removed
// from the template because a batch can't be saved without them.
export const BUILTIN_FIELDS: Record<string, BuiltinField> = {
  name: { label: "Item Name", type: "text", required: true, aliases: ["name", "medicine", "medicine name", "drug name"], samples: ["Paracetamol 500mg", "Amoxicillin 250mg"] },
  generic_name: { label: "Generic Name", type: "text", samples: ["Paracetamol", "Amoxicillin"] },
  manufacturer: { label: "Manufacturer", type: "text", samples: ["ABC Pharma", "XYZ Labs"] },
  category: { label: "Category", type: "text", aliases: ["drug type", "type"], samples: ["Tablet", "Capsule"] },
  schedule_category: { label: "Schedule", type: "text", aliases: ["schedule category"], samples: ["Others", "H"] },
  hsn_code: { label: "HSN Code", type: "text", samples: ["30049099", "30041020"] },
  tax_rate: { label: "GST %", type: "number", aliases: ["gst", "gst%", "tax", "tax rate"], samples: ["12", "12"] },
  reorder_level: { label: "Reorder Level", type: "number", samples: ["20", "20"] },
  barcode: { label: "Barcode", type: "text", samples: ["8901234567890", "8909876543210"] },
  unit: { label: "Unit", type: "text", samples: ["Strip", "Strip"] },
  pack_size: { label: "Pack Size", type: "text", samples: ["10x10", "10x10"] },
  supplier_name: { label: "Supplier Name", type: "text", samples: ["MedSupply Co", "HealthDistributors"] },
  batch_no: { label: "Batch No", type: "text", required: true, aliases: ["batch number", "batch"], samples: ["PCM001", "AMX045"] },
  mfg_date: { label: "Mfg Date", type: "date", aliases: ["manufacturing date"], samples: ["2026-01-15", "2026-02-01"] },
  expiry_date: { label: "Expiry Date", type: "date", required: true, aliases: ["expiry", "exp date"], samples: ["2027-06-30", "2027-08-15"] },
  mrp: { label: "MRP", type: "number", samples: ["15.00", "45.00"] },
  purchase_rate: { label: "Purchase Rate", type: "number", required: true, samples: ["8.50", "28.00"] },
  sale_rate: { label: "Sale Rate", type: "number", required: true, samples: ["12.00", "40.00"] },
  qty: { label: "Qty", type: "number", required: true, aliases: ["quantity"], samples: ["500", "200"] },
};

export const REQUIRED_KEYS = Object.entries(BUILTIN_FIELDS)
  .filter(([, f]) => f.required)
  .map(([key]) => key);

const DEFAULT_ORDER = [
  "name",
  "generic_name",
  "manufacturer",
  "hsn_code",
  "batch_no",
  "mfg_date",
  "expiry_date",
  "mrp",
  "purchase_rate",
  "sale_rate",
  "qty",
  "unit",
  "pack_size",
  "supplier_name",
];

export const MAX_FIELDS = 40;
const CUSTOM_KEY = /^custom_[a-z0-9_]{1,40}$/;
const FIELD_TYPES: FieldType[] = ["text", "number", "date"];

export function builtinField(key: string): TemplateField {
  const f = BUILTIN_FIELDS[key];
  return { key, label: f.label, type: f.type };
}

export const DEFAULT_TEMPLATE: TemplateField[] = DEFAULT_ORDER.map(builtinField);

export function isRequiredKey(key: string) {
  return REQUIRED_KEYS.includes(key);
}

// Accepts whatever was stored (or sent by a client) and returns a safe,
// complete template: unknown keys dropped, labels trimmed, required fields
// always present.
export function resolveTemplate(raw: unknown): TemplateField[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_TEMPLATE;

  const seen = new Set<string>();
  const fields: TemplateField[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { key, label, type } = entry as Record<string, unknown>;
    if (typeof key !== "string" || seen.has(key)) continue;

    if (key in BUILTIN_FIELDS) {
      fields.push(builtinField(key));
    } else if (CUSTOM_KEY.test(key)) {
      const cleanLabel = typeof label === "string" ? label.trim().slice(0, 40) : "";
      if (!cleanLabel) continue;
      const cleanType = FIELD_TYPES.includes(type as FieldType) ? (type as FieldType) : "text";
      fields.push({ key, label: cleanLabel, type: cleanType, custom: true });
    } else {
      continue;
    }
    seen.add(key);
    if (fields.length >= MAX_FIELDS) break;
  }

  for (const key of REQUIRED_KEYS) {
    if (!seen.has(key)) fields.push(builtinField(key));
  }
  return fields;
}

export function newCustomKey(label: string, existingKeys: string[]) {
  const slug =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 30) || "field";
  let key = `custom_${slug}`;
  let n = 2;
  while (existingKeys.includes(key)) key = `custom_${slug}_${n++}`;
  return key;
}

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
}

// Finds which template field a spreadsheet header belongs to.
export function matchHeader(header: string, fields: TemplateField[]): TemplateField | null {
  const needle = normalizeHeader(header);
  if (!needle) return null;
  for (const field of fields) {
    const candidates = [field.label, field.key.replace(/_/g, " ")];
    if (!field.custom) candidates.push(...(BUILTIN_FIELDS[field.key].aliases ?? []));
    if (candidates.some((c) => normalizeHeader(c) === needle)) return field;
  }
  return null;
}

export function sampleCsv(fields: TemplateField[]) {
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = fields.map((f) => f.label);
  const rows = [0, 1].map((i) =>
    fields.map((f) => {
      if (f.custom) return f.type === "number" ? String(10 + i) : f.type === "date" ? "2027-01-01" : "";
      return BUILTIN_FIELDS[f.key].samples[i];
    }),
  );
  return [header, ...rows].map((r) => r.map(escape).join(",")).join("\n");
}
