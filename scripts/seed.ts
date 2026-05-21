/**
 * Seed do banco — cria dados mínimos pra desenvolver e testar F1+.
 *
 * Cria (idempotente):
 *   1. Clínica "Clínica Teste" (slug: clinica-teste)
 *   2. Auth user admin no Supabase Auth (default: admin@agendaclin.local)
 *   3. Linha em public.users espelhando o auth user (role: admin)
 *   4. Service "Limpeza dental" (30min, R$ 120,00)
 *   5. Professional "Dra. Ana" (sem login)
 *   6. professional_services ligando Dra. Ana a Limpeza dental
 *
 * Rodar: pnpm db:seed
 *
 * Variáveis opcionais (.env.local):
 *   SEED_ADMIN_EMAIL  default admin@agendaclin.local
 *   SEED_ADMIN_NAME   default "Admin Demo"
 *   SEED_CLINIC_SLUG  default clinica-teste
 *   SEED_CLINIC_NAME  default "Clínica Teste"
 */
import "./_env"; // carrega .env.local ANTES dos outros imports

import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { and, eq } from "drizzle-orm";

import { closeDbCli, dbCli as db } from "../lib/db/cli";
import {
  clinics,
  professionalServices,
  professionals,
  services,
  users,
} from "../lib/db/schema";

const SUPABASE_URL = required("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_SERVICE_KEY = required("SUPABASE_SERVICE_ROLE_KEY");

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@agendaclin.local";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Admin Demo";
const CLINIC_SLUG = process.env.SEED_CLINIC_SLUG ?? "clinica-teste";
const CLINIC_NAME = process.env.SEED_CLINIC_NAME ?? "Clínica Teste";

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Variável ${name} não definida em .env.local`);
    process.exit(1);
  }
  return v;
}

async function main() {
  console.log("→ Seed iniciado");

  // 1) Clínica --------------------------------------------------------------
  let [clinic] = await db
    .select()
    .from(clinics)
    .where(eq(clinics.slug, CLINIC_SLUG));

  if (!clinic) {
    [clinic] = await db
      .insert(clinics)
      .values({
        slug: CLINIC_SLUG,
        name: CLINIC_NAME,
        contactEmail: ADMIN_EMAIL,
      })
      .returning();
    console.log(`  ✓ Clínica criada: ${clinic.name} (${clinic.id})`);
  } else {
    console.log(`  ↺ Clínica já existia: ${clinic.name}`);
  }

  // 2) Auth user no Supabase Auth -------------------------------------------
  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // listUsers retorna paginado; para o seed (1 clínica) a primeira página basta.
  const { data: list, error: listErr } = await supa.auth.admin.listUsers({
    perPage: 200,
  });
  if (listErr) throw listErr;

  let authUserId = list.users.find((u) => u.email === ADMIN_EMAIL)?.id;
  let generatedPassword: string | null = null;

  if (!authUserId) {
    // 16 bytes base64url ≈ 22 chars URL-safe.
    generatedPassword = randomBytes(16).toString("base64url");
    const { data, error } = await supa.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { name: ADMIN_NAME },
    });
    if (error) throw error;
    authUserId = data.user!.id;
    console.log(`  ✓ Auth user criado: ${ADMIN_EMAIL} (${authUserId})`);
  } else {
    console.log(`  ↺ Auth user já existia: ${ADMIN_EMAIL}`);
  }

  // 3) public.users (espelho) -----------------------------------------------
  const [existingUserRow] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUserId));

  if (!existingUserRow) {
    await db.insert(users).values({
      id: authUserId,
      clinicId: clinic.id,
      role: "admin",
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
    });
    console.log(`  ✓ users row criada`);
  } else {
    console.log(`  ↺ users row já existia`);
  }

  // 4) Service --------------------------------------------------------------
  const SERVICE_NAME = "Limpeza dental";
  let [service] = await db
    .select()
    .from(services)
    .where(
      and(eq(services.clinicId, clinic.id), eq(services.name, SERVICE_NAME)),
    );

  if (!service) {
    [service] = await db
      .insert(services)
      .values({
        clinicId: clinic.id,
        name: SERVICE_NAME,
        durationMinutes: 30,
        priceCents: 12000, // R$ 120,00
      })
      .returning();
    console.log(`  ✓ Service criado: ${service.name}`);
  } else {
    console.log(`  ↺ Service já existia: ${service.name}`);
  }

  // 5) Professional ---------------------------------------------------------
  const PRO_NAME = "Dra. Ana";
  let [pro] = await db
    .select()
    .from(professionals)
    .where(
      and(
        eq(professionals.clinicId, clinic.id),
        eq(professionals.name, PRO_NAME),
      ),
    );

  if (!pro) {
    [pro] = await db
      .insert(professionals)
      .values({
        clinicId: clinic.id,
        name: PRO_NAME,
      })
      .returning();
    console.log(`  ✓ Professional criado: ${pro.name}`);
  } else {
    console.log(`  ↺ Professional já existia: ${pro.name}`);
  }

  // 6) professional_services (link) -----------------------------------------
  const [existingLink] = await db
    .select()
    .from(professionalServices)
    .where(
      and(
        eq(professionalServices.professionalId, pro.id),
        eq(professionalServices.serviceId, service.id),
      ),
    );

  if (!existingLink) {
    await db.insert(professionalServices).values({
      professionalId: pro.id,
      serviceId: service.id,
    });
    console.log(`  ✓ professional_services link criado`);
  } else {
    console.log(`  ↺ professional_services link já existia`);
  }

  // Final -------------------------------------------------------------------
  console.log("\n✓ Seed concluído");

  if (generatedPassword) {
    console.log("\n────────── CREDENCIAIS DO ADMIN (mostradas só uma vez) ──────────");
    console.log(`  Email:  ${ADMIN_EMAIL}`);
    console.log(`  Senha:  ${generatedPassword}`);
    console.log("  Guarde no seu gerenciador de senhas.");
    console.log("──────────────────────────────────────────────────────────────────");
  } else {
    console.log(
      "\nObs: usuário já existia, senha não foi alterada. " +
        "Pra resetar use o painel Supabase (Auth → Users).",
    );
  }
}

main()
  .then(async () => {
    await closeDbCli();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("✗ Seed falhou:");
    console.error(err);
    await closeDbCli().catch(() => {});
    process.exit(1);
  });
