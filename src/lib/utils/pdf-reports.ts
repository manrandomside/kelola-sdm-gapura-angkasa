import {
  createBasePdf,
  addSectionTitle,
  addSummaryBox,
  addTable,
  finalizePdf,
  downloadPdf,
} from "./pdf-generator";

// ============================================================================
// Types (matching API responses)
// ============================================================================

interface MonthlyReportData {
  periode: { month: number; year: number; label: string };
  ringkasan: {
    total: number;
    aktif: number;
    nonAktif: number;
    pegawaiTetap: number;
    pkwt: number;
    tad: number;
    masukBulanIni: number;
    keluarBulanIni: number;
  };
  perUnit: Array<{
    unit: string;
    total: number;
    pegawaiTetap: number;
    pkwt: number;
    tad: number;
  }>;
  perProvider: Array<{
    provider: string;
    total: number;
    aktif: number;
    nonAktif: number;
  }>;
  perStatusKontrak: Array<{ status: string; count: number }>;
  kontrakAkanBerakhir: {
    dalam30hari: number;
    dalam60hari: number;
    dalam90hari: number;
  };
}

interface ProviderReportData {
  provider: string;
  ringkasan: {
    total: number;
    aktif: number;
    nonAktif: number;
    pegawaiTetap: number;
    pkwt: number;
    tad: number;
  };
  kontrakAktif: number;
  kontrakAkanBerakhir30: number;
  kontrakAkanBerakhir90: number;
  karyawan: Array<{
    no: number;
    nip: string;
    namaLengkap: string;
    namaJabatan: string;
    unitOrganisasi: string;
    statusPegawai: string;
    statusKerja: string;
    tmtMulaiKerja: string | null;
    tmtBerakhirKerja: string | null;
  }>;
}

interface ContractReportData {
  rentangHari: number;
  total: number;
  perProvider: Array<{
    provider: string;
    count: number;
    karyawan: Array<{
      nip: string;
      namaLengkap: string;
      namaJabatan: string;
      unitOrganisasi: string;
      tmtBerakhirKerja: string;
      sisaHari: number;
    }>;
  }>;
  perUnit: Array<{ unit: string; count: number }>;
}

// ============================================================================
// Helper
// ============================================================================

function fmt(n: number): string {
  return n.toLocaleString("id-ID");
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ============================================================================
// Monthly Report
// ============================================================================

export async function generateMonthlyReport(
  data: MonthlyReportData,
): Promise<void> {
  const doc = await createBasePdf(
    "LAPORAN BULANAN SDM",
    `PT Gapura Angkasa - ${data.periode.label}`,
  );

  let y = 42;

  // Ringkasan
  y = addSectionTitle(doc, "Ringkasan", y);
  y = addSummaryBox(doc, [
    { label: "Total SDM:", value: fmt(data.ringkasan.total) },
    { label: "Aktif:", value: fmt(data.ringkasan.aktif) },
    { label: "Non Aktif:", value: fmt(data.ringkasan.nonAktif) },
    { label: "Pegawai Tetap:", value: fmt(data.ringkasan.pegawaiTetap) },
    { label: "PKWT:", value: fmt(data.ringkasan.pkwt) },
    { label: "TAD:", value: fmt(data.ringkasan.tad) },
    { label: "Masuk bulan ini:", value: fmt(data.ringkasan.masukBulanIni) },
    { label: "Keluar bulan ini:", value: fmt(data.ringkasan.keluarBulanIni) },
  ], y);

  // Kontrak akan berakhir
  y = addSectionTitle(doc, "Kontrak Akan Berakhir", y);
  y = addSummaryBox(doc, [
    { label: "Dalam 30 hari:", value: fmt(data.kontrakAkanBerakhir.dalam30hari) },
    { label: "Dalam 60 hari:", value: fmt(data.kontrakAkanBerakhir.dalam60hari) },
    { label: "Dalam 90 hari:", value: fmt(data.kontrakAkanBerakhir.dalam90hari) },
  ], y);

  // Per Unit
  y = addSectionTitle(doc, "Distribusi per Unit Organisasi", y);
  y = addTable(
    doc,
    ["Unit", "Total", "Pegawai Tetap", "PKWT", "TAD"],
    data.perUnit.map((r) => [
      r.unit,
      fmt(r.total),
      fmt(r.pegawaiTetap),
      fmt(r.pkwt),
      fmt(r.tad),
    ]),
    y,
  );

  y += 5;

  // Per Provider
  y = addSectionTitle(doc, "Distribusi per Provider", y);
  y = addTable(
    doc,
    ["Provider", "Total", "Aktif", "Non Aktif"],
    data.perProvider.map((r) => [
      r.provider,
      fmt(r.total),
      fmt(r.aktif),
      fmt(r.nonAktif),
    ]),
    y,
  );

  y += 5;

  // Per Status Kontrak
  y = addSectionTitle(doc, "Distribusi per Status Kontrak", y);
  addTable(
    doc,
    ["Status Kontrak", "Jumlah"],
    data.perStatusKontrak.map((r) => [r.status, fmt(r.count)]),
    y,
  );

  finalizePdf(doc);

  downloadPdf(
    doc,
    `Laporan_Bulanan_SDM_${data.periode.label.replace(/\s/g, "_")}.pdf`,
  );
}

// ============================================================================
// Provider Report
// ============================================================================

export async function generateProviderReport(
  data: ProviderReportData,
): Promise<void> {
  const doc = await createBasePdf(
    "LAPORAN SDM PER PROVIDER",
    data.provider,
  );

  let y = 42;

  // Ringkasan
  y = addSectionTitle(doc, "Ringkasan", y);
  y = addSummaryBox(doc, [
    { label: "Total:", value: fmt(data.ringkasan.total) },
    { label: "Aktif:", value: fmt(data.ringkasan.aktif) },
    { label: "Non Aktif:", value: fmt(data.ringkasan.nonAktif) },
    { label: "Pegawai Tetap:", value: fmt(data.ringkasan.pegawaiTetap) },
    { label: "PKWT:", value: fmt(data.ringkasan.pkwt) },
    { label: "TAD:", value: fmt(data.ringkasan.tad) },
    { label: "Kontrak aktif:", value: fmt(data.kontrakAktif) },
    { label: "Akan berakhir (30 hari):", value: fmt(data.kontrakAkanBerakhir30) },
    { label: "Akan berakhir (90 hari):", value: fmt(data.kontrakAkanBerakhir90) },
  ], y);

  // Daftar karyawan
  y = addSectionTitle(doc, `Daftar Karyawan (${fmt(data.karyawan.length)} orang)`, y);
  addTable(
    doc,
    ["No", "NIP", "Nama", "Jabatan", "Unit", "Status", "Status Kerja", "TMT Mulai", "TMT Berakhir"],
    data.karyawan.map((r) => [
      String(r.no),
      r.nip,
      r.namaLengkap,
      r.namaJabatan,
      r.unitOrganisasi,
      r.statusPegawai,
      r.statusKerja,
      formatDate(r.tmtMulaiKerja),
      formatDate(r.tmtBerakhirKerja),
    ]),
    y,
  );

  finalizePdf(doc);

  const safeName = data.provider.replace(/[^a-zA-Z0-9]/g, "_");
  const now = new Date();
  const monthLabel = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  downloadPdf(doc, `Laporan_SDM_${safeName}_${monthLabel.replace(/\s/g, "_")}.pdf`);
}

// ============================================================================
// Contract Report
// ============================================================================

export async function generateContractReport(
  data: ContractReportData,
): Promise<void> {
  const doc = await createBasePdf(
    "LAPORAN KONTRAK AKAN BERAKHIR",
    `Rentang: ${data.rentangHari} Hari ke Depan`,
  );

  let y = 42;

  // Ringkasan
  y = addSectionTitle(doc, "Ringkasan", y);
  y = addSummaryBox(doc, [
    { label: "Total kontrak akan berakhir:", value: fmt(data.total) },
    { label: "Jumlah provider:", value: fmt(data.perProvider.length) },
  ], y);

  // Per provider with employee lists
  for (const group of data.perProvider) {
    y = addSectionTitle(doc, `${group.provider} (${group.count} karyawan)`, y);
    y = addTable(
      doc,
      ["No", "NIP", "Nama", "Jabatan", "Unit", "TMT Berakhir", "Sisa Hari"],
      group.karyawan.map((r, idx) => [
        String(idx + 1),
        r.nip,
        r.namaLengkap,
        r.namaJabatan,
        r.unitOrganisasi,
        formatDate(r.tmtBerakhirKerja),
        String(r.sisaHari),
      ]),
      y,
    );
    y += 5;
  }

  // Per unit summary
  if (data.perUnit.length > 0) {
    y = addSectionTitle(doc, "Distribusi per Unit Organisasi", y);
    addTable(
      doc,
      ["Unit Organisasi", "Jumlah"],
      data.perUnit.map((r) => [r.unit, fmt(r.count)]),
      y,
    );
  }

  finalizePdf(doc);

  const now = new Date();
  const monthLabel = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  downloadPdf(
    doc,
    `Laporan_Kontrak_${data.rentangHari}_Hari_${monthLabel.replace(/\s/g, "_")}.pdf`,
  );
}
