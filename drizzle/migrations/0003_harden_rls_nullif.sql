-- Blinda as policies tenant-scoped da 0002 contra `app.clinic_id` chegando
-- como string vazia em vez de NULL.
--
-- O problema: `current_setting('app.clinic_id', true)` devolve NULL só
-- enquanto a GUC nunca foi tocada na sessão. Depois que alguém roda
-- `set_config('app.clinic_id', NULL, false)`, uma GUC placeholder passa a
-- valer '' (string vazia), não NULL. Aí `''::uuid` levanta erro de cast
-- (SQLSTATE 22P02, "invalid input syntax for type uuid") em vez de
-- simplesmente negar acesso — a policy explode em vez de fechar.
--
-- Onde isso aparece na prática: sob o pooler em transaction-mode
-- (Supavisor), uma connection física é reaproveitada entre clientes
-- lógicos diferentes, então um `set_config` de nível de SESSÃO deixado por
-- um cliente anterior pode ser herdado pela próxima transação. O código de
-- produção não faz isso — `lib/db/tenant.ts::withTenant` só usa SET LOCAL,
-- que o COMMIT/ROLLBACK garante resetar — mas a policy não deve depender
-- de todo chamador presente e futuro acertar isso.
--
-- A correção: `nullif(current_setting('app.clinic_id', true), '')`
-- normaliza '' para NULL ANTES do cast. A comparação vira `coluna = NULL`,
-- que é NULL (nunca true), então a policy nega de forma limpa — fail-closed
-- em vez de erro. O caso "nunca setado" continua funcionando igual.
--
-- Usa ALTER POLICY (não DROP/CREATE) de propósito: preserva comando, roles
-- alvo e nome, então não há janela em que a tabela fica sem policy.
--
-- ESTADO EM PRODUÇÃO: este conteúdo JÁ foi aplicado no banco em
-- 2026-08-22 (histórico do Supabase: `harden_rls_null_vs_empty_string`,
-- 17:32Z, e reaplicado como `harden_rls_nullif` às 19:03Z). Este arquivo
-- existe para que o git seja a fonte da verdade e um ambiente novo que
-- aplique 0000→0003 chegue no mesmo estado — a 0002 sozinha deixaria as
-- policies na forma antiga. Reaplicar é no-op seguro: ALTER POLICY para a
-- mesma expressão não muda nada.
--
-- Não toca em: clinics_public_read, services_cron_read,
-- professionals_cron_read, bookings_cron_read, bookings_cron_mark_reminder
-- — nenhuma delas lê app.clinic_id.

-- ---------------------------------------------------------------------
-- clinics
-- ---------------------------------------------------------------------
ALTER POLICY clinics_tenant_insert ON public.clinics
  WITH CHECK (
    nullif(current_setting('app.clinic_id', true), '') IS NULL
    OR id = nullif(current_setting('app.clinic_id', true), '')::uuid
  );--> statement-breakpoint

ALTER POLICY clinics_tenant_write ON public.clinics
  USING (id = nullif(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (id = nullif(current_setting('app.clinic_id', true), '')::uuid);--> statement-breakpoint

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
ALTER POLICY users_tenant_select ON public.users
  USING (clinic_id = nullif(current_setting('app.clinic_id', true), '')::uuid);--> statement-breakpoint

ALTER POLICY users_tenant_insert ON public.users
  WITH CHECK (
    nullif(current_setting('app.clinic_id', true), '') IS NULL
    OR clinic_id = nullif(current_setting('app.clinic_id', true), '')::uuid
  );--> statement-breakpoint

ALTER POLICY users_tenant_write ON public.users
  USING (clinic_id = nullif(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = nullif(current_setting('app.clinic_id', true), '')::uuid);--> statement-breakpoint

ALTER POLICY users_tenant_delete ON public.users
  USING (clinic_id = nullif(current_setting('app.clinic_id', true), '')::uuid);--> statement-breakpoint

-- ---------------------------------------------------------------------
-- services, professionals, availability_overrides — clinic_id direto
-- ---------------------------------------------------------------------
ALTER POLICY services_tenant_all ON public.services
  USING (clinic_id = nullif(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = nullif(current_setting('app.clinic_id', true), '')::uuid);--> statement-breakpoint

ALTER POLICY professionals_tenant_all ON public.professionals
  USING (clinic_id = nullif(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = nullif(current_setting('app.clinic_id', true), '')::uuid);--> statement-breakpoint

ALTER POLICY availability_overrides_tenant_all ON public.availability_overrides
  USING (clinic_id = nullif(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = nullif(current_setting('app.clinic_id', true), '')::uuid);--> statement-breakpoint

-- ---------------------------------------------------------------------
-- professional_services, weekly_availability — clinic_id via join
-- ---------------------------------------------------------------------
ALTER POLICY professional_services_tenant_all ON public.professional_services
  USING (
    EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.id = professional_services.professional_id
        AND p.clinic_id = nullif(current_setting('app.clinic_id', true), '')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.id = professional_services.professional_id
        AND p.clinic_id = nullif(current_setting('app.clinic_id', true), '')::uuid
    )
  );--> statement-breakpoint

ALTER POLICY weekly_availability_tenant_all ON public.weekly_availability
  USING (
    EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.id = weekly_availability.professional_id
        AND p.clinic_id = nullif(current_setting('app.clinic_id', true), '')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.id = weekly_availability.professional_id
        AND p.clinic_id = nullif(current_setting('app.clinic_id', true), '')::uuid
    )
  );--> statement-breakpoint

-- ---------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------
ALTER POLICY bookings_tenant_all ON public.bookings
  USING (clinic_id = nullif(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = nullif(current_setting('app.clinic_id', true), '')::uuid);
