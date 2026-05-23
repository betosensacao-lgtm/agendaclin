/**
 * Email enviado ao paciente após criar um agendamento.
 * Inclui resumo da consulta + link com cancel_token para cancelar.
 */
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type BookingConfirmationProps = {
  patientName: string;
  clinicName: string;
  serviceName: string;
  professionalName: string;
  dateTimeFormatted: string; // ex.: "segunda-feira, 02 de junho às 09:00"
  durationMinutes: number;
  cancelUrl: string;
};

export default function BookingConfirmation({
  patientName,
  clinicName,
  serviceName,
  professionalName,
  dateTimeFormatted,
  durationMinutes,
  cancelUrl,
}: BookingConfirmationProps) {
  const firstName = patientName.split(" ")[0];
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>
        Sua consulta em {clinicName} foi confirmada para {dateTimeFormatted}.
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>Agendamento confirmado ✓</Heading>
          <Text style={greeting}>Olá, {firstName}!</Text>
          <Text style={paragraph}>
            Sua consulta em <strong>{clinicName}</strong> foi confirmada.
            Estamos te esperando.
          </Text>

          <Section style={card}>
            <Row label="Serviço" value={`${serviceName} (${durationMinutes} min)`} />
            <Row label="Profissional" value={professionalName} />
            <Row label="Quando" value={dateTimeFormatted} />
          </Section>

          <Section style={ctaSection}>
            <Text style={paragraphSmall}>
              Precisa cancelar? Use o botão abaixo (sem necessidade de
              login).
            </Text>
            <Button href={cancelUrl} style={button}>
              Ver / cancelar agendamento
            </Button>
            <Text style={fineprint}>
              Se o botão não funcionar, copie e cole no navegador:
              <br />
              <Link href={cancelUrl} style={link}>
                {cancelUrl}
              </Link>
            </Text>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Este email foi enviado por agendaclin a pedido de {clinicName}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Text style={row}>
      <span style={rowLabel}>{label}</span>
      <br />
      <span style={rowValue}>{value}</span>
    </Text>
  );
}

// ---- estilos inline (compat email clients) ----

const body: React.CSSProperties = {
  backgroundColor: "#f6f6f6",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: "24px 0",
  margin: 0,
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e6e6e6",
  borderRadius: 8,
  margin: "0 auto",
  maxWidth: 560,
  padding: "32px 28px",
};

const h1: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  margin: "0 0 16px",
  color: "#111827",
};

const greeting: React.CSSProperties = {
  fontSize: 16,
  margin: "0 0 8px",
  color: "#111827",
};

const paragraph: React.CSSProperties = {
  fontSize: 14,
  lineHeight: "20px",
  margin: "0 0 20px",
  color: "#374151",
};

const paragraphSmall: React.CSSProperties = {
  ...paragraph,
  fontSize: 13,
  margin: "0 0 12px",
};

const card: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  padding: "16px 20px",
  margin: "0 0 24px",
};

const row: React.CSSProperties = {
  fontSize: 14,
  margin: "0 0 12px",
  lineHeight: "20px",
};

const rowLabel: React.CSSProperties = {
  fontSize: 11,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const rowValue: React.CSSProperties = {
  color: "#111827",
  fontWeight: 500,
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#111827",
  color: "#ffffff",
  borderRadius: 6,
  padding: "12px 24px",
  fontSize: 14,
  fontWeight: 500,
  textDecoration: "none",
  display: "inline-block",
};

const fineprint: React.CSSProperties = {
  fontSize: 11,
  color: "#9ca3af",
  margin: "16px 0 0",
  wordBreak: "break-all" as const,
};

const link: React.CSSProperties = {
  color: "#3b82f6",
  textDecoration: "underline",
};

const hr: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "24px 0 16px",
};

const footer: React.CSSProperties = {
  fontSize: 12,
  color: "#9ca3af",
  margin: 0,
  textAlign: "center" as const,
};
