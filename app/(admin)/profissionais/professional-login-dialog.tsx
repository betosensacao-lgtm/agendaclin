/**
 * Dialog para criar conta de login para um profissional.
 * Após sucesso, mostra a senha temporária para o admin compartilhar com o pro.
 */
"use client";

import { Copy } from "lucide-react";
import { useState, useTransition } from "react";

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
  createProfessionalLoginAction,
  type ProfessionalLoginResult,
} from "./actions";

type Created = Extract<ProfessionalLoginResult, { ok: true }>;

export function ProfessionalLoginDialog({
  professionalId,
  professionalName,
  open,
  onOpenChange,
}: {
  professionalId: string;
  professionalName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createProfessionalLoginAction({
        professionalId,
        email,
      });
      if (result.ok) {
        setCreated(result);
      } else {
        setError(result.error);
      }
    });
  }

  function handleClose() {
    onOpenChange(false);
    // Reset depois de fechar (sem flash de conteúdo).
    setTimeout(() => {
      setEmail("");
      setError(null);
      setCreated(null);
    }, 200);
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : handleClose())}>
      <DialogContent className="sm:max-w-md">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Acesso criado</DialogTitle>
              <DialogDescription>
                Compartilhe estas credenciais com {professionalName}. Esta
                senha aparece só uma vez — copie agora.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide">E-mail</Label>
                <div className="flex gap-2">
                  <Input value={created.email} readOnly className="font-mono text-sm" />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => copy(created.email)}
                    aria-label="Copiar e-mail"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide">
                  Senha temporária
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={created.temporaryPassword}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => copy(created.temporaryPassword)}
                    aria-label="Copiar senha"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  O profissional pode trocar a senha em /login (esqueci a senha).
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Criar acesso de login</DialogTitle>
              <DialogDescription>
                {professionalName} poderá entrar em /login e ver apenas a
                própria agenda.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail de acesso</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dra.ana@exemplo.com"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={pending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={pending || !email}>
                  {pending ? "Criando…" : "Criar acesso"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
