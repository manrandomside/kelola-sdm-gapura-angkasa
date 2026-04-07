// Format sebuah angka dengan separator ribuan Indonesia ("1.234.567").
export function formatNumber(
  value: number | string | null | undefined,
): string {
  if (value == null || value === "") return "";
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "";
  return new Intl.NumberFormat("id-ID").format(num);
}

// Format nomor handphone Indonesia.
// - Normalisasi "08..." / "+62..." / "62..." ke "+62 8xx-xxxx-xxxx".
// - Input lain dikembalikan apa adanya (trim saja).
export function formatPhoneNumber(
  phone: string | null | undefined,
): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return "";

  let normalized = cleaned;
  if (normalized.startsWith("+62")) {
    normalized = normalized.slice(3);
  } else if (normalized.startsWith("62")) {
    normalized = normalized.slice(2);
  } else if (normalized.startsWith("0")) {
    normalized = normalized.slice(1);
  } else {
    return phone.trim();
  }

  if (!normalized) return phone.trim();

  const head = normalized.slice(0, 3);
  const mid = normalized.slice(3, 7);
  const tail = normalized.slice(7);
  const parts = [head, mid, tail].filter(Boolean);
  return `+62 ${parts.join("-")}`;
}

// Ambil inisial dari sebuah nama (maksimal 2 huruf kapital).
export function getInitials(name: string | null | undefined): string {
  if (!name) return "";
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "";
  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }
  return (tokens[0][0] + tokens[tokens.length - 1][0]).toUpperCase();
}

// Potong text dengan ellipsis jika melebihi maxLength.
export function truncateText(
  text: string | null | undefined,
  maxLength: number,
): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  if (maxLength <= 1) return text.slice(0, maxLength);
  return `${text.slice(0, maxLength - 1)}…`;
}
