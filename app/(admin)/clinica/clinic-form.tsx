/**
 * Form de edição dos dados da clínica. Client Component porque usa
 * useActionState pra mostrar feedback inline (sucesso/erro por campo).
 */
"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { Clinic } from "@/lib/db/schema";

import { saveClinicAction, type ClinicFormState } from "./actions";

const INITIAL_STATE: ClinicFormState = {};

export function ClinicForm({ clinic }: { clinic: Clinic }) {
  const [state, formAction, pending] = useActionState(
    saveClinicAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {/* Identidade — slug e timezone não editáveis no MVP */}
      <fieldset className="grid gap-4 rounded-md border p-4 sm:grid-cols-2">
        <legend className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Identidade
        </legend>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Nome da clínica</Label>
          <Input
            id="name"
            name="name"
            defaultValue={clinic.name}
            required
            minLength={2}
            maxLength={120}
          />
          {state.fieldErrors?.name && (
            <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Slug (URL)</Label>
          <Input value={`/${clinic.slug}`} readOnly className="bg-muted/40" />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Fuso horário</Label>
          <Input value={clinic.timezone} readOnly className="bg-muted/40" />
        </div>
      </fieldset>

      {/* Contato */}
      <fieldset className="space-y-4 rounded-md border p-4">
        <legend className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Contato
        </legend>

        <div className="space-y-2">
          <Label htmlFor="contactEmail">E-mail de contato</Label>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={clinic.contactEmail ?? ""}
            placeholder="contato@clinica.com.br"
          />
          <p className="text-xs text-muted-foreground">
            Recebe notificações de novos agendamentos e cancelamentos.
          </p>
          {state.fieldErrors?.contactEmail && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.contactEmail}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone / WhatsApp</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={clinic.phone ?? ""}
            placeholder="(11) 91234-5678"
            maxLength={40}
          />
          {state.fieldErrors?.phone && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.phone}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Endereço</Label>
          <textarea
            id="address"
            name="address"
            defaultValue={clinic.address ?? ""}
            placeholder="Rua, número, bairro, cidade — UF"
            rows={3}
            maxLength={300}
            className="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {state.fieldErrors?.address && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.address}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="hoursText">Horário de funcionamento</Label>
          <Input
            id="hoursText"
            name="hoursText"
            defaultValue={clinic.hoursText ?? ""}
            placeholder="Seg-Sex 9h-18h, Sáb 9h-13h"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">
            Texto livre exibido na landing pública (não afeta a geração de
            slots — para isso use a tela /horarios).
          </p>
          {state.fieldErrors?.hoursText && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.hoursText}
            </p>
          )}
        </div>
      </fieldset>

      {/* Visual */}
      <fieldset className="space-y-4 rounded-md border p-4">
        <legend className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Visual
        </legend>

        <div className="space-y-2">
          <Label htmlFor="logoUrl">URL da logo</Label>
          <Input
            id="logoUrl"
            name="logoUrl"
            type="url"
            defaultValue={clinic.logoUrl ?? ""}
            placeholder="https://..."
          />
          <p className="text-xs text-muted-foreground">
            Cole a URL pública da imagem (PNG/SVG, ideal ≤ 200 KB).
          </p>
          {state.fieldErrors?.logoUrl && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.logoUrl}
            </p>
          )}
        </div>
      </fieldset>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="text-sm">
          {state.error && (
            <span className="text-destructive" role="alert">
              {state.error}
            </span>
          )}
          {state.ok && (
            <span className="text-muted-foreground">
              Salvo às {new Date().toLocaleTimeString("pt-BR")}.
            </span>
          )}
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
