/**
 * Filtros da /minha-agenda: data + visão (dia/semana).
 * Versão simplificada do AgendaFilters admin — sem filtro de profissional.
 */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MinhaAgendaFilters({
  date,
  view,
}: {
  date: string;
  view: "day" | "week";
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
      router.push(`/minha-agenda?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 p-3">
      <div className="space-y-1">
        <Label htmlFor="date" className="text-xs">
          Data
        </Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setParam("date", e.target.value)}
          className="h-9 w-[160px]"
        />
      </div>

      <div className="space-y-1">
        <span className="block text-xs">Visão</span>
        <div className="inline-flex h-9 items-center rounded-md border bg-background p-0.5 text-sm">
          <button
            type="button"
            onClick={() => setParam("view", "day")}
            className={`h-full rounded-sm px-3 transition-colors ${
              view === "day"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Dia
          </button>
          <button
            type="button"
            onClick={() => setParam("view", "week")}
            className={`h-full rounded-sm px-3 transition-colors ${
              view === "week"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Semana
          </button>
        </div>
      </div>

      <div className="ml-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/minha-agenda")}
        >
          Hoje
        </Button>
      </div>
    </div>
  );
}
