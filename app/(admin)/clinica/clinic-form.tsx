/**
 * Clinic settings form. Client Component using useActionState for inline feedback.
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
      {/* Identity — slug and timezone are read-only in MVP */}
      <fieldset className="grid gap-4 rounded-md border p-4 sm:grid-cols-2">
        <legend className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Identity
        </legend>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Clinic name</Label>
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
          <Label className="text-xs text-muted-foreground">Timezone</Label>
          <Input value={clinic.timezone} readOnly className="bg-muted/40" />
        </div>
      </fieldset>

      {/* Contact */}
      <fieldset className="space-y-4 rounded-md border p-4">
        <legend className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Contact
        </legend>

        <div className="space-y-2">
          <Label htmlFor="contactEmail">Contact email</Label>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={clinic.contactEmail ?? ""}
            placeholder="contact@clinic.com"
          />
          <p className="text-xs text-muted-foreground">
            Receives notifications for new bookings and cancellations.
          </p>
          {state.fieldErrors?.contactEmail && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.contactEmail}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone / WhatsApp</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={clinic.phone ?? ""}
            placeholder="+1 (555) 123-4567"
            maxLength={40}
          />
          {state.fieldErrors?.phone && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.phone}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <textarea
            id="address"
            name="address"
            defaultValue={clinic.address ?? ""}
            placeholder="Street, number, city, state"
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
          <Label htmlFor="hoursText">Operating hours</Label>
          <Input
            id="hoursText"
            name="hoursText"
            defaultValue={clinic.hoursText ?? ""}
            placeholder="Mon-Fri 9am-6pm, Sat 9am-1pm"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">
            Free text displayed on the public landing page (does not affect
            slot generation — use the Availability screen for that).
          </p>
          {state.fieldErrors?.hoursText && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.hoursText}
            </p>
          )}
        </div>
      </fieldset>

      {/* Appearance */}
      <fieldset className="space-y-4 rounded-md border p-4">
        <legend className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Appearance
        </legend>

        <div className="space-y-2">
          <Label htmlFor="logoUrl">Logo URL</Label>
          <Input
            id="logoUrl"
            name="logoUrl"
            type="url"
            defaultValue={clinic.logoUrl ?? ""}
            placeholder="https://..."
          />
          <p className="text-xs text-muted-foreground">
            Paste the public URL of the image (PNG/SVG, ideally ≤ 200 KB).
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
              Saved at {new Date().toLocaleTimeString("en-US")}.
            </span>
          )}
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
