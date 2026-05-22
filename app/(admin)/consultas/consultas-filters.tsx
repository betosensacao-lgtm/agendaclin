/**
 * Filtros da tela /consultas: profissional + status. URL-driven.
 */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Professional = { id: string; name: string };

export function ConsultasFilters({
  professionals,
  professionalId,
  status,
}: {
  professionals: Professional[];
  professionalId: string | null;
  status: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      // Trocar filtros volta pra primeira página.
      params.delete("page");
      router.push(`/consultas?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 p-3">
      <div className="space-y-1">
        <Label htmlFor="professional" className="text-xs">
          Profissional
        </Label>
        <select
          id="professional"
          value={professionalId ?? ""}
          onChange={(e) => setParam("professionalId", e.target.value || null)}
          className="h-9 rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Todos</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="status" className="text-xs">
          Status
        </Label>
        <select
          id="status"
          value={status ?? ""}
          onChange={(e) => setParam("status", e.target.value || null)}
          className="h-9 rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Todos</option>
          <option value="confirmed">Confirmadas</option>
          <option value="attended">Atendidas</option>
          <option value="cancelled">Canceladas</option>
          <option value="no_show">Faltas</option>
        </select>
      </div>

      <div className="ml-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/consultas")}
        >
          Limpar
        </Button>
      </div>
    </div>
  );
}
