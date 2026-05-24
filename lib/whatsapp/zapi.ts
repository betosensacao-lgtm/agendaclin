/**
 * Cliente HTTP para a Z-API (WhatsApp Business).
 *
 * Docs: https://developer.z-api.io/
 *
 * Variáveis de ambiente necessárias:
 *   ZAPI_INSTANCE_ID  — ID da instância (ex.: 3D5AFE7AE57B3C86A25CA99F)
 *   ZAPI_TOKEN        — Token de segurança da instância
 *   ZAPI_CLIENT_TOKEN — Client-Token exigido em algumas instâncias (opcional)
 *
 * Política:
 *   - Função NO-THROW: erros são logados e retornam { ok: false }.
 *   - Nunca deve derrubar o fluxo principal (cron ou Server Action).
 */

const BASE_URL = "https://api.z-api.io";

function getConfig():
  | { instanceId: string; token: string; clientToken: string | null }
  | null {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  if (!instanceId || !token) return null;
  return {
    instanceId,
    token,
    clientToken: process.env.ZAPI_CLIENT_TOKEN ?? null,
  };
}

/**
 * Normaliza um número de telefone para o formato esperado pela Z-API:
 * código do país (55) + DDD + número, apenas dígitos.
 *
 * Exemplos de entrada aceitos:
 *   "(11) 99999-8888"  → "5511999998888"
 *   "11999998888"      → "5511999998888"
 *   "+5511999998888"   → "5511999998888"
 *   "5511999998888"    → "5511999998888"
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // Já tem código do país 55
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  // Começa com 0 (discagem nacional antiga)
  if (digits.startsWith("0")) return "55" + digits.slice(1);
  // DDD + número (10 ou 11 dígitos)
  return "55" + digits;
}

/**
 * Envia uma mensagem de texto simples via Z-API.
 * Retorna { ok: true } em caso de sucesso ou { ok: false, error } em falha.
 */
export async function sendWhatsAppText(
  phone: string,
  message: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = getConfig();
  if (!config) {
    console.warn("[zapi] ZAPI_INSTANCE_ID ou ZAPI_TOKEN não configurado — skipping");
    return { ok: false, error: "Z-API não configurada" };
  }

  const normalized = normalizePhone(phone);
  const url = `${BASE_URL}/instances/${config.instanceId}/token/${config.token}/send-text`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.clientToken) {
    headers["Client-Token"] = config.clientToken;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone: normalized, message }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[zapi] HTTP error", res.status, body);
      return { ok: false, error: `HTTP ${res.status}: ${body}` };
    }

    return { ok: true };
  } catch (err) {
    console.error("[zapi] Network error", err);
    return { ok: false, error: String(err) };
  }
}
