/**
 * Schema do banco — fonte da verdade do modelo de dados do agendaclin.
 *
 * Convenções:
 * - Todas as tabelas de negócio carregam `clinic_id` (preparação multi-tenant).
 * - Timestamps em `timestamptz` (UTC no banco; conversão p/ America/Sao_Paulo
 *   acontece só na borda — UI e emails).
 * - IDs são UUID v4 gerados no banco (`gen_random_uuid()` — extensão pgcrypto).
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---- Enums ----

export const userRoleEnum = pgEnum("user_role", ["admin", "professional"]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "confirmed",
  "cancelled",
  "attended",
  "no_show",
]);

// ---- Tabelas ----

export const clinics = pgTable("clinics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("America/Sao_Paulo"),
  // Email de contato exibido publicamente e usado como destinatário de
  // notificações para a equipe.
  contactEmail: text("contact_email"),
  // Campos exibidos na landing pública /[slug]. Todos opcionais para
  // não quebrar clínicas legadas sem esses dados preenchidos.
  phone: text("phone"),
  address: text("address"),
  /** Texto livre, ex.: "Seg-Sex 9h-18h, Sáb 9h-13h" */
  hoursText: text("hours_text"),
  /** URL pública da logo (CDN, Supabase Storage, etc). */
  logoUrl: text("logo_url"),
  /**
   * Flag de onboarding: true quando a clínica concluiu o wizard inicial
   * (configurou serviços, profissionais e horários). Layout admin
   * redireciona pra /onboarding se ainda false.
   */
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Espelha `auth.users` do Supabase. Mantemos só o que o app precisa
 * (clinic_id, role, name). `id` referencia auth.users(id) — a integridade
 * cross-schema é garantida via trigger ou via service-role no seed.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(), // = auth.users.id
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "restrict" }),
    role: userRoleEnum("role").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    clinicIdIdx: index("idx_users_clinic_id").on(t.clinicId),
  }),
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    priceCents: integer("price_cents"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    clinicIdIdx: index("idx_services_clinic_id").on(t.clinicId),
  }),
);

export const professionals = pgTable(
  "professionals",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    // user_id é opcional: profissional pode existir sem login (ex.: dentista
    // que não usa o sistema, mas tem horários geridos pela secretária).
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    clinicIdIdx: index("idx_professionals_clinic_id").on(t.clinicId),
    userIdIdx: index("idx_professionals_user_id").on(t.userId),
  }),
);

/** N:N entre profissional e serviço (quais serviços ele atende). */
export const professionalServices = pgTable(
  "professional_services",
  {
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.professionalId, t.serviceId] }),
    serviceIdIdx: index("idx_professional_services_service_id").on(t.serviceId),
  }),
);

/**
 * Disponibilidade semanal recorrente do profissional.
 * `weekday`: 0 = domingo, 6 = sábado (compatível com date-fns).
 * `start_time`/`end_time`: hora local da clínica (timezone fixo no MVP).
 * Múltiplas linhas no mesmo weekday representam faixas (ex.: 9-12 e 14-18).
 */
export const weeklyAvailability = pgTable(
  "weekly_availability",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(), // 0-6
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
  },
  (t) => ({
    professionalIdIdx: index("idx_weekly_availability_professional_id").on(t.professionalId),
  }),
);

/**
 * Exceções pontuais (feriados, bloqueios de almoço variável, eventos).
 * `professional_id` null = bloqueio que afeta a clínica inteira.
 */
export const availabilityOverrides = pgTable(
  "availability_overrides",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id").references(() => professionals.id, {
      onDelete: "cascade",
    }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    reason: text("reason"),
  },
  (t) => ({
    clinicIdIdx: index("idx_availability_overrides_clinic_id").on(t.clinicId),
    professionalIdIdx: index("idx_availability_overrides_professional_id").on(t.professionalId),
  }),
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "restrict" }),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    patientName: text("patient_name").notNull(),
    patientPhone: text("patient_phone").notNull(),
    patientEmail: text("patient_email").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: bookingStatusEnum("status").notNull().default("confirmed"),
    cancelToken: uuid("cancel_token")
      .notNull()
      .unique()
      .default(sql`gen_random_uuid()`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // Anti-double-booking: só pode haver UMA reserva "confirmed" por
    // profissional+horário. Cancelar libera o slot.
    uniqConfirmedSlot: uniqueIndex("uniq_confirmed_slot")
      .on(t.professionalId, t.startsAt)
      .where(sql`${t.status} = 'confirmed'`),
    clinicIdIdx: index("idx_bookings_clinic_id").on(t.clinicId),
    serviceIdIdx: index("idx_bookings_service_id").on(t.serviceId),
  }),
);

// ---- Types inferidos (uso em queries/Server Actions) ----

export type Clinic = typeof clinics.$inferSelect;
export type NewClinic = typeof clinics.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;

export type Professional = typeof professionals.$inferSelect;
export type NewProfessional = typeof professionals.$inferInsert;

export type WeeklyAvailability = typeof weeklyAvailability.$inferSelect;
export type NewWeeklyAvailability = typeof weeklyAvailability.$inferInsert;

export type AvailabilityOverride = typeof availabilityOverrides.$inferSelect;
export type NewAvailabilityOverride = typeof availabilityOverrides.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
