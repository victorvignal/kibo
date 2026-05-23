/**
 * PDF Report Generator for Patient Monthly Reports
 *
 * Generates comprehensive PDF reports with mood/sleep/activity evolution,
 * main alerts, and personalized recommendations.
 */

import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from "@react-pdf/renderer";
import type { Patient, DailyData, ClinicaAlert } from "@/types";
import { getRiskColor, getRiskLabel } from "./riskPredictor";

// Register fonts (using system fonts)
Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.woff2", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.woff2", fontWeight: 700 },
  ],
});

const colors = {
  primary: "#7C3AED",
  secondary: "#6366F1",
  success: "#059669",
  warning: "#D97706",
  danger: "#DC2626",
  muted: "#6B7280",
  light: "#F3F4F6",
  dark: "#111827",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Inter",
    fontSize: 10,
    color: colors.dark,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  reportDate: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 4,
  },
  patientName: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.dark,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: colors.light,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.dark,
  },
  cardSubtitle: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 2,
  },
  table: {
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.light,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 600,
    color: colors.muted,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  tableCell: {
    fontSize: 10,
    color: colors.dark,
  },
  alertCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  alertHigh: {
    backgroundColor: "#FEE2E2",
    borderLeftColor: colors.danger,
  },
  alertMedium: {
    backgroundColor: "#FEF3C7",
    borderLeftColor: colors.warning,
  },
  alertLow: {
    backgroundColor: "#D4EDDA",
    borderLeftColor: colors.success,
  },
  alertTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.dark,
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 9,
    color: colors.muted,
    lineHeight: 14,
  },
  recommendationCard: {
    backgroundColor: "#F3E8FF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.primary,
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 9,
    color: colors.dark,
    lineHeight: 14,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  footerText: {
    fontSize: 8,
    color: colors.muted,
    textAlign: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  badgeSuccess: {
    backgroundColor: "#D4EDDA",
  },
  badgeWarning: {
    backgroundColor: "#FEF3C7",
  },
  badgeDanger: {
    backgroundColor: "#FEE2E2",
  },
  badgeText: {
    fontSize: 8,
    fontWeight: 600,
    color: colors.dark,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.light,
    borderRadius: 3,
    marginBottom: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
});

interface ReportData {
  patient: Patient;
  dailyData: DailyData[];
  alerts: ClinicaAlert[];
  startDate: Date;
  endDate: Date;
  psychologistName?: string;
}

// Calculate statistics for the period
function calculateStats(dailyData: DailyData[]) {
  if (dailyData.length === 0) {
    return {
      avgMood: 0,
      avgSleep: 0,
      avgAnxiety: 0,
      avgActivity: 0,
      avgSocial: 0,
      checkinCount: 0,
      trend: "stable" as const,
    };
  }

  const avgMood = dailyData.reduce((sum, d) => sum + d.features.moodScore, 0) / dailyData.length;
  const avgSleep = dailyData.reduce((sum, d) => sum + d.features.sleepDuration, 0) / dailyData.length;
  const avgAnxiety = dailyData.reduce((sum, d) => sum + d.features.anxietyScore, 0) / dailyData.length;
  const avgActivity = dailyData.reduce((sum, d) => sum + d.features.physicalActivity, 0) / dailyData.length;
  const avgSocial = dailyData.reduce((sum, d) => sum + d.features.socialInteractionScore, 0) / dailyData.length;

  // Calculate trend
  const recent = dailyData.slice(-3);
  const older = dailyData.slice(0, 3);
  const recentMood = recent.reduce((sum, d) => sum + d.features.moodScore, 0) / Math.max(1, recent.length);
  const olderMood = older.reduce((sum, d) => sum + d.features.moodScore, 0) / Math.max(1, older.length);
  const trendDiff = recentMood - olderMood;
  const trend: "improving" | "stable" | "worsening" = trendDiff > 0.3 ? "improving" : trendDiff < -0.3 ? "worsening" : "stable";

  return {
    avgMood: Math.round(avgMood * 10) / 10,
    avgSleep: Math.round(avgSleep * 10) / 10,
    avgAnxiety: Math.round(avgAnxiety * 10) / 10,
    avgActivity: Math.round(avgActivity * 10) / 10,
    avgSocial: Math.round(avgSocial * 10) / 10,
    checkinCount: dailyData.length,
    trend,
  };
}

// Get trend text
function getTrendText(trend: "improving" | "stable" | "worsening"): string {
  switch (trend) {
    case "improving": return "↑ Melhorando";
    case "worsening": return "↓ Piorando";
    default: return "→ Estável";
  }
}

// Get trend color
function getTrendColor(trend: "improving" | "stable" | "worsening"): string {
  switch (trend) {
    case "improving": return colors.success;
    case "worsening": return colors.danger;
    default: return colors.muted;
  }
}

// Patient Report Document Component
function PatientReportDocument({ data }: { data: ReportData }) {
  const stats = calculateStats(data.dailyData);
  const startDateStr = data.startDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  // Get high/medium alerts
  const highAlerts = data.alerts.filter(a => a.severity === "high" && !a.acknowledged);
  const mediumAlerts = data.alerts.filter(a => a.severity === "medium" && !a.acknowledged);

  // Get recommendations based on stats
  const recommendations: { title: string; text: string }[] = [];
  if (stats.avgSleep < 5.5) {
    recommendations.push({
      title: "Higiene do Sono",
      text: "A qualidade do sono está abaixo do ideal. Recomenda-se estabelecer uma rotina de horários fixos para dormir e acordar, evitando telas 1h antes de dormir.",
    });
  }
  if (stats.avgAnxiety > 6) {
    recommendations.push({
      title: "Gerenciamento de Ansiedade",
      text: "Níveis elevados de ansiedade foram detectados. Técnicas de respiração, mindfulness e atividades físicas regulares podem ajudar.",
    });
  }
  if (stats.avgSocial < 40) {
    recommendations.push({
      title: "Apoio Social",
      text: "A socialização está reduzida. Encorajar o paciente a manter contato regular com familiares/amigos pode melhorar significativamente o bem-estar.",
    });
  }
  if (stats.avgActivity < 4) {
    recommendations.push({
      title: "Atividade Física",
      text: "A atividade física está baixa. Mesmo caminhadas curtas de 10-15 minutos podem ajudar a melhorar o humor e reduzir a ansiedade.",
    });
  }
  if (stats.trend === "worsening") {
    recommendations.push({
      title: "Atenção à Tendência",
      text: "Uma tendência de piora foi observada nas últimas semanas. Acompanhamento mais próximo e possível reavaliação do plano terapêutico são recomendados.",
    });
  }

  // Add default recommendation if none
  if (recommendations.length === 0) {
    recommendations.push({
      title: "Manter Rotina",
      text: "O paciente está estável. Continuar incentivando check-ins regulares e manutenção das estratégias atuais de bem-estar.",
    });
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.logo}>📊 Kibo - Relatório Mensal</Text>
            <Text style={styles.subtitle}>Digital Phenotyping • Saúde Mental</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportDate}>{startDateStr}</Text>
            <Text style={styles.patientName}>{data.patient.name}</Text>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo do Período</Text>
          <View style={styles.row}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Humor Médio</Text>
              <Text style={styles.cardValue}>{stats.avgMood}/10</Text>
              <Text style={[styles.cardSubtitle, { color: getTrendColor(stats.trend) }]}>
                {getTrendText(stats.trend)}
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Sono Médio</Text>
              <Text style={styles.cardValue}>{stats.avgSleep}h</Text>
              <Text style={styles.cardSubtitle}>
                {stats.avgSleep >= 7 ? "✅ Dentro do ideal" : "⚠️ Abaixo do ideal"}
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Check-ins</Text>
              <Text style={styles.cardValue}>{stats.checkinCount}</Text>
              <Text style={styles.cardSubtitle}>dias com registro</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ansiedade Média</Text>
              <Text style={styles.cardValue}>{stats.avgAnxiety}/10</Text>
              <Text style={styles.cardSubtitle}>
                {stats.avgAnxiety > 6 ? "⚠️ Elevada" : stats.avgAnxiety > 3 ? "🟡 Moderada" : "✅ Controlada"}
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Socialização</Text>
              <Text style={styles.cardValue}>{stats.avgSocial}/100</Text>
              <Text style={styles.cardSubtitle}>
                {stats.avgSocial >= 60 ? "✅ Boa" : stats.avgSocial >= 30 ? "🟡 Moderada" : "⚠️ Baixa"}
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Atividade Física</Text>
              <Text style={styles.cardValue}>{stats.avgActivity}/10</Text>
              <Text style={styles.cardSubtitle}>
                {stats.avgActivity >= 6 ? "✅ Adequada" : "⚠️ Reduzida"}
              </Text>
            </View>
          </View>
        </View>

        {/* Alerts */}
        {(highAlerts.length > 0 || mediumAlerts.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Alertas</Text>
            {highAlerts.map((alert, i) => (
              <View key={i} style={[styles.alertCard, styles.alertHigh]}>
                <Text style={styles.alertTitle}>🔴 Alta Prioridade — {new Date(alert.createdAt).toLocaleDateString("pt-BR")}</Text>
                <Text style={styles.alertDescription}>{alert.message}</Text>
              </View>
            ))}
            {mediumAlerts.map((alert, i) => (
              <View key={i} style={[styles.alertCard, styles.alertMedium]}>
                <Text style={styles.alertTitle}>🟡 Média Prioridade — {new Date(alert.createdAt).toLocaleDateString("pt-BR")}</Text>
                <Text style={styles.alertDescription}>{alert.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Recomendações</Text>
          {recommendations.map((rec, i) => (
            <View key={i} style={styles.recommendationCard}>
              <Text style={styles.recommendationTitle}>{rec.title}</Text>
              <Text style={styles.recommendationText}>{rec.text}</Text>
            </View>
          ))}
        </View>

        {/* Patient Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações do Paciente</Text>
          <View style={styles.row}>
            <View style={[styles.card, { flex: 1 }]}>
              <Text style={styles.cardTitle}>Nome</Text>
              <Text style={[styles.cardValue, { fontSize: 12 }]}>{data.patient.name}</Text>
            </View>
            <View style={[styles.card, { flex: 1 }]}>
              <Text style={styles.cardTitle}>Condição</Text>
              <Text style={[styles.cardValue, { fontSize: 12 }]}>`
                {data.patient.condition === "depression" ? "Depressão" :
                 data.patient.condition === "anxiety" ? "Ansiedade" :
                 data.patient.condition === "bipolar" ? "Bipolar" : "Outro"}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Relatório gerado automaticamente pelo sistema Kibo • {new Date().toLocaleString("pt-BR")} • Psicólogo: {data.psychologistName || "N/A"}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

/**
 * Generate a patient monthly report PDF
 */
export function generatePatientReport(
  patient: Patient,
  dailyData: DailyData[],
  alerts: ClinicaAlert[],
  startDate: Date,
  endDate: Date,
  psychologistName?: string
): React.ReactNode {
  const data: ReportData = {
    patient,
    dailyData,
    alerts,
    startDate,
    endDate,
    psychologistName,
  };

  return (
    <PDFDownloadLink
      document={<PatientReportDocument data={data} />}
      fileName={`Kibo_Relatorio_${patient.name.replace(/\s+/g, "_")}_${endDate.toLocaleDateString("pt-BR").replace(/\//g, "-")}.pdf`}
      style={{
        textDecoration: "none",
        padding: "10px 20px",
        color: "#7C3AED",
        backgroundColor: "#F3E8FF",
        borderRadius: "8px",
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      {({ loading }) => (loading ? "Gerando PDF..." : "📥 Exportar PDF")}
    </PDFDownloadLink>
  );
}

/**
 * Get download link component for PDF
 */
export function getPdfDownloadLink(
  patient: Patient,
  dailyData: DailyData[],
  alerts: ClinicaAlert[],
  startDate: Date,
  endDate: Date,
  psychologistName?: string
) {
  const data: ReportData = {
    patient,
    dailyData,
    alerts,
    startDate,
    endDate,
    psychologistName,
  };

  return (
    <PDFDownloadLink
      document={<PatientReportDocument data={data} />}
      fileName={`Kibo_Relatorio_${patient.name.replace(/\s+/g, "_")}_${endDate.toLocaleDateString("pt-BR").replace(/\//g, "-")}.pdf`}
    >
      {({ loading }) => (loading ? "Gerando PDF..." : "📥 Exportar PDF")}
    </PDFDownloadLink>
  );
}
