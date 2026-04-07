"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { Controller, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCascadingUnit } from "@/hooks/use-cascading-unit";
import {
  JENIS_KELAMIN_OPTIONS,
  JENIS_SEPATU_OPTIONS,
  KELOMPOK_JABATAN_OPTIONS,
  KODE_ORGANISASI_MAP,
  PROVIDER_OPTIONS,
  STATUS_KERJA_OPTIONS,
  STATUS_KONTRAK_OPTIONS,
  STATUS_PEGAWAI_OPTIONS,
  UKURAN_SEPATU_OPTIONS,
  UNIT_ORGANISASI_OPTIONS,
} from "@/lib/constants/enums";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import {
  createEmployeeSchema,
  type CreateEmployeeInput,
} from "@/lib/validations/employee";

import type { ApiResponse } from "@/types/api";

type TabKey = "pribadi" | "kepegawaian" | "pendidikan" | "tambahan";

const TAB_LABELS: Record<TabKey, string> = {
  pribadi: "Data Pribadi",
  kepegawaian: "Kepegawaian",
  pendidikan: "Pendidikan",
  tambahan: "Data Tambahan",
};

// Mapping nama field -> tab tempat field tersebut berada (untuk badge error).
const FIELD_TO_TAB: Record<string, TabKey> = {
  // pribadi
  nik: "pribadi",
  nip: "pribadi",
  nama_lengkap: "pribadi",
  jenis_kelamin: "pribadi",
  tempat_lahir: "pribadi",
  tanggal_lahir: "pribadi",
  alamat: "pribadi",
  kota_domisili: "pribadi",
  handphone: "pribadi",
  email: "pribadi",
  // kepegawaian
  status_pegawai: "kepegawaian",
  status_kontrak: "kepegawaian",
  status_kerja: "kepegawaian",
  provider: "kepegawaian",
  unit_organisasi: "kepegawaian",
  kode_organisasi: "kepegawaian",
  nama_organisasi: "kepegawaian",
  unit_id: "kepegawaian",
  sub_unit_id: "kepegawaian",
  sub_unit_organisasi: "kepegawaian",
  nama_jabatan: "kepegawaian",
  jabatan: "kepegawaian",
  kelompok_jabatan: "kepegawaian",
  kelas_jabatan: "kepegawaian",
  unit_kerja_kontrak: "kepegawaian",
  grade: "kepegawaian",
  kategori_karyawan: "kepegawaian",
  tmt_mulai_kerja: "kepegawaian",
  tmt_berakhir_kerja: "kepegawaian",
  tmt_mulai_jabatan: "kepegawaian",
  tmt_akhir_jabatan: "kepegawaian",
  tmt_berakhir_jabatan: "kepegawaian",
  tmt_pensiun: "kepegawaian",
  no_bpjs_kesehatan: "kepegawaian",
  no_bpjs_ketenagakerjaan: "kepegawaian",
  // pendidikan
  pendidikan: "pendidikan",
  pendidikan_terakhir: "pendidikan",
  instansi_pendidikan: "pendidikan",
  jurusan: "pendidikan",
  remarks_pendidikan: "pendidikan",
  tahun_lulus: "pendidikan",
  // tambahan
  height: "tambahan",
  weight: "tambahan",
  jenis_sepatu: "tambahan",
  ukuran_sepatu: "tambahan",
  seragam: "tambahan",
};

const NONE_VALUE = "__NONE__";

const DEFAULT_VALUES: CreateEmployeeInput = {
  nip: "",
  nik: "",
  nama_lengkap: "",
  jenis_kelamin: "L",
  tempat_lahir: "",
  tanggal_lahir: "",
  alamat: "",
  kota_domisili: "",
  handphone: "",
  email: "",
  status_pegawai: "PEGAWAI TETAP",
  status_kontrak: "",
  status_kerja: "Aktif",
  provider: "",
  kode_organisasi: "",
  unit_organisasi: "Airside",
  nama_organisasi: "",
  sub_unit_organisasi: "",
  unit_id: "",
  sub_unit_id: "",
  nama_jabatan: "",
  jabatan: "",
  kelompok_jabatan: "STAFF",
  kelas_jabatan: "",
  unit_kerja_kontrak: "",
  grade: "",
  kategori_karyawan: "",
  tmt_mulai_kerja: "",
  tmt_berakhir_kerja: "",
  tmt_mulai_jabatan: "",
  tmt_akhir_jabatan: "",
  tmt_berakhir_jabatan: "",
  tmt_pensiun: "",
  pendidikan: "",
  pendidikan_terakhir: "",
  instansi_pendidikan: "",
  jurusan: "",
  remarks_pendidikan: "",
  tahun_lulus: "",
  no_bpjs_kesehatan: "",
  no_bpjs_ketenagakerjaan: "",
  height: "",
  weight: "",
  jenis_sepatu: "",
  ukuran_sepatu: "",
  seragam: "",
};

interface ValidateNipResponse {
  available: boolean;
  message?: string;
}

type UniquenessState = "idle" | "checking" | "available" | "taken" | "error";

interface CreatedEmployeeResponse {
  employee: { id: number; nip: string; nama_lengkap: string };
}

async function createEmployee(
  payload: CreateEmployeeInput,
): Promise<CreatedEmployeeResponse> {
  const res = await fetch("/api/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as ApiResponse<CreatedEmployeeResponse>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data;
}

async function checkNipAvailable(nip: string): Promise<ValidateNipResponse> {
  const res = await fetch(`/api/employees/validate/nip/${encodeURIComponent(nip)}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const json = (await res.json()) as ApiResponse<ValidateNipResponse>;
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

async function checkNikAvailable(nik: string): Promise<ValidateNipResponse> {
  const res = await fetch(`/api/employees/validate/nik/${encodeURIComponent(nik)}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const json = (await res.json()) as ApiResponse<ValidateNipResponse>;
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

interface FieldRowProps {
  label: string;
  required?: boolean;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

function FieldRow({
  label,
  required,
  htmlFor,
  error,
  children,
  className,
}: FieldRowProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

interface SelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
  optionLabels?: Record<string, string>;
  invalid?: boolean;
  allowClear?: boolean;
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
  optionLabels,
  invalid,
  allowClear,
}: SelectFieldProps) {
  const current = value === "" ? NONE_VALUE : value;
  return (
    <Select
      value={current}
      onValueChange={(next) => {
        const asString = next as string;
        onChange(asString === NONE_VALUE ? "" : asString);
      }}
    >
      <SelectTrigger
        className={cn("h-10 w-full", invalid && "border-destructive")}
      >
        <SelectValue>
          {(c: string) =>
            c === NONE_VALUE ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <span>{optionLabels?.[c] ?? c}</span>
            )
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allowClear && (
          <SelectItem value={NONE_VALUE}>
            <span className="text-muted-foreground">{placeholder}</span>
          </SelectItem>
        )}
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {optionLabels?.[opt] ?? opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function EmployeeForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("pribadi");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const [nipState, setNipState] = useState<UniquenessState>("idle");
  const [nipMessage, setNipMessage] = useState<string | null>(null);
  const [nikState, setNikState] = useState<UniquenessState>("idle");
  const [nikMessage, setNikMessage] = useState<string | null>(null);

  const form = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
  });

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
  } = form;

  const watchedUnitOrganisasi = watch("unit_organisasi");
  const watchedUnitIdRaw = watch("unit_id");
  const watchedUnitId = useMemo(() => {
    if (watchedUnitIdRaw === "" || watchedUnitIdRaw == null) return null;
    const n = Number(watchedUnitIdRaw);
    return Number.isFinite(n) ? n : null;
  }, [watchedUnitIdRaw]);

  const { units, subUnits, isLoadingUnits, isLoadingSubUnits } =
    useCascadingUnit(watchedUnitOrganisasi || null, watchedUnitId);

  // Reset unit_id & sub_unit_id ketika unit_organisasi berubah.
  const prevUnitOrganisasi = useRef(watchedUnitOrganisasi);
  useEffect(() => {
    if (prevUnitOrganisasi.current !== watchedUnitOrganisasi) {
      setValue("unit_id", "");
      setValue("sub_unit_id", "");
      setValue("sub_unit_organisasi", "");
      // Auto-fill kode_organisasi & nama_organisasi dari mapping (best-effort).
      const matchKode = (Object.keys(KODE_ORGANISASI_MAP) as Array<
        keyof typeof KODE_ORGANISASI_MAP
      >).find((k) => k === watchedUnitOrganisasi);
      if (matchKode) {
        setValue("kode_organisasi", matchKode);
        setValue("nama_organisasi", KODE_ORGANISASI_MAP[matchKode]);
      }
      prevUnitOrganisasi.current = watchedUnitOrganisasi;
    }
  }, [watchedUnitOrganisasi, setValue]);

  // Reset sub_unit_id ketika unit_id berubah.
  const prevUnitId = useRef(watchedUnitId);
  useEffect(() => {
    if (prevUnitId.current !== watchedUnitId) {
      setValue("sub_unit_id", "");
      setValue("sub_unit_organisasi", "");
      // Auto-fill kode_organisasi dari unit yang dipilih.
      if (watchedUnitId) {
        const picked = units.find((u) => u.id === watchedUnitId);
        if (picked) {
          setValue("kode_organisasi", picked.kode);
          setValue("nama_organisasi", picked.nama);
        }
      }
      prevUnitId.current = watchedUnitId;
    }
  }, [watchedUnitId, units, setValue]);

  // Hitung tab mana yang punya error.
  const tabsWithErrors = useMemo(() => {
    const set = new Set<TabKey>();
    (Object.keys(errors) as Array<keyof typeof errors>).forEach((key) => {
      const tab = FIELD_TO_TAB[key as string];
      if (tab) set.add(tab);
    });
    return set;
  }, [errors]);

  async function handleNipBlur(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      setNipState("idle");
      setNipMessage(null);
      return;
    }
    setNipState("checking");
    setNipMessage(null);
    try {
      const result = await checkNipAvailable(trimmed);
      if (result.available) {
        setNipState("available");
        setNipMessage(null);
      } else {
        setNipState("taken");
        setNipMessage(result.message ?? "NIP sudah terdaftar");
      }
    } catch {
      setNipState("error");
      setNipMessage("Gagal memeriksa NIP");
    }
  }

  async function handleNikBlur(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      setNikState("idle");
      setNikMessage(null);
      return;
    }
    setNikState("checking");
    setNikMessage(null);
    try {
      const result = await checkNikAvailable(trimmed);
      if (result.available) {
        setNikState("available");
        setNikMessage(null);
      } else {
        setNikState("taken");
        setNikMessage(result.message ?? "NIK sudah terdaftar");
      }
    } catch {
      setNikState("error");
      setNikMessage("Gagal memeriksa NIK");
    }
  }

  async function onSubmit(values: CreateEmployeeInput) {
    if (nipState === "taken") {
      toast.error("NIP sudah terdaftar. Mohon gunakan NIP lain.");
      setActiveTab("pribadi");
      return;
    }
    if (nikState === "taken") {
      toast.error("NIK sudah terdaftar. Mohon gunakan NIK lain.");
      setActiveTab("pribadi");
      return;
    }

    setIsSubmitting(true);
    try {
      await createEmployee(values);
      toast.success("Karyawan berhasil ditambahkan");
      router.push(ROUTES.EMPLOYEES);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal menambah karyawan";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function onInvalid(errs: FieldErrors<CreateEmployeeInput>) {
    // Pindah ke tab pertama yang punya error.
    const firstField = Object.keys(errs)[0];
    if (firstField) {
      const tab = FIELD_TO_TAB[firstField];
      if (tab) setActiveTab(tab);
    }
    toast.error("Mohon lengkapi field yang wajib diisi");
  }

  function handleCancel() {
    if (isDirty) {
      setShowCancelDialog(true);
      return;
    }
    router.push(ROUTES.EMPLOYEES);
  }

  function confirmCancel() {
    setShowCancelDialog(false);
    router.push(ROUTES.EMPLOYEES);
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="space-y-6"
      noValidate
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabKey)}
      >
        <TabsList className="h-auto w-full justify-start gap-1 bg-muted/60 p-1">
          {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
            <TabsTrigger
              key={key}
              value={key}
              className="h-9 gap-2 px-4"
            >
              <span>{TAB_LABELS[key]}</span>
              {tabsWithErrors.has(key) && (
                <span
                  aria-label="Ada error"
                  className="inline-block size-2 rounded-full bg-destructive"
                />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* TAB 1 - DATA PRIBADI */}
        <TabsContent value="pribadi" className="mt-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FieldRow label="NIK" htmlFor="nik" error={nikMessage ?? undefined}>
                <div className="relative">
                  <Input
                    id="nik"
                    placeholder="Nomor Induk Kependudukan"
                    className="pr-9"
                    {...register("nik", {
                      onBlur: (e) => handleNikBlur(e.target.value),
                    })}
                  />
                  <UniquenessIcon state={nikState} />
                </div>
              </FieldRow>

              <FieldRow
                label="NIP"
                required
                htmlFor="nip"
                error={errors.nip?.message ?? nipMessage ?? undefined}
              >
                <div className="relative">
                  <Input
                    id="nip"
                    placeholder="Nomor Induk Pegawai"
                    className="pr-9"
                    {...register("nip", {
                      onBlur: (e) => handleNipBlur(e.target.value),
                    })}
                  />
                  <UniquenessIcon state={nipState} />
                </div>
              </FieldRow>

              <FieldRow
                label="Nama Lengkap"
                required
                htmlFor="nama_lengkap"
                error={errors.nama_lengkap?.message}
                className="md:col-span-2"
              >
                <Input
                  id="nama_lengkap"
                  placeholder="Nama lengkap karyawan"
                  {...register("nama_lengkap")}
                />
              </FieldRow>

              <FieldRow
                label="Jenis Kelamin"
                required
                error={errors.jenis_kelamin?.message}
                className="md:col-span-2"
              >
                <Controller
                  control={control}
                  name="jenis_kelamin"
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={(v) => field.onChange(v as string)}
                      className="flex flex-row gap-6"
                    >
                      {JENIS_KELAMIN_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className="flex items-center gap-2 text-sm"
                        >
                          <RadioGroupItem value={opt.value} />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  )}
                />
              </FieldRow>

              <FieldRow
                label="Tempat Lahir"
                htmlFor="tempat_lahir"
                error={errors.tempat_lahir?.message}
              >
                <Input id="tempat_lahir" {...register("tempat_lahir")} />
              </FieldRow>

              <FieldRow
                label="Tanggal Lahir"
                htmlFor="tanggal_lahir"
                error={errors.tanggal_lahir?.message}
              >
                <Input
                  id="tanggal_lahir"
                  type="date"
                  {...register("tanggal_lahir")}
                />
              </FieldRow>

              <FieldRow
                label="Alamat"
                htmlFor="alamat"
                error={errors.alamat?.message}
                className="md:col-span-2"
              >
                <Textarea id="alamat" rows={3} {...register("alamat")} />
              </FieldRow>

              <FieldRow
                label="Kota Domisili"
                htmlFor="kota_domisili"
                error={errors.kota_domisili?.message}
              >
                <Input id="kota_domisili" {...register("kota_domisili")} />
              </FieldRow>

              <FieldRow
                label="Handphone"
                htmlFor="handphone"
                error={errors.handphone?.message}
              >
                <Input
                  id="handphone"
                  type="tel"
                  inputMode="tel"
                  {...register("handphone")}
                />
              </FieldRow>

              <FieldRow
                label="Email"
                htmlFor="email"
                error={errors.email?.message}
                className="md:col-span-2"
              >
                <Input id="email" type="email" {...register("email")} />
              </FieldRow>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2 - KEPEGAWAIAN */}
        <TabsContent value="kepegawaian" className="mt-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FieldRow
                label="Status Pegawai"
                required
                error={errors.status_pegawai?.message}
              >
                <Controller
                  control={control}
                  name="status_pegawai"
                  render={({ field }) => (
                    <SelectField
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      options={STATUS_PEGAWAI_OPTIONS}
                      placeholder="Pilih status pegawai"
                      invalid={!!errors.status_pegawai}
                    />
                  )}
                />
              </FieldRow>

              <FieldRow
                label="Status Kontrak"
                error={errors.status_kontrak?.message}
              >
                <Controller
                  control={control}
                  name="status_kontrak"
                  render={({ field }) => (
                    <SelectField
                      value={(field.value as string) ?? ""}
                      onChange={field.onChange}
                      options={STATUS_KONTRAK_OPTIONS}
                      placeholder="Pilih status kontrak"
                      allowClear
                    />
                  )}
                />
              </FieldRow>

              <FieldRow
                label="Status Kerja"
                error={errors.status_kerja?.message}
              >
                <Controller
                  control={control}
                  name="status_kerja"
                  render={({ field }) => (
                    <SelectField
                      value={(field.value as string) ?? ""}
                      onChange={field.onChange}
                      options={STATUS_KERJA_OPTIONS}
                      placeholder="Pilih status kerja"
                    />
                  )}
                />
              </FieldRow>

              <FieldRow label="Provider" error={errors.provider?.message}>
                <Controller
                  control={control}
                  name="provider"
                  render={({ field }) => (
                    <SelectField
                      value={(field.value as string) ?? ""}
                      onChange={field.onChange}
                      options={PROVIDER_OPTIONS}
                      placeholder="Pilih provider"
                      allowClear
                    />
                  )}
                />
              </FieldRow>

              <FieldRow label="Lokasi Kerja" htmlFor="lokasi_kerja">
                <Input
                  id="lokasi_kerja"
                  value="Bandar Udara Ngurah Rai"
                  readOnly
                  className="bg-muted/40"
                />
              </FieldRow>

              <FieldRow label="Cabang" htmlFor="cabang">
                <Input id="cabang" value="DPS" readOnly className="bg-muted/40" />
              </FieldRow>

              <FieldRow
                label="Unit Organisasi"
                required
                error={errors.unit_organisasi?.message}
              >
                <Controller
                  control={control}
                  name="unit_organisasi"
                  render={({ field }) => (
                    <SelectField
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      options={UNIT_ORGANISASI_OPTIONS}
                      placeholder="Pilih unit organisasi"
                      invalid={!!errors.unit_organisasi}
                    />
                  )}
                />
              </FieldRow>

              <FieldRow
                label="Kode Organisasi"
                htmlFor="kode_organisasi"
                error={errors.kode_organisasi?.message}
              >
                <Input
                  id="kode_organisasi"
                  placeholder="Otomatis dari unit"
                  {...register("kode_organisasi")}
                />
              </FieldRow>

              <FieldRow
                label="Nama Organisasi"
                htmlFor="nama_organisasi"
                error={errors.nama_organisasi?.message}
                className="md:col-span-2"
              >
                <Input
                  id="nama_organisasi"
                  placeholder="Otomatis dari unit"
                  {...register("nama_organisasi")}
                />
              </FieldRow>

              <FieldRow label="Unit / Nama Unit" error={errors.unit_id?.message}>
                <Controller
                  control={control}
                  name="unit_id"
                  render={({ field }) => {
                    const current =
                      field.value === "" || field.value == null
                        ? NONE_VALUE
                        : String(field.value);
                    return (
                      <Select
                        value={current}
                        onValueChange={(next) => {
                          const asString = next as string;
                          field.onChange(
                            asString === NONE_VALUE ? "" : asString,
                          );
                        }}
                      >
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue>
                            {(c: string) =>
                              c === NONE_VALUE ? (
                                <span className="text-muted-foreground">
                                  {isLoadingUnits
                                    ? "Memuat unit..."
                                    : units.length === 0
                                      ? "Tidak ada unit tersedia"
                                      : "Pilih unit"}
                                </span>
                              ) : (
                                <span>
                                  {units.find((u) => String(u.id) === c)?.nama ??
                                    c}
                                </span>
                              )
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>
                            <span className="text-muted-foreground">
                              Pilih unit
                            </span>
                          </SelectItem>
                          {units.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.nama}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  }}
                />
              </FieldRow>

              <FieldRow
                label="Sub Unit Organisasi"
                error={errors.sub_unit_id?.message}
              >
                <Controller
                  control={control}
                  name="sub_unit_id"
                  render={({ field }) => {
                    const current =
                      field.value === "" || field.value == null
                        ? NONE_VALUE
                        : String(field.value);
                    return (
                      <Select
                        value={current}
                        onValueChange={(next) => {
                          const asString = next as string;
                          if (asString === NONE_VALUE) {
                            field.onChange("");
                            setValue("sub_unit_organisasi", "");
                          } else {
                            field.onChange(asString);
                            const picked = subUnits.find(
                              (s) => String(s.id) === asString,
                            );
                            if (picked) {
                              setValue("sub_unit_organisasi", picked.nama);
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue>
                            {(c: string) =>
                              c === NONE_VALUE ? (
                                <span className="text-muted-foreground">
                                  {isLoadingSubUnits
                                    ? "Memuat sub unit..."
                                    : !watchedUnitId
                                      ? "Pilih unit terlebih dahulu"
                                      : subUnits.length === 0
                                        ? "Tidak ada sub unit"
                                        : "Pilih sub unit"}
                                </span>
                              ) : (
                                <span>
                                  {subUnits.find((s) => String(s.id) === c)
                                    ?.nama ?? c}
                                </span>
                              )
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>
                            <span className="text-muted-foreground">
                              Pilih sub unit
                            </span>
                          </SelectItem>
                          {subUnits.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.nama}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  }}
                />
              </FieldRow>

              <FieldRow
                label="Nama Jabatan"
                required
                htmlFor="nama_jabatan"
                error={errors.nama_jabatan?.message}
              >
                <Input id="nama_jabatan" {...register("nama_jabatan")} />
              </FieldRow>

              <FieldRow
                label="Jabatan"
                htmlFor="jabatan"
                error={errors.jabatan?.message}
              >
                <Input id="jabatan" {...register("jabatan")} />
              </FieldRow>

              <FieldRow
                label="Kelompok Jabatan"
                required
                error={errors.kelompok_jabatan?.message}
              >
                <Controller
                  control={control}
                  name="kelompok_jabatan"
                  render={({ field }) => (
                    <SelectField
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      options={KELOMPOK_JABATAN_OPTIONS}
                      placeholder="Pilih kelompok jabatan"
                      invalid={!!errors.kelompok_jabatan}
                    />
                  )}
                />
              </FieldRow>

              <FieldRow
                label="Kelas Jabatan"
                htmlFor="kelas_jabatan"
                error={errors.kelas_jabatan?.message}
              >
                <Input id="kelas_jabatan" {...register("kelas_jabatan")} />
              </FieldRow>

              <FieldRow
                label="Unit Kerja Kontrak"
                htmlFor="unit_kerja_kontrak"
                error={errors.unit_kerja_kontrak?.message}
              >
                <Input
                  id="unit_kerja_kontrak"
                  {...register("unit_kerja_kontrak")}
                />
              </FieldRow>

              <FieldRow
                label="Grade"
                htmlFor="grade"
                error={errors.grade?.message}
              >
                <Input id="grade" {...register("grade")} />
              </FieldRow>

              <FieldRow
                label="Kategori Karyawan"
                htmlFor="kategori_karyawan"
                error={errors.kategori_karyawan?.message}
              >
                <Input
                  id="kategori_karyawan"
                  {...register("kategori_karyawan")}
                />
              </FieldRow>

              <FieldRow
                label="TMT Mulai Kerja"
                htmlFor="tmt_mulai_kerja"
                error={errors.tmt_mulai_kerja?.message}
              >
                <Input
                  id="tmt_mulai_kerja"
                  type="date"
                  {...register("tmt_mulai_kerja")}
                />
              </FieldRow>

              <FieldRow
                label="TMT Berakhir Kerja"
                htmlFor="tmt_berakhir_kerja"
                error={errors.tmt_berakhir_kerja?.message}
              >
                <Input
                  id="tmt_berakhir_kerja"
                  type="date"
                  {...register("tmt_berakhir_kerja")}
                />
              </FieldRow>

              <FieldRow
                label="TMT Mulai Jabatan"
                htmlFor="tmt_mulai_jabatan"
                error={errors.tmt_mulai_jabatan?.message}
              >
                <Input
                  id="tmt_mulai_jabatan"
                  type="date"
                  {...register("tmt_mulai_jabatan")}
                />
              </FieldRow>

              <FieldRow
                label="TMT Akhir Jabatan"
                htmlFor="tmt_akhir_jabatan"
                error={errors.tmt_akhir_jabatan?.message}
              >
                <Input
                  id="tmt_akhir_jabatan"
                  type="date"
                  {...register("tmt_akhir_jabatan")}
                />
              </FieldRow>

              <FieldRow
                label="TMT Berakhir Jabatan"
                htmlFor="tmt_berakhir_jabatan"
                error={errors.tmt_berakhir_jabatan?.message}
              >
                <Input
                  id="tmt_berakhir_jabatan"
                  type="date"
                  {...register("tmt_berakhir_jabatan")}
                />
              </FieldRow>

              <FieldRow
                label="TMT Pensiun"
                htmlFor="tmt_pensiun"
                error={errors.tmt_pensiun?.message}
              >
                <Input
                  id="tmt_pensiun"
                  type="date"
                  {...register("tmt_pensiun")}
                />
              </FieldRow>

              <FieldRow
                label="No BPJS Kesehatan"
                htmlFor="no_bpjs_kesehatan"
                error={errors.no_bpjs_kesehatan?.message}
              >
                <Input
                  id="no_bpjs_kesehatan"
                  {...register("no_bpjs_kesehatan")}
                />
              </FieldRow>

              <FieldRow
                label="No BPJS Ketenagakerjaan"
                htmlFor="no_bpjs_ketenagakerjaan"
                error={errors.no_bpjs_ketenagakerjaan?.message}
              >
                <Input
                  id="no_bpjs_ketenagakerjaan"
                  {...register("no_bpjs_ketenagakerjaan")}
                />
              </FieldRow>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3 - PENDIDIKAN */}
        <TabsContent value="pendidikan" className="mt-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FieldRow
                label="Pendidikan"
                htmlFor="pendidikan"
                error={errors.pendidikan?.message}
              >
                <Input id="pendidikan" {...register("pendidikan")} />
              </FieldRow>

              <FieldRow
                label="Pendidikan Terakhir"
                htmlFor="pendidikan_terakhir"
                error={errors.pendidikan_terakhir?.message}
              >
                <Input
                  id="pendidikan_terakhir"
                  {...register("pendidikan_terakhir")}
                />
              </FieldRow>

              <FieldRow
                label="Instansi Pendidikan"
                htmlFor="instansi_pendidikan"
                error={errors.instansi_pendidikan?.message}
                className="md:col-span-2"
              >
                <Input
                  id="instansi_pendidikan"
                  {...register("instansi_pendidikan")}
                />
              </FieldRow>

              <FieldRow
                label="Jurusan"
                htmlFor="jurusan"
                error={errors.jurusan?.message}
              >
                <Input id="jurusan" {...register("jurusan")} />
              </FieldRow>

              <FieldRow
                label="Tahun Lulus"
                htmlFor="tahun_lulus"
                error={errors.tahun_lulus?.message}
              >
                <Input
                  id="tahun_lulus"
                  type="number"
                  inputMode="numeric"
                  {...register("tahun_lulus")}
                />
              </FieldRow>

              <FieldRow
                label="Remarks Pendidikan"
                htmlFor="remarks_pendidikan"
                error={errors.remarks_pendidikan?.message}
                className="md:col-span-2"
              >
                <Textarea
                  id="remarks_pendidikan"
                  rows={2}
                  {...register("remarks_pendidikan")}
                />
              </FieldRow>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4 - DATA TAMBAHAN */}
        <TabsContent value="tambahan" className="mt-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FieldRow
                label="Tinggi Badan (cm)"
                htmlFor="height"
                error={errors.height?.message}
              >
                <Input
                  id="height"
                  type="number"
                  inputMode="numeric"
                  {...register("height")}
                />
              </FieldRow>

              <FieldRow
                label="Berat Badan (kg)"
                htmlFor="weight"
                error={errors.weight?.message}
              >
                <Input
                  id="weight"
                  type="number"
                  inputMode="numeric"
                  {...register("weight")}
                />
              </FieldRow>

              <FieldRow
                label="Jenis Sepatu"
                error={errors.jenis_sepatu?.message}
              >
                <Controller
                  control={control}
                  name="jenis_sepatu"
                  render={({ field }) => (
                    <SelectField
                      value={(field.value as string) ?? ""}
                      onChange={field.onChange}
                      options={JENIS_SEPATU_OPTIONS}
                      placeholder="Pilih jenis sepatu"
                      allowClear
                    />
                  )}
                />
              </FieldRow>

              <FieldRow
                label="Ukuran Sepatu"
                error={errors.ukuran_sepatu?.message}
              >
                <Controller
                  control={control}
                  name="ukuran_sepatu"
                  render={({ field }) => (
                    <SelectField
                      value={(field.value as string) ?? ""}
                      onChange={field.onChange}
                      options={UKURAN_SEPATU_OPTIONS}
                      placeholder="Pilih ukuran sepatu"
                      allowClear
                    />
                  )}
                />
              </FieldRow>

              <FieldRow
                label="Seragam"
                htmlFor="seragam"
                error={errors.seragam?.message}
                className="md:col-span-2"
              >
                <Input id="seragam" {...register("seragam")} />
              </FieldRow>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action buttons */}
      <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-col-reverse gap-3 border-t border-border bg-background/95 px-6 py-4 backdrop-blur sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {isSubmitting ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>

      {/* Cancel confirm dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan perubahan?</DialogTitle>
            <DialogDescription>
              Data yang sudah Anda isi akan hilang. Apakah Anda yakin ingin
              kembali?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Tidak
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmCancel}
            >
              Ya, batalkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

function UniquenessIcon({ state }: { state: UniquenessState }) {
  if (state === "idle") return null;
  return (
    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
      {state === "checking" && (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      )}
      {state === "available" && (
        <Check className="size-4 text-green-600" aria-label="Tersedia" />
      )}
      {state === "taken" && (
        <X className="size-4 text-destructive" aria-label="Sudah terdaftar" />
      )}
      {state === "error" && (
        <X className="size-4 text-amber-500" aria-label="Gagal memeriksa" />
      )}
    </span>
  );
}
