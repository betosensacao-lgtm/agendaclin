/**
 * Prova, contra um Postgres real, que a RLS de
 * drizzle/migrations/0002_real_tenant_rls.sql realmente isola tenants —
 * não só que o código da app filtra clinic_id (isso já era verdade
 * antes), mas que o PRÓPRIO BANCO recusa/filtra quando a role
 * app_runtime tenta ler ou escrever fora do clinic_id setado em
 * `app.clinic_id`.
 *
 * Requer TEST_DATABASE_URL apontando pra um banco (idealmente um projeto
 * Supabase de teste/staging, NUNCA produção) já com a migration 0002
 * aplicada e a role app_runtime criada com senha. Sem essa env var, os
 * testes são pulados — não quebra CI/dev machines sem acesso a um banco
 * real. Ver AGENTS.md / .env.example para como provisionar.
 *
 * Setup/teardown usam a mesma conexão app_runtime, aproveitando que
 * `clinics_tenant_insert`/`users_tenant_insert` permitem INSERT quando
 * nenhum app.clinic_id está setado (o mesmo caminho que o signup real
 * usa) — não precisa de uma segunda credencial admin só pra este teste.
 */
import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  bookings,
  clinics,
  professionals,
  services,
} from "@/lib/db/schema";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DATABASE_URL)("RLS real de tenant (app_runtime)", () => {
  const client = postgres(TEST_DATABASE_URL!, { max: 1 });
  const db = drizzle(client);

  let clinicA: string;
  let clinicB: string;
  let bookingA: string;
  let bookingB: string;

  // is_local=false (sessão, não transação) porque este helper roda fora de
  // uma transação explícita — a conexão de teste é única (max: 1) e
  // dedicada, então persistir no nível de sessão é seguro aqui. Em
  // produção (lib/db/tenant.ts) o mecanismo real usa is_local=true dentro
  // de uma transação por request — isso é só o setup deste teste.
  async function setClinicContext(clinicId: string | null) {
    await db.execute(
      sql`SELECT set_config('app.clinic_id', ${clinicId}, false)`,
    );
  }

  beforeAll(async () => {
    // Bootstrap: sem app.clinic_id setado, a policy de INSERT libera
    // criar uma clínica nova (mesmo caminho do signup real).
    await db.transaction(async (tx) => {
      const suffix = randomUUID().slice(0, 8);

      const [ca] = await tx
        .insert(clinics)
        .values({ slug: `rls-test-a-${suffix}`, name: "RLS Test Clinic A" })
        .returning({ id: clinics.id });
      const [cb] = await tx
        .insert(clinics)
        .values({ slug: `rls-test-b-${suffix}`, name: "RLS Test Clinic B" })
        .returning({ id: clinics.id });
      clinicA = ca.id;
      clinicB = cb.id;
    });

    // Cada linha (profissional, serviço, booking) é criada já dentro do
    // contexto da própria clínica — exercita o caminho normal, não o
    // bootstrap.
    async function seedBooking(clinicId: string) {
      return db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT set_config('app.clinic_id', ${clinicId}, true)`,
        );
        const [pro] = await tx
          .insert(professionals)
          .values({ clinicId, name: "Dra. Teste" })
          .returning({ id: professionals.id });
        const [svc] = await tx
          .insert(services)
          .values({ clinicId, name: "Consulta", durationMinutes: 30 })
          .returning({ id: services.id });
        const [booking] = await tx
          .insert(bookings)
          .values({
            clinicId,
            professionalId: pro.id,
            serviceId: svc.id,
            patientName: "Paciente Teste",
            patientPhone: "+10000000000",
            patientEmail: "paciente@example.test",
            startsAt: new Date("2026-09-01T10:00:00Z"),
            endsAt: new Date("2026-09-01T10:30:00Z"),
          })
          .returning({ id: bookings.id });
        return booking.id;
      });
    }

    bookingA = await seedBooking(clinicA);
    bookingB = await seedBooking(clinicB);
  });

  afterAll(async () => {
    // Cleanup roda com app.clinic_id setado pra cada clínica de teste —
    // sem isso, a policy tenant_all bloquearia o próprio DELETE.
    for (const id of [clinicA, clinicB]) {
      if (!id) continue;
      await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT set_config('app.clinic_id', ${id}, true)`);
        await tx.delete(bookings).where(sql`clinic_id = ${id}::uuid`);
        await tx.delete(services).where(sql`clinic_id = ${id}::uuid`);
        await tx.delete(professionals).where(sql`clinic_id = ${id}::uuid`);
      });
    }
    await client`DELETE FROM clinics WHERE id IN (${clinicA}, ${clinicB})`.catch(
      () => {
        // Se a policy de DELETE em clinics não liberar (não criamos uma
        // acima de propósito — não é necessária pro app hoje), as linhas
        // de teste ficam órfãs no banco de teste. Não é produção, tolerável.
      },
    );
    await client.end({ timeout: 5 });
  });

  it("clínica A consegue ler o próprio booking", async () => {
    await setClinicContext(clinicA);
    const rows = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(sql`id = ${bookingA}::uuid`);
    expect(rows).toHaveLength(1);
  });

  it("clínica A NÃO consegue ler o booking da clínica B", async () => {
    await setClinicContext(clinicA);
    const rows = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(sql`id = ${bookingB}::uuid`);
    expect(rows).toHaveLength(0);
  });

  it("clínica A NÃO consegue atualizar o booking da clínica B", async () => {
    await setClinicContext(clinicA);
    const rows = await db
      .update(bookings)
      .set({ status: "cancelled" })
      .where(sql`id = ${bookingB}::uuid`)
      .returning({ id: bookings.id });
    expect(rows).toHaveLength(0);

    // Confirma que o status realmente não mudou (lendo como clínica B).
    await setClinicContext(clinicB);
    const [row] = await db
      .select({ status: bookings.status })
      .from(bookings)
      .where(sql`id = ${bookingB}::uuid`);
    expect(row?.status).toBe("confirmed");
  });

  it("sem app.clinic_id setado, nenhuma clínica é legível", async () => {
    // Conexão nova e dedicada — a compartilhada pelo resto do arquivo já
    // teve app.clinic_id setado em nível de sessão (set_config(...,
    // false) no helper acima), então "resetar" nela não reproduz um
    // contexto genuinamente virgem (current_setting volta pra '', não
    // NULL). Uma transação de request real (withTenant) nunca sofre
    // disso — cada uma é uma transação nova onde SET LOCAL nunca tocou
    // a variável até ser explicitamente setada.
    const freshClient = postgres(TEST_DATABASE_URL!, { max: 1 });
    const freshDb = drizzle(freshClient);
    try {
      const rows = await freshDb
        .select({ id: bookings.id })
        .from(bookings)
        .where(sql`id IN (${bookingA}::uuid, ${bookingB}::uuid)`);
      expect(rows).toHaveLength(0);
    } finally {
      await freshClient.end({ timeout: 5 });
    }
  });

  it("clinics continua legível publicamente (landing pública por slug)", async () => {
    await setClinicContext(null);
    const rows = await db
      .select({ id: clinics.id })
      .from(clinics)
      .where(sql`id = ${clinicA}::uuid`);
    expect(rows).toHaveLength(1);
  });
});
