import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ============================================================================
// Constants
// ============================================================================

const PRIMARY_COLOR: [number, number, number] = [67, 148, 84]; // #439454
const WHITE: [number, number, number] = [255, 255, 255];
const TEXT_COLOR: [number, number, number] = [17, 24, 39]; // #111827
const MUTED_COLOR: [number, number, number] = [107, 114, 128]; // #6B7280
const BORDER_COLOR: [number, number, number] = [229, 231, 235]; // #E5E7EB

const MARGIN = 15;
const PAGE_WIDTH = 210; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Logo will be loaded on demand and cached
let cachedLogoBase64: string | null = null;

async function loadLogoBase64(): Promise<string | null> {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const res = await fetch("/images/gapuraangkasa.jpg");
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogoBase64 = reader.result as string;
        resolve(cachedLogoBase64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ============================================================================
// Base PDF Setup
// ============================================================================

export async function createBasePdf(
  title: string,
  subtitle?: string,
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const logoBase64 = await loadLogoBase64();

  // Add header to first page
  addHeader(doc, title, subtitle, logoBase64);

  // Add footer
  addFooter(doc);

  return doc;
}

function addHeader(
  doc: jsPDF,
  title: string,
  subtitle: string | undefined,
  logoBase64: string | null,
): void {
  let y = MARGIN;

  // Logo
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "JPEG", MARGIN, y, 18, 18);
    } catch {
      // Skip logo if it fails
    }
  }

  // Title
  const titleX = logoBase64 ? MARGIN + 22 : MARGIN;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(title, titleX, y + 7);

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(subtitle, titleX, y + 13);
  }

  // Date generated
  const now = new Date();
  const dateStr = `Tanggal cetak: ${now.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
  doc.setFontSize(8);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(dateStr, PAGE_WIDTH - MARGIN, y + 7, { align: "right" });

  // Green line
  const lineY = y + 20;
  doc.setDrawColor(...PRIMARY_COLOR);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, lineY, PAGE_WIDTH - MARGIN, lineY);
}

function addFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(
      "PT Gapura Angkasa - Bandar Udara I Gusti Ngurah Rai, Bali",
      MARGIN,
      290,
    );
    doc.text(`Halaman ${i} dari ${pageCount}`, PAGE_WIDTH - MARGIN, 290, {
      align: "right",
    });
  }
}

// ============================================================================
// Section Title
// ============================================================================

export function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  // Check if we need a new page
  if (y > 260) {
    doc.addPage();
    y = MARGIN + 5;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(title, MARGIN, y);

  // Thin underline
  doc.setDrawColor(...PRIMARY_COLOR);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y + 1.5, MARGIN + doc.getTextWidth(title), y + 1.5);

  return y + 7;
}

// ============================================================================
// Summary Box
// ============================================================================

export function addSummaryBox(
  doc: jsPDF,
  items: Array<{ label: string; value: string }>,
  y: number,
): number {
  if (y > 255) {
    doc.addPage();
    y = MARGIN + 5;
  }

  const boxHeight = Math.ceil(items.length / 3) * 8 + 6;
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, boxHeight, 2, 2);

  const colWidth = CONTENT_WIDTH / 3;
  let itemY = y + 6;

  for (let i = 0; i < items.length; i++) {
    const col = i % 3;
    const x = MARGIN + col * colWidth + 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(items[i].label, x, itemY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_COLOR);
    doc.text(items[i].value, x + doc.getTextWidth(items[i].label + ": ") - 2, itemY);

    if (col === 2 && i < items.length - 1) {
      itemY += 8;
    }
  }

  return y + boxHeight + 5;
}

// ============================================================================
// Table
// ============================================================================

export function addTable(
  doc: jsPDF,
  headers: string[],
  rows: string[][],
  startY: number,
): number {
  if (startY > 250) {
    doc.addPage();
    startY = MARGIN + 5;
  }

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.5,
      textColor: TEXT_COLOR,
      lineColor: BORDER_COLOR,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: PRIMARY_COLOR,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    didDrawPage: () => {
      // Footer will be added at the end
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable?.finalY ?? startY + 20;
}

// ============================================================================
// Finalize (add footers to all pages)
// ============================================================================

export function finalizePdf(doc: jsPDF): void {
  addFooter(doc);
}

// ============================================================================
// Download helper
// ============================================================================

export function downloadPdf(doc: jsPDF, fileName: string): void {
  doc.save(fileName);
}
