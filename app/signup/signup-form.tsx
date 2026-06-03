/**
 * Clinic registration form. Client Component because:
 *   - Live slug availability check (debounced)
 *   - Renders Turnstile widget
 *   - Redirects to /onboarding on success
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
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function SignUpForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    signUpClinicAction,
    INITIAL,
  );

  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ kind: "idle" });
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
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

  useEffect(() => {
    if (state.ok && state.clinicSlug) {
      router.push("/onboarding");
      router.refresh();
    }
  }, [state.ok, state.clinicSlug, router]);

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
      <input type="hidden" name="turnstileToken" value={turnstileToken ?? ""} />

      <div className="space-y-2">
        <Label htmlFor="clinicName">Clinic name</Label>
        <Input
          id="clinicName"
          name="clinicName"
          required
          minLength={2}
          maxLength={120}
          placeholder="Good Health Clinic"
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
        <Label htmlFor="slug">Public URL (slug)</Label>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm text-muted-foreground">
            bookclinic.vercel.app/
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
              placeholder="good-health"
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
              "Use 3-40 lowercase letters, numbers and hyphens"}
            {slugStatus.reason === "reserved" &&
              "This slug is reserved — please choose another"}
            {slugStatus.reason === "taken" &&
              "This slug is already taken — please choose another"}
          </p>
        )}
        {state.fieldErrors?.slug && (
          <p className="text-sm text-destructive">{state.fieldErrors.slug}</p>
        )}
      </div>

      <hr className="my-2" />

      <div className="space-y-2">
        <Label htmlFor="adminName">Your name</Label>
        <Input
          id="adminName"
          name="adminName"
          required
          minLength={2}
          maxLength={120}
          placeholder="John Smith"
          autoComplete="name"
        />
        {state.fieldErrors?.adminName && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.adminName}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminEmail">Your email</Label>
        <Input
          id="adminEmail"
          name="adminEmail"
          type="email"
          required
          placeholder="you@clinic.com"
          autoComplete="email"
        />
        {state.fieldErrors?.adminEmail && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.adminEmail}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
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
          Minimum 8 characters. Use a strong password with letters, numbers and symbols.
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
          I accept the terms of service and privacy policy of BookClinic.
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
          ? "Creating your account..."
          : !turnstileToken
            ? "Verifying..."
            : "Register clinic"}
      </Button>
    </form>
  );
}
