/**
 * Form de cadastro de clínica. Client Component porque:
 *   - Faz checagem ao vivo do slug (debounced)
 *   - Renderiza Turnstile widget
 *   - Redireciona pra /onboarding após sucesso
 */
"use client";

import { Check, CircleX, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { TurnstileWidget } from "@/components/turnstile-widget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  checkSlugAvailabilityAction,
  signUpClinicAction,
  type SignUpFormState,
} from "./actions";

const INITIAL: SignUpFormState = {};

type SlugStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "unavailable"; reason: "format" | "reserved" | "taken" };

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^a-z0-9-]/g, "-") // não-alfanum vira hífen
    .replace(/-+/g, "-") // colapsa hífens repetidos
    .replace(/^-+|-+$/g, ""); // tira hífen das pontas
}

export function SignUpForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    signUpClinicAction,
    INITIAL,
  );

  // Slug controlado pra checagem ao vivo.
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ kind: "idle" });

  // Turnstile
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  // Auto-derivação do slug a partir do nome da clínica (até o usuário editar).
  const [slugTouched, setSlugTouched] = useState(false);

  function handleClinicNameChange(name: string) {
    if (!slugTouched) {
      const derived = slugify(name).slice(0, 40);
      setSlug(derived);
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(slugify(value));
  }

  // Debounce da checagem de slug.
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);

    if (!slug || slug.length < 3) {
      setSlugStatus({ kind: "idle" });
      return;
    }
    setSlugStatus({ kind: "checking" });

    checkTimerRef.current = setTimeout(async () => {
      const result = await checkSlugAvailabilityAction(slug);
      if (!result.ok) {
        setSlugStatus({ kind: "idle" });
        return;
      }
      if (result.available) {
        setSlugStatus({ kind: "available" });
      } else {
        setSlugStatus({ kind: "unavailable", reason: result.reason });
      }
    }, 400);

    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    };
  }, [slug]);

  // Redireciona após sucesso.
  useEffect(() => {
    if (state.ok && state.clinicSlug) {
      router.push("/onboarding");
      router.refresh();
    }
  }, [state.ok, state.clinicSlug, router]);

  // Se o action falhou, reseta o Turnstile pra forçar nova validação.
  useEffect(() => {
    if (state.error || state.fieldErrors) {
      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);
    }
  }, [state.error, state.fieldErrors]);

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const slugSubmittable =
    slugStatus.kind === "available" || slugStatus.kind === "idle";

  return (
    <form action={formAction} className="space-y-4">
      {/* Hidden Turnstile token */}
      <input type="hidden" name="turnstileToken" value={turnstileToken ?? ""} />

      <div className="space-y-2">
        <Label htmlFor="clinicName">Nome da clínica</Label>
        <Input
          id="clinicName"
          name="clinicName"
          required
          minLength={2}
          maxLength={120}
          placeholder="Clínica Boa Saúde"
          onChange={(e) => handleClinicNameChange(e.target.value)}
          autoFocus
        />
        {state.fieldErrors?.clinicName && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.clinicName}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">URL pública (slug)</Label>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm text-muted-foreground">
            agendaclin.vercel.app/
          </span>
          <div className="relative flex-1">
            <Input
              id="slug"
              name="slug"
              required
              minLength={3}
              maxLength={40}
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="boa-saude"
              className="pr-9"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2">
              {slugStatus.kind === "checking" && (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              )}
              {slugStatus.kind === "available" && (
                <Check className="size-4 text-green-600" />
              )}
              {slugStatus.kind === "unavailable" && (
                <CircleX className="size-4 text-destructive" />
              )}
            </span>
          </div>
        </div>
        {slugStatus.kind === "unavailable" && (
          <p className="text-sm text-destructive">
            {slugStatus.reason === "format" &&
              "Use 3-40 letras minúsculas, números e hífens"}
            {slugStatus.reason === "reserved" &&
              "Este slug é reservado — escolha outro"}
            {slugStatus.reason === "taken" &&
              "Este slug já está em uso — escolha outro"}
          </p>
        )}
        {state.fieldErrors?.slug && (
          <p className="text-sm text-destructive">{state.fieldErrors.slug}</p>
        )}
      </div>

      <hr className="my-2" />

      <div className="space-y-2">
        <Label htmlFor="adminName">Seu nome</Label>
        <Input
          id="adminName"
          name="adminName"
          required
          minLength={2}
          maxLength={120}
          placeholder="Maria Silva"
          autoComplete="name"
        />
        {state.fieldErrors?.adminName && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.adminName}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminEmail">Seu e-mail</Label>
        <Input
          id="adminEmail"
          name="adminEmail"
          type="email"
          required
          placeholder="voce@clinica.com.br"
          autoComplete="email"
        />
        {state.fieldErrors?.adminEmail && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.adminEmail}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">
          Mínimo 8 caracteres. Use senha forte com letras, números e símbolos.
        </p>
        {state.fieldErrors?.password && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="acceptTerms"
          required
          className="mt-0.5"
        />
        <span>
          Aceito os termos de uso e a política de privacidade do agendaclin.
        </span>
      </label>
      {state.fieldErrors?.acceptTerms && (
        <p className="text-sm text-destructive">
          {state.fieldErrors.acceptTerms}
        </p>
      )}

      <div>
        <TurnstileWidget
          key={turnstileKey}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
          onVerify={handleTurnstileVerify}
        />
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={pending || !turnstileToken || !slugSubmittable}
      >
        {pending
          ? "Criando sua conta…"
          : !turnstileToken
            ? "Aguardando verificação…"
            : "Cadastrar clínica"}
      </Button>
    </form>
  );
}
