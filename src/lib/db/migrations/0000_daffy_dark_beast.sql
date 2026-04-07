CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"user_email" varchar(255),
	"user_name" varchar(150),
	"activity" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"target_type" varchar(50),
	"target_id" uuid,
	"target_label" varchar(200),
	"metadata" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_setting" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_setting_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "employee" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"no" integer,
	"nip" varchar(30) NOT NULL,
	"nik" varchar(20),
	"nama_lengkap" varchar(200) NOT NULL,
	"jenis_kelamin" varchar(10),
	"tempat_lahir" varchar(100),
	"tanggal_lahir" date,
	"usia" integer,
	"alamat" text,
	"kota_domisili" varchar(100),
	"handphone" varchar(30),
	"email" varchar(255),
	"status_pegawai" varchar(50),
	"status_kontrak" varchar(50),
	"status_kerja" varchar(20) DEFAULT 'Non Aktif',
	"provider" varchar(100),
	"lokasi_kerja" varchar(200) DEFAULT 'Bandar Udara Ngurah Rai',
	"cabang" varchar(10) DEFAULT 'DPS',
	"kode_organisasi" varchar(10),
	"unit_organisasi" varchar(50),
	"nama_organisasi" varchar(200),
	"sub_unit_organisasi" varchar(200),
	"unit_id" bigint,
	"sub_unit_id" bigint,
	"nama_jabatan" varchar(200),
	"jabatan" varchar(200),
	"kelompok_jabatan" varchar(100),
	"kelas_jabatan" varchar(100),
	"unit_kerja_kontrak" varchar(255),
	"grade" varchar(50),
	"kategori_karyawan" varchar(100),
	"tmt_mulai_kerja" date,
	"tmt_berakhir_kerja" date,
	"tmt_mulai_jabatan" date,
	"tmt_akhir_jabatan" date,
	"tmt_berakhir_jabatan" date,
	"tmt_pensiun" date,
	"masa_kerja" varchar(50),
	"masa_kerja_bulan" varchar(20),
	"masa_kerja_tahun" varchar(20),
	"pendidikan" varchar(100),
	"pendidikan_terakhir" varchar(100),
	"instansi_pendidikan" varchar(200),
	"jurusan" varchar(200),
	"remarks_pendidikan" varchar(100),
	"tahun_lulus" integer,
	"no_bpjs_kesehatan" varchar(50),
	"no_bpjs_ketenagakerjaan" varchar(50),
	"height" integer,
	"weight" integer,
	"jenis_sepatu" varchar(50),
	"ukuran_sepatu" varchar(10),
	"seragam" varchar(100),
	"organization_id" integer,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employee_nip_unique" UNIQUE("nip"),
	CONSTRAINT "employee_nik_unique" UNIQUE("nik"),
	CONSTRAINT "employee_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "import_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"file_name" varchar(255) NOT NULL,
	"file_url" text,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"error_details" jsonb,
	"status" varchar(20) DEFAULT 'processing' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode_organisasi" varchar(10) NOT NULL,
	"nama_organisasi" varchar(200) NOT NULL,
	"unit_organisasi" varchar(50) NOT NULL,
	"parent_id" integer,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_kode_organisasi_unique" UNIQUE("kode_organisasi")
);
--> statement-breakpoint
CREATE TABLE "sub_unit" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"unit_id" bigint NOT NULL,
	"nama" varchar(200) NOT NULL,
	"kode" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"unit_organisasi" varchar(50) NOT NULL,
	"kode" varchar(10) NOT NULL,
	"nama" varchar(200) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supabase_auth_id" uuid NOT NULL,
	"nip" varchar(30) NOT NULL,
	"email" varchar(255),
	"full_name" varchar(200) NOT NULL,
	"role" varchar(20) DEFAULT 'staff' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"employee_id" bigint,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_supabase_auth_id_unique" UNIQUE("supabase_auth_id"),
	CONSTRAINT "user_nip_unique" UNIQUE("nip")
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_setting" ADD CONSTRAINT "app_setting_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee" ADD CONSTRAINT "employee_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee" ADD CONSTRAINT "employee_sub_unit_id_sub_unit_id_fk" FOREIGN KEY ("sub_unit_id") REFERENCES "public"."sub_unit"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee" ADD CONSTRAINT "employee_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_log" ADD CONSTRAINT "import_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_parent_id_organization_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_unit" ADD CONSTRAINT "sub_unit_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE set null ON UPDATE no action;