/**
 * Widget do Cloudflare Turnstile (anti-spam).
 * Carrega o script sob demanda e renderiza o widget via API explícita.
 * Exporte o componente e monte-o em qualquer Client Component.
 */
"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: { sitekey: string; callback: (token: string) => void },
      ) => string;
    };
  }
}

export function TurnstileWidget({
  siteKey,
  onVerify,
}: {
  siteKey: string;
  onVerify: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (renderedRef.current) return;

    function renderWidget() {
      if (!containerRef.current || !window.turnstile || renderedRef.current)
        return;
      renderedRef.current = true;
      window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onVerify,
      });
    }

    const existing = document.getElementById("cf-turnstile-script");
    if (existing) {
      if (window.turnstile) renderWidget();
      else existing.addEventListener("load", renderWidget, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "cf-turnstile-script";
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.onload = renderWidget;
    document.head.appendChild(script);
  }, [siteKey, onVerify]);

  return <div ref={containerRef} />;
}
