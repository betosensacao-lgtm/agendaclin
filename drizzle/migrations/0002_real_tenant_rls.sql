-- Substitui o RLS "deny-all" decorativo (0001) por isolamento real por
-- tenant. O problema do 0001: toda policy é avaliada só para os roles
-- `anon`/`authenticated` do PostgREST — o app nunca usa essas roles, ele
-- conecta via DATABASE_URL como `postgres`, que tem BYPASSRLS=true e
-- ignora RLS completamente. Ou seja, hoje o isolamento entre clínicas
-- depende 100% de cada query Drizzle lembrar de filtrar clinic_id, sem
-- nenhuma rede de segurança no banco.
--
-- Esta migration:
--   1. Cria uma role de runtime restrita (`app_runtime`), sem BYPASSRLS.
--   2. Cria policies reais, escopadas por `current_setting('app.clinic_id')`
--      — uma variável de sessão que a aplicação define via `SET LOCAL`
--      dentro de cada transação (ver lib/db/tenant.ts).
--
-- IMPORTANTE — não roda sozinha:
--   - As senhas das roles precisam ser definidas à parte (nunca commitar):
--       ALTER ROLE app_runtime PASSWORD '<senha forte gerada>';
--       ALTER ROLE app_cron    PASSWORD '<outra senha forte gerada>';
--   - DATABASE_URL (runtime) deve passar a usar `app_runtime` em vez de
--     `postgres`. DIRECT_URL (migrations/seed/CLI) continua com a role
--     admin — scripts de CLI seguem funcionando sem mudança. Nova var
--     CRON_DATABASE_URL usa `app_cron` (ver lib/db/cron.ts).
--   - Ver checklist de rollout no PR/plano antes de aplicar em produção.

-- ---------------------------------------------------------------------
-- 1. Roles restritas
--    app_runtime — tráfego normal do app (Next.js), sempre tenant-scoped.
--    app_cron    — só o job de lembrete de WhatsApp (lib/db/cron.ts),
--                   que precisa ler bookings de TODAS as clínicas pra
--                   varrer quem tem consulta em ~24h. Leitura ampliada
--                   (ver policies mais abaixo), nunca escrita fora do
--                   campo whatsapp_reminder_sent_at.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_cron') THEN
    CREATE ROLE app_cron LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;--> statement-breakpoint

GRANT USAGE ON SCHEMA public TO app_runtime, app_cron;--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.clinics,
  public.users,
  public.services,
  public.professionals,
  public.professional_services,
  public.weekly_availability,
  public.availability_overrides,
  public.bookings
TO app_runtime;--> statement-breakpoint

-- app_cron só lê (clinics/professionals/services, pra montar a mensagem)
-- e só escreve o timestamp de envio do lembrete — nunca dados de paciente
-- de outra clínica além do que a policy de SELECT já libera.
GRANT SELECT ON
  public.clinics,
  public.professionals,
  public.services
TO app_cron;--> statement-breakpoint

GRANT SELECT, UPDATE (whatsapp_reminder_sent_at) ON public.bookings TO app_cron;--> statement-breakpoint

-- ---------------------------------------------------------------------
-- 1b. Remove o conjunto de policies aplicado direto no banco em
--     2026-06-12/06-15 (migrations rls_policies_all_tables /
--     fix_rls_bookings_public_insert — nunca commitadas no git, achadas
--     só ao inspecionar o banco real antes de aplicar esta migration).
--     Eram baseadas em auth.uid() (via request.jwt.claims) e, embora
--     bem desenhadas, sofriam do MESMO bug: a role postgres com
--     BYPASSRLS=true nunca deixava a Postgres avaliar policy nenhuma.
--     Substituídas pelo mecanismo desta migration (current_setting
--     'app.clinic_id') para não deixar dois sistemas de RLS
--     sobrepostos na mesma tabela.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "availability_overrides: admin manages" ON public.availability_overrides;--> statement-breakpoint
DROP POLICY IF EXISTS "availability_overrides: public read" ON public.availability_overrides;--> statement-breakpoint
DROP POLICY IF EXISTS "bookings: admin delete" ON public.bookings;--> statement-breakpoint
DROP POLICY IF EXISTS "bookings: admin reads" ON public.bookings;--> statement-breakpoint
DROP POLICY IF EXISTS "bookings: admin update" ON public.bookings;--> statement-breakpoint
DROP POLICY IF EXISTS "bookings: professional reads own" ON public.bookings;--> statement-breakpoint
DROP POLICY IF EXISTS "bookings: public insert" ON public.bookings;--> statement-breakpoint
DROP POLICY IF EXISTS "clinics: admin update" ON public.clinics;--> statement-breakpoint
DROP POLICY IF EXISTS "clinics: public read" ON public.clinics;--> statement-breakpoint
DROP POLICY IF EXISTS "professional_services: admin manages" ON public.professional_services;--> statement-breakpoint
DROP POLICY IF EXISTS "professional_services: public read" ON public.professional_services;--> statement-breakpoint
DROP POLICY IF EXISTS "professionals: admin manages" ON public.professionals;--> statement-breakpoint
DROP POLICY IF EXISTS "professionals: public read" ON public.professionals;--> statement-breakpoint
DROP POLICY IF EXISTS "professionals: read own" ON public.professionals;--> statement-breakpoint
DROP POLICY IF EXISTS "services: admin manages" ON public.services;--> statement-breakpoint
DROP POLICY IF EXISTS "services: public read" ON public.services;--> statement-breakpoint
DROP POLICY IF EXISTS "users: insert self" ON public.users;--> statement-breakpoint
DROP POLICY IF EXISTS "users: read own" ON public.users;--> statement-breakpoint
DROP POLICY IF EXISTS "users: update own" ON public.users;--> statement-breakpoint
DROP POLICY IF EXISTS "weekly_availability: admin manages" ON public.weekly_availability;--> statement-breakpoint
DROP POLICY IF EXISTS "weekly_availability: public read" ON public.weekly_availability;--> statement-breakpoint

-- ---------------------------------------------------------------------
-- 2. clinics — diretório público (a landing /[slug] precisa ler nome,
--    horários, serviços etc. antes de qualquer login existir), mas
--    escrita só dentro do próprio tenant. INSERT é o caso especial do
--    signup: uma clínica nova nasce SEM contexto de tenant (é o próprio
--    ato de criar o tenant) — por isso o WITH CHECK de INSERT permite
--    quando app.clinic_id não está setado (fluxo de signup, server-only,
--    validado por schema+Turnstile) OU quando bate com o tenant atual
--    (não há caso de uso hoje, mas fecha o modelo).
-- ---------------------------------------------------------------------
CREATE POLICY clinics_public_read ON public.clinics
  FOR SELECT
  USING (true);--> statement-breakpoint

CREATE POLICY clinics_tenant_insert ON public.clinics
  FOR INSERT
  WITH CHECK (
    current_setting('app.clinic_id', true) IS NULL
    OR id = current_setting('app.clinic_id', true)::uuid
  );--> statement-breakpoint

CREATE POLICY clinics_tenant_write ON public.clinics
  FOR UPDATE
  USING (id = current_setting('app.clinic_id', true)::uuid)
  WITH CHECK (id = current_setting('app.clinic_id', true)::uuid);--> statement-breakpoint

-- ---------------------------------------------------------------------
-- 3. users — mesma lógica de bootstrap do signup (o admin da clínica
--    nova é inserido na mesma transação que cria a clínica).
-- ---------------------------------------------------------------------
CREATE POLICY users_tenant_select ON public.users
  FOR SELECT
  USING (clinic_id = current_setting('app.clinic_id', true)::uuid);--> statement-breakpoint

CREATE POLICY users_tenant_insert ON public.users
  FOR INSERT
  WITH CHECK (
    current_setting('app.clinic_id', true) IS NULL
    OR clinic_id = current_setting('app.clinic_id', true)::uuid
  );--> statement-breakpoint

CREATE POLICY users_tenant_write ON public.users
  FOR UPDATE
  USING (clinic_id = current_setting('app.clinic_id', true)::uuid)
  WITH CHECK (clinic_id = current_setting('app.clinic_id', true)::uuid);--> statement-breakpoint

CREATE POLICY users_tenant_delete ON public.users
  FOR DELETE
  USING (clinic_id = current_setting('app.clinic_id', true)::uuid);--> statement-breakpoint

-- ---------------------------------------------------------------------
-- 4. services, professionals, availability_overrides — clinic_id direto.
-- ---------------------------------------------------------------------
CREATE POLICY services_tenant_all ON public.services
  FOR ALL
  USING (clinic_id = current_setting('app.clinic_id', true)::uuid)
  WITH CHECK (clinic_id = current_setting('app.clinic_id', true)::uuid);--> statement-breakpoint

CREATE POLICY services_cron_read ON public.services
  FOR SELECT
  TO app_cron
  USING (true);--> statement-breakpoint

CREATE POLICY professionals_tenant_all ON public.professionals
  FOR ALL
  USING (clinic_id = current_setting('app.clinic_id', true)::uuid)
  WITH CHECK (clinic_id = current_setting('app.clinic_id', true)::uuid);--> statement-breakpoint

CREATE POLICY professionals_cron_read ON public.professionals
  FOR SELECT
  TO app_cron
  USING (true);--> statement-breakpoint

CREATE POLICY availability_overrides_tenant_all ON public.availability_overrides
  FOR ALL
  USING (clinic_id = current_setting('app.clinic_id', true)::uuid)
  WITH CHECK (clinic_id = current_setting('app.clinic_id', true)::uuid);--> statement-breakpoint

-- ---------------------------------------------------------------------
-- 5. professional_services, weekly_availability — sem clinic_id direto;
--    deriva via join com professionals.
-- ---------------------------------------------------------------------
CREATE POLICY professional_services_tenant_all ON public.professional_services
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.id = professional_services.professional_id
        AND p.clinic_id = current_setting('app.clinic_id', true)::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.id = professional_services.professional_id
        AND p.clinic_id = current_setting('app.clinic_id', true)::uuid
    )
  );--> statement-breakpoint

CREATE POLICY weekly_availability_tenant_all ON public.weekly_availability
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.id = weekly_availability.professional_id
        AND p.clinic_id = current_setting('app.clinic_id', true)::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.id = weekly_availability.professional_id
        AND p.clinic_id = current_setting('app.clinic_id', true)::uuid
    )
  );--> statement-breakpoint

-- ---------------------------------------------------------------------
-- 6. bookings — clinic_id direto. Os 3 fluxos públicos por cancel_token
--    (confirmado/cancelar/remarcar) sempre têm o slug da clínica na URL,
--    então resolvem o clinicId via getClinicBySlug e usam withTenant
--    normalmente — não precisam de uma policy à parte pro token. Se
--    alguém colar um cancel_token de outra clínica numa URL com slug
--    errado, clinic_id não bate e a query não retorna nada.
-- ---------------------------------------------------------------------
CREATE POLICY bookings_tenant_all ON public.bookings
  FOR ALL
  USING (clinic_id = current_setting('app.clinic_id', true)::uuid)
  WITH CHECK (clinic_id = current_setting('app.clinic_id', true)::uuid);--> statement-breakpoint

-- app_cron: leitura cross-tenant só pra varrer lembretes de 24h; a
-- escrita fica restrita à coluna whatsapp_reminder_sent_at pelo GRANT
-- column-level acima (mesmo com policy permissiva de UPDATE aqui, tentar
-- mudar qualquer outra coluna falha por falta de privilégio).
CREATE POLICY bookings_cron_read ON public.bookings
  FOR SELECT
  TO app_cron
  USING (true);--> statement-breakpoint

CREATE POLICY bookings_cron_mark_reminder ON public.bookings
  FOR UPDATE
  TO app_cron
  USING (true)
  WITH CHECK (true);
