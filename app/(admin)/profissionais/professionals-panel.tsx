/**
 * Client-side providers panel: table + dialog (create/edit) + toggle + login.
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

import type { Service } from "@/lib/db/schema";
import type { ProfessionalWithServices } from "@/lib/db/queries/professionals";

import { toggleProfessionalActiveAction } from "./actions";
import { ProfessionalFormDialog } from "./professional-form-dialog";
import { ProfessionalLoginDialog } from "./professional-login-dialog";

export function ProfessionalsPanel({
  professionals,
  availableServices,
}: {
  professionals: ProfessionalWithServices[];
  availableServices: Service[];
}) {
  const [editing, setEditing] = useState<ProfessionalWithServices | null>(null);
  const [creating, setCreating] = useState(false);
  const [loginFor, setLoginFor] = useState<ProfessionalWithServices | null>(null);
  const [pending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function handleToggle(id: string, current: boolean) {
    setTogglingId(id);
    startTransition(async () => {
      try {
        await toggleProfessionalActiveAction(id, !current);
      } finally {
        setTogglingId(null);
      }
    });
  }

  return (
    <>
      <div className="flex items-center justify-end">
        <Button onClick={() => setCreating(true)}>New provider</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {professionals.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No providers registered.
                </TableCell>
              </TableRow>
            ) : (
              professionals.map((pro) => (
                <TableRow key={pro.id}>
                  <TableCell className="font-medium">{pro.name}</TableCell>
                  <TableCell>
                    {pro.services.length === 0 ? (
                      <span className="text-muted-foreground">
                        none assigned
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {pro.services.map((s) => (
                          <Badge
                            key={s.id}
                            variant={s.active ? "secondary" : "outline"}
                          >
                            {s.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {pro.active ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {pro.userId ? (
                      <Badge variant="secondary">Has access</Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLoginFor(pro)}
                      >
                        Create access
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(pro)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending && togglingId === pro.id}
                        onClick={() => handleToggle(pro.id, pro.active)}
                      >
                        {pro.active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProfessionalFormDialog
        key={editing?.id ?? (creating ? "new" : "closed")}
        professional={editing}
        availableServices={availableServices}
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
      />

      {loginFor && (
        <ProfessionalLoginDialog
          key={loginFor.id}
          professionalId={loginFor.id}
          professionalName={loginFor.name}
          open={loginFor !== null}
          onOpenChange={(open) => {
            if (!open) setLoginFor(null);
          }}
        />
      )}
    </>
  );
}
