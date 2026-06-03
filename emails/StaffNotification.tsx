/**
 * Email sent to clinic staff when a patient books, cancels or reschedules.
 */
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type StaffNotificationKind = "new" | "cancelled" | "rescheduled";

export type StaffNotificationProps = {
  kind: StaffNotificationKind;
  clinicName: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  serviceName: string;
  professionalName: string;
  dateTimeFormatted: string;
};

const TITLES: Record<StaffNotificationKind, string> = {
  new: "New booking",
  cancelled: "Booking cancelled",
  rescheduled: "Booking rescheduled",
};

const ICONS: Record<StaffNotificationKind, string> = {
  new: "📅 ",
  cancelled: "❌ ",
  rescheduled: "🔄 ",
};

export default function StaffNotification(props: StaffNotificationProps) {
  const title = TITLES[props.kind];
  const icon = ICONS[props.kind];

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {title}: {props.patientName} · {props.dateTimeFormatted}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>
            {icon}
            {title}
          </Heading>

          <Text style={subtitle}>
            {props.clinicName} · {props.dateTimeFormatted}
          </Text>

          <Section style={card}>
            <Row label="Patient" value={props.patientName} />
            <Row label="Contact" value={`${props.patientEmail} · ${props.patientPhone}`} />
            <Row label="Service" value={props.serviceName} />
            <Row label="Provider" value={props.professionalName} />
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Automated notification · BookClinic
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Text style={row}>
      <span style={rowLabel}>{label}: </span>
      <span style={rowValue}>{value}</span>
    </Text>
  );
}

// ---- styles ----

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
  maxWidth: 520,
  padding: "28px 24px",
};

const h1: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  margin: "0 0 4px",
  color: "#111827",
};

const subtitle: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  margin: "0 0 20px",
};

const card: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  padding: "12px 16px",
};

const row: React.CSSProperties = {
  fontSize: 13,
  margin: "0 0 6px",
  lineHeight: "20px",
  color: "#111827",
};

const rowLabel: React.CSSProperties = {
  color: "#6b7280",
  fontWeight: 500,
};

const rowValue: React.CSSProperties = {
  color: "#111827",
};

const hr: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "20px 0 12px",
};

const footer: React.CSSProperties = {
  fontSize: 11,
  color: "#9ca3af",
  margin: 0,
  textAlign: "center" as const,
};
