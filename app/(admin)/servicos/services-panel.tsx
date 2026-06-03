/**
 * Client-side services panel: table + dialog (create/edit) + toggle.
 */
"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { formatDuration, formatPriceCents } from "@/lib/format";
import type { Service } from "@/lib/db/schema";

import { toggleServiceActiveAction } from "./actions";
import { ServiceFormDialog } from "./service-form-dialog";

export function ServicesPanel({ services }: { services: Service[] }) {
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingId, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function handleToggle(id: string, current: boolean) {
    setTogglingId(id);
    startTransition(async () => {
      try {
        await toggleServiceActiveAction(id, !current);
      } finally {
        setTogglingId(null);
      }
    });
  }

  return (
    <>
      <div className="flex items-center justify-end">
        <Button onClick={() => setCreating(true)}>New service</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No services registered.
                </TableCell>
              </TableRow>
            ) : (
              services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>{formatDuration(service.durationMinutes)}</TableCell>
                  <TableCell>{formatPriceCents(service.priceCents)}</TableCell>
                  <TableCell>
                    {service.active ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(service)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pendingId && togglingId === service.id}
                        onClick={() => handleToggle(service.id, service.active)}
                      >
                        {service.active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ServiceFormDialog
        key={editing?.id ?? (creating ? "new" : "closed")}
        service={editing}
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
      />
    </>
  );
}
