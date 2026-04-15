import { NextResponse } from "next/server";
import { and, count, desc, eq, isNotNull, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { employee } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getProviderFilter, getSessionUser } from "@/lib/utils/auth";
import { askAi, type AiMessage } from "@/lib/utils/ai-provider";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

interface ChatRequest {
  messages: { role: "user" | "assistant"; content: string }[];
}

interface ChatResponse {
  content: string;
  provider: string;
}

function fail(
  status: number,
  code: string,
  message: string,
): NextResponse<ApiResponse<never>> {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error: { code, message } },
    { status },
  );
}

function buildSystemPrompt(
  context: {
    total: number;
    pegawaiTetap: number;
    pkwt: number;
    tad: number;
    tadPaketSdm: number;
    tadPaketPekerjaan: number;
    aktif: number;
    nonAktif: number;
    kontrakBerakhir30: number;
    kontrakBerakhir90: number;
    perUnit: { unit: string; total: number }[];
    perProvider: { provider: string; total: number }[];
    perJabatan: { jabatan: string; total: number }[];
    perJenisKelamin: { L: number; P: number };
  },
  providerScope: string | null,
  namaUser: string,
  roleUser: string,
): string {
  const providerNotice = providerScope
    ? `\nPENTING: Kamu hanya memiliki akses ke data provider ${providerScope}. Jangan menjawab tentang data provider lain.\n`
    : "";

  const unitLines = context.perUnit
    .map((u) => `- ${u.unit}: ${u.total}`)
    .join("\n");

  const providerLines = context.perProvider
    .map((p) => `- ${p.provider}: ${p.total}`)
    .join("\n");

  const jabatanLines = context.perJabatan
    .map((j) => `- ${j.jabatan}: ${j.total}`)
    .join("\n");

  return `Kamu adalah Asisten SDM PT Gapura Angkasa, sistem manajemen sumber daya manusia di Bandar Udara I Gusti Ngurah Rai, Bali.
Jawab pertanyaan user berdasarkan DATA BERIKUT. Jika data tidak cukup untuk menjawab, katakan dengan jujur bahwa kamu tidak memiliki informasi tersebut.
Jawab dalam Bahasa Indonesia. Gunakan format yang rapi dan mudah dibaca.
${providerNotice}
DATA SDM SAAT INI:

Total Karyawan: ${context.total}
Pegawai Tetap: ${context.pegawaiTetap}
PKWT: ${context.pkwt}
TAD: ${context.tad} (Paket SDM: ${context.tadPaketSdm}, Paket Pekerjaan: ${context.tadPaketPekerjaan})
Aktif: ${context.aktif}
Non Aktif: ${context.nonAktif}
Kontrak berakhir dalam 30 hari: ${context.kontrakBerakhir30}
Kontrak berakhir dalam 90 hari: ${context.kontrakBerakhir90}

DISTRIBUSI PER UNIT:
${unitLines}

DISTRIBUSI PER PROVIDER:
${providerLines}

TOP 20 JABATAN:
${jabatanLines}

JENIS KELAMIN:
Laki-laki: ${context.perJenisKelamin.L}
Perempuan: ${context.perJenisKelamin.P}

User saat ini: ${namaUser} (Role: ${roleUser})`;
}

export async function POST(
  request: Request,
): Promise<NextResponse<ApiResponse<ChatResponse>>> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return fail(401, "UNAUTHORIZED", "Sesi tidak valid");
  }

  const sessionUser = await getSessionUser(authUser.id);
  if (!sessionUser) {
    return fail(403, "FORBIDDEN", "Akun tidak terdaftar");
  }

  // Check if at least one API key is configured
  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
    return fail(
      503,
      "NOT_CONFIGURED",
      "Asisten belum dikonfigurasi. Hubungi administrator.",
    );
  }

  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return fail(400, "INVALID_BODY", "Request body tidak valid");
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return fail(400, "INVALID_MESSAGES", "Messages tidak boleh kosong");
  }

  const providerScope = getProviderFilter(sessionUser);

  try {
    // Build context from database
    const conditions: SQL[] = [eq(employee.status, "active")];
    if (providerScope) {
      conditions.push(eq(employee.provider, providerScope));
    }
    const whereClause = and(...conditions);

    const [statsRows, unitRows, providerRows, jabatanRows, genderRows] =
      await Promise.all([
        db
          .select({
            total: count(),
            pegawaiTetap: sql<number>`count(*) filter (where ${employee.status_pegawai} = 'PEGAWAI TETAP')`,
            pkwt: sql<number>`count(*) filter (where ${employee.status_pegawai} = 'PKWT')`,
            tad: sql<number>`count(*) filter (where ${employee.status_pegawai} = 'TAD')`,
            tadPaketSdm: sql<number>`count(*) filter (where ${employee.status_kontrak} = 'PAKET SDM')`,
            tadPaketPekerjaan: sql<number>`count(*) filter (where ${employee.status_kontrak} = 'PAKET PEKERJAAN')`,
            aktif: sql<number>`count(*) filter (where ${employee.status_kerja} = 'Aktif')`,
            nonAktif: sql<number>`count(*) filter (where ${employee.status_kerja} = 'Non Aktif')`,
            kontrakBerakhir30: sql<number>`count(*) filter (where ${employee.tmt_berakhir_kerja}::date > CURRENT_DATE and ${employee.tmt_berakhir_kerja}::date <= CURRENT_DATE + interval '30 days' and ${employee.status_kerja} = 'Aktif')`,
            kontrakBerakhir90: sql<number>`count(*) filter (where ${employee.tmt_berakhir_kerja}::date > CURRENT_DATE and ${employee.tmt_berakhir_kerja}::date <= CURRENT_DATE + interval '90 days' and ${employee.status_kerja} = 'Aktif')`,
          })
          .from(employee)
          .where(whereClause),

        db
          .select({ name: employee.unit_organisasi, value: count() })
          .from(employee)
          .where(and(whereClause, isNotNull(employee.unit_organisasi)))
          .groupBy(employee.unit_organisasi)
          .orderBy(desc(sql`count(*)`)),

        db
          .select({ name: employee.provider, value: count() })
          .from(employee)
          .where(and(whereClause, isNotNull(employee.provider)))
          .groupBy(employee.provider)
          .orderBy(desc(sql`count(*)`)),

        db
          .select({ name: employee.kelompok_jabatan, value: count() })
          .from(employee)
          .where(and(whereClause, isNotNull(employee.kelompok_jabatan)))
          .groupBy(employee.kelompok_jabatan)
          .orderBy(desc(sql`count(*)`))
          .limit(20),

        db
          .select({ name: employee.jenis_kelamin, value: count() })
          .from(employee)
          .where(and(whereClause, isNotNull(employee.jenis_kelamin)))
          .groupBy(employee.jenis_kelamin),
      ]);

    const row = statsRows[0];
    const genderMap = { L: 0, P: 0 };
    for (const g of genderRows) {
      if (g.name === "L") genderMap.L = Number(g.value);
      if (g.name === "P") genderMap.P = Number(g.value);
    }

    const context = {
      total: Number(row?.total ?? 0),
      pegawaiTetap: Number(row?.pegawaiTetap ?? 0),
      pkwt: Number(row?.pkwt ?? 0),
      tad: Number(row?.tad ?? 0),
      tadPaketSdm: Number(row?.tadPaketSdm ?? 0),
      tadPaketPekerjaan: Number(row?.tadPaketPekerjaan ?? 0),
      aktif: Number(row?.aktif ?? 0),
      nonAktif: Number(row?.nonAktif ?? 0),
      kontrakBerakhir30: Number(row?.kontrakBerakhir30 ?? 0),
      kontrakBerakhir90: Number(row?.kontrakBerakhir90 ?? 0),
      perUnit: unitRows
        .filter((r): r is { name: string; value: number } => r.name !== null)
        .map((r) => ({ unit: r.name, total: Number(r.value) })),
      perProvider: providerRows
        .filter((r): r is { name: string; value: number } => r.name !== null)
        .map((r) => ({ provider: r.name, total: Number(r.value) })),
      perJabatan: jabatanRows
        .filter((r): r is { name: string; value: number } => r.name !== null)
        .map((r) => ({ jabatan: r.name, total: Number(r.value) })),
      perJenisKelamin: genderMap,
    };

    const systemPrompt = buildSystemPrompt(
      context,
      providerScope,
      sessionUser.fullName,
      sessionUser.role,
    );

    // Convert messages to AI format (only user/assistant, no system)
    const aiMessages: AiMessage[] = body.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const result = await askAi(aiMessages, systemPrompt);

    return NextResponse.json<ApiResponse<ChatResponse>>({
      success: true,
      data: {
        content: result.content,
        provider: result.provider,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Terjadi kesalahan tidak terduga";

    // If all AI providers failed
    if (message.includes("tidak tersedia")) {
      return fail(
        503,
        "AI_UNAVAILABLE",
        "Asisten sedang tidak tersedia. Silakan coba lagi nanti.",
      );
    }

    logger.error("Assistant chat error", err);
    return fail(500, "INTERNAL_ERROR", message);
  }
}
