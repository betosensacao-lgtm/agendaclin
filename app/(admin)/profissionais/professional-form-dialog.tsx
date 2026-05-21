/**
 * Dialog com form de criar/editar profissional. Inclui multi-select
 * (checkboxes) dos serviços que o profissional atende.
 *
 * Os checkboxes do shadcn (@base-ui) não emitem para FormData
 * automaticamente — usamos um <input type="hidden" name="serviceIds">
 * por id selecionado pra manter compatibilidade com o submit nativo.
 */
"use client";

import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

import type { Service } from "@/lib/db/schema";
import type { ProfessionalWithServices } from "@/lib/db/queries/professionals";

import {
  saveProfessionalAction,
  type ProfessionalFormState,
} from "./actions";

const INITIAL_STATE: ProfessionalFormState = {};

export function ProfessionalFormDialog({
  professional,
  availableServices,
  open,
  onOpenChange,
}: {
  professional: ProfessionalWithServices | null;
  availableServices: Service[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(
    saveProfessionalAction,
    INITIAL_STATE,
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(professional?.services.map((s) => s.id) ?? []);
  });

  // Fecha quando action volta ok.
  useEffect(() => {
    if (state.ok) onOpenChange(false);
  }, [state.ok, onOpenChange]);

  const isEditing = professional !== null;

  function toggleService(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar profissional" : "Novo profissional"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize o nome e os serviços vinculados."
              : "Cadastre um novo profissional da clínica."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {professional && (
            <input type="hidden" name="id" value={professional.id} />
          )}
          {Array.from(selectedIds).map((id) => (
            <input key={id} type="hidden" name="serviceIds" value={id} />
          ))}

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              defaultValue={professional?.name ?? ""}
              required
              minLength={2}
              maxLength={100}
              placeholder="ex.: Dra. Ana"
              autoFocus
            />
            {state.fieldErrors?.name && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Serviços atendidos</Label>
            {availableServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum serviço ativo cadastrado. Crie serviços antes de
                vincular profissionais.
              </p>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                {availableServices.map((service) => (
                  <label
                    key={service.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={selectedIds.has(service.id)}
                      onCheckedChange={(checked) =>
                        toggleService(service.id, checked === true)
                      }
                    />
                    <span>{service.name}</span>
                  </label>
                ))}
              </div>
            )}
            {state.fieldErrors?.serviceIds && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.serviceIds}
              </p>
            )}
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
