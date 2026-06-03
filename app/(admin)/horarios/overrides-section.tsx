/**
 * Time blocks list + create dialog.
 */
"use client";

import { useActionState, useEffect, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
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

import {
  createOverrideAction,
  deleteOverrideAction,
  type OverrideFormState,
} from "./actions";

export type OverrideRow = {
  id: string;
  professionalId: string | null;
  startsAt: string; // ISO UTC
  endsAt: string;
  reason: string | null;
};

type ProfessionalSummary = { id: string; name: string };

const INITIAL_STATE: OverrideFormState = {};

const TZ = "UTC";

function formatLocal(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: TZ,
    weekday: "short",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function OverridesSection({
  professionals,
  overrides,
}: {
  professionals: ProfessionalSummary[];
  overrides: OverrideRow[];
}) {
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="flex items-center justify-end">
        <Button onClick={() => setCreating(true)}>New block</Button>
      </div>

      {overrides.length === 0 ? (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          No time blocks added.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {overrides.map((o) => (
            <OverrideItem
              key={o.id}
              override={o}
              professionalName={
                o.professionalId
                  ? (professionals.find((p) => p.id === o.professionalId)
                      ?.name ?? "Removed provider")
                  : null
              }
            />
          ))}
        </ul>
      )}

      <OverrideDialog
        key={creating ? "open" : "closed"}
        professionals={professionals}
        open={creating}
        onOpenChange={setCreating}
      />
    </>
  );
}

function OverrideItem({
  override,
  professionalName,
}: {
  override: OverrideRow;
  professionalName: string | null;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Remove this time block?")) return;
    startTransition(async () => {
      await deleteOverrideAction(override.id);
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          {professionalName ? (
            <Badge variant="secondary">{professionalName}</Badge>
          ) : (
            <Badge variant="outline">Entire clinic</Badge>
          )}
          {override.reason && (
            <span className="text-muted-foreground">{override.reason}</span>
          )}
        </div>
        <div className="text-muted-foreground">
          {formatLocal(override.startsAt)} → {formatLocal(override.endsAt)}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={handleDelete}
      >
        Remove
      </Button>
    </li>
  );
}

function OverrideDialog({
  professionals,
  open,
  onOpenChange,
}: {
  professionals: ProfessionalSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(
    createOverrideAction,
    INITIAL_STATE,
  );
  const [scope, setScope] = useState<"professional" | "clinic">("professional");

  useEffect(() => {
    if (state.ok) onOpenChange(false);
  }, [state.ok, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New time block</DialogTitle>
          <DialogDescription>
            Block a time interval when the provider (or the entire clinic)
            is unavailable.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label>Scope</Label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="scope"
                  value="professional"
                  checked={scope === "professional"}
                  onChange={() => setScope("professional")}
                />
                Single provider
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="scope"
                  value="clinic"
                  checked={scope === "clinic"}
                  onChange={() => setScope("clinic")}
                />
                Entire clinic
              </label>
            </div>
          </div>

          {scope === "professional" && (
            <div className="space-y-2">
              <Label htmlFor="professionalId">Provider</Label>
              <select
                id="professionalId"
                name="professionalId"
                required
                className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                defaultValue={professionals[0]?.id ?? ""}
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.professionalId && (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.professionalId}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startsAt">Start</Label>
              <Input
                id="startsAt"
                name="startsAt"
                type="datetime-local"
                required
              />
              {state.fieldErrors?.startsAt && (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.startsAt}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsAt">End</Label>
              <Input
                id="endsAt"
                name="endsAt"
                type="datetime-local"
                required
              />
              {state.fieldErrors?.endsAt && (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.endsAt}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input
              id="reason"
              name="reason"
              maxLength={200}
              placeholder="e.g. Holiday, conference, extended lunch"
            />
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
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Create block"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
