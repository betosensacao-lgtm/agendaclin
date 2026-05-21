-- Migration aplicada manualmente via Supabase MCP (apply_migration) em 2026-05-21.
-- Habilita RLS em todas as tabelas. Sem CREATE POLICY = deny-all para
-- anon e authenticated (PostgREST). O role `postgres` (usado pelo app via
-- DATABASE_URL com Drizzle) tem BYPASSRLS=true e segue funcionando normal.
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.professional_services ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.weekly_availability ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.availability_overrides ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
