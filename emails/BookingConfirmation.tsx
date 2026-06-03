/**
 * Email sent to the patient after a booking is created.
 * Includes appointment summary + management link (reschedule/cancel).
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
  dateTimeFormatted: string;
  durationMinutes: number;
  /** URL to the management page (view/reschedule/cancel). */
  manageUrl: string;
  /** Direct cancel URL (shortcut). */
  cancelUrl: string;
  /** Direct reschedule URL (shortcut). */
  rescheduleUrl: string;
};

export default function BookingConfirmation({
  patientName,
  clinicName,
  serviceName,
  professionalName,
  dateTimeFormatted,
  durationMinutes,
  manageUrl,
  cancelUrl,
  rescheduleUrl,
}: BookingConfirmationProps) {
  const firstName = patientName.split(" ")[0];
  return (
    <Html lang="en">
      <Head />
      <Preview>
        Your appointment at {clinicName} is confirmed for {dateTimeFormatted}.
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>Booking confirmed ✓</Heading>
          <Text style={greeting}>Hi {firstName},</Text>
          <Text style={paragraph}>
            Your appointment at <strong>{clinicName}</strong> is confirmed.
            We&apos;ll see you soon!
          </Text>

          <Section style={card}>
            <Row label="Service" value={`${serviceName} (${durationMinutes} min)`} />
            <Row label="Provider" value={professionalName} />
            <Row label="When" value={dateTimeFormatted} />
          </Section>

          <Text style={paragraphSmall}>
            📎 We&apos;ve attached a calendar invite (.ics) — open the
            attachment to add this event to Google Calendar, Apple Calendar or
            Outlook with one tap.
          </Text>

          <Section style={ctaSection}>
            <Text style={paragraphSmall}>
              Need to make a change? You can reschedule or cancel without
              calling us:
            </Text>
            <div style={buttonRow}>
              <Button href={rescheduleUrl} style={button}>
                Reschedule
              </Button>
              <Button href={cancelUrl} style={buttonGhost}>
                Cancel
              </Button>
            </div>
            <Text style={fineprint}>
              If the buttons don&apos;t work, open:
              <br />
              <Link href={manageUrl} style={link}>
                {manageUrl}
              </Link>
            </Text>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            This email was sent by BookClinic on behalf of {clinicName}.
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

// ---- inline styles (email client compatibility) ----

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
  padding: "10px 20px",
  fontSize: 14,
  fontWeight: 500,
  textDecoration: "none",
  display: "inline-block",
};

const buttonGhost: React.CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#111827",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  padding: "10px 20px",
  fontSize: 14,
  fontWeight: 500,
  textDecoration: "none",
  display: "inline-block",
};

const buttonRow: React.CSSProperties = {
  display: "inline-flex",
  gap: 8,
  justifyContent: "center" as const,
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
