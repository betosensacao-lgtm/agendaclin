/**
 * Email enviado ao admin recém-cadastrado de uma clínica nova.
 * Inclui link pra onboarding + URL pública da clínica.
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

export type WelcomeClinicProps = {
  adminName: string;
  clinicName: string;
  publicUrl: string;
  onboardingUrl: string;
};

export default function WelcomeClinic({
  adminName,
  clinicName,
  publicUrl,
  onboardingUrl,
}: WelcomeClinicProps) {
  const firstName = adminName.split(" ")[0];
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>
        {clinicName} já está no agendaclin — vamos configurar?
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>Bem-vindo ao agendaclin 👋</Heading>
          <Text style={paragraph}>
            Olá, {firstName}! Sua clínica <strong>{clinicName}</strong> está
            cadastrada. Em 5 passos rápidos você fica pronto pra receber
            agendamentos online.
          </Text>

          <Section style={ctaSection}>
            <Button href={onboardingUrl} style={button}>
              Configurar minha clínica
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={subhead}>Seu link público</Text>
          <Text style={paragraph}>
            Assim que terminar a configuração, este será o link que você
            compartilha com os pacientes:
          </Text>
          <Text style={urlBox}>
            <Link href={publicUrl} style={link}>
              {publicUrl}
            </Link>
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Você recebeu este email porque criou uma conta no agendaclin.
            Se não foi você, basta ignorar.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// ---- estilos inline ----

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

const paragraph: React.CSSProperties = {
  fontSize: 14,
  lineHeight: "20px",
  margin: "0 0 16px",
  color: "#374151",
};

const subhead: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  color: "#6b7280",
  margin: "0 0 8px",
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

const urlBox: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  padding: "10px 14px",
  margin: "0 0 20px",
  fontSize: 13,
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
