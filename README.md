# agendaclin

SaaS de agendamento online para clínicas odontológicas e de estética. O paciente acessa um link público da clínica, escolhe serviço/profissional/horário e marca a consulta — sem precisar de login nem ligar para a secretária.

## Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Banco**: PostgreSQL via Supabase
- **Auth**: Supabase Auth (staff e profissionais)
- **ORM**: Drizzle ORM + drizzle-kit
- **UI**: Tailwind CSS 4 + shadcn/ui
- **Validação**: Zod
- **Email**: Resend + React Email
- **Datas**: date-fns + date-fns-tz (timezone fixo `America/Sao_Paulo`)
- **Anti-spam**: Cloudflare Turnstile
- **Testes**: Vitest

## Setup

1. Instalar dependências:
   ```powershell
   pnpm install
   ```

2. Copiar `.env.example` para `.env.local` e preencher:
   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Rodar migrations do banco (depois que o schema existir):
   ```powershell
   pnpm db:migrate
   ```

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | Sobe servidor de desenvolvimento em http://localhost:3000 |
| `pnpm build` | Build de produção (type-check + bundle) |
| `pnpm start` | Roda o build de produção localmente |
| `pnpm lint` | ESLint |
| `pnpm test` | Roda testes com Vitest |
| `pnpm db:migrate` | Aplica migrations Drizzle |
| `pnpm db:generate` | Gera nova migration a partir do schema |

## Estrutura

```
app/
  (public)/[slug]/      # Páginas públicas da clínica (agendar, confirmar, cancelar)
  (admin)/              # Painel da equipe (agenda, serviços, profissionais, horários)
  (pro)/                # Painel do profissional
  login/
components/
  ui/                   # shadcn/ui
  booking/              # ServicePicker, SlotGrid, BookingForm
lib/
  db/                   # Drizzle schema e queries
  auth/                 # Supabase SSR + guards de role
  booking/              # slots.ts, conflicts.ts
  email/                # Resend client + senders
  timezone.ts           # Wrapper America/Sao_Paulo
emails/                 # Templates React Email
drizzle/migrations/
scripts/seed.ts
tests/
```

## Roadmap (MVP)

Implementação por features, uma de cada vez:

- **F1** — Configuração da clínica (admin): serviços, profissionais
- **F2** — Disponibilidade semanal + bloqueios pontuais
- **F3** — Página pública de agendamento (paciente)
- **F4** — Painel da equipe (agenda, consultas)
- **F5** — Painel do profissional
- **F6** — Emails transacionais (confirmação + cancelamento via link)

Detalhes em [`docs/plan.md`](docs/plan.md) — fora do escopo do MVP: WhatsApp, Google Calendar, pagamento online, prontuário, app mobile, multi-timezone.
