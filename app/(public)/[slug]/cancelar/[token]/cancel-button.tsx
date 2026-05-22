"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

import { cancelBookingAction } from "./actions";

export function CancelButton({
  clinicSlug,
  cancelToken,
}: {
  clinicSlug: string;
  cancelToken: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;

    setLoading(true);
    setError(null);

    const result = await cancelBookingAction(clinicSlug, cancelToken);

    if (result.ok) {
      // Redireciona para a página de confirmação que mostrará o status cancelado.
      router.push(`/${clinicSlug}/confirmado/${cancelToken}`);
      router.refresh();
    } else {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="destructive"
        onClick={handleCancel}
        disabled={loading}
        className="w-full sm:w-auto"
      >
        {loading ? "Cancelando…" : "Cancelar agendamento"}
      </Button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
