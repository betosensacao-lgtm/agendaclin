/**
 * Dialog com form de criar/editar serviço. Usa useActionState pra
 * orquestrar a Server Action, mostra fieldErrors do Zod inline e
 * fecha quando a action retorna ok.
 */
"use client";

import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { centsToPriceString } from "@/lib/format";
import type { Service } from "@/lib/db/schema";

import { saveServiceAction, type ServiceFormState } from "./actions";

const INITIAL_STATE: ServiceFormState = {};

export function ServiceFormDialog({
  service,
  open,
  onOpenChange,
}: {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(
    saveServiceAction,
    INITIAL_STATE,
  );

  // Fecha o dialog quando a action retorna ok.
  useEffect(() => {
    if (state.ok) onOpenChange(false);
  }, [state.ok, onOpenChange]);

  const isEditing = service !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar serviço" : "Novo serviço"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados do procedimento."
              : "Cadastre um novo procedimento da clínica."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {service && <input type="hidden" name="id" value={service.id} />}

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              defaultValue={service?.name ?? ""}
              required
              minLength={2}
              maxLength={100}
              placeholder="ex.: Limpeza dental"
              autoFocus
            />
            {state.fieldErrors?.name && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Duração (min)</Label>
              <Input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                min={5}
                max={600}
                step={5}
                defaultValue={service?.durationMinutes ?? 30}
                required
              />
              {state.fieldErrors?.durationMinutes && (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.durationMinutes}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input
                id="price"
                name="price"
                inputMode="decimal"
                placeholder="opcional, ex.: 120,00"
                defaultValue={centsToPriceString(service?.priceCents)}
              />
              {state.fieldErrors?.price && (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.price}
                </p>
              )}
            </div>
          </div>

          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
