import React from "react";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { CaseReport } from "@/lib/case-report";

const styles = StyleSheet.create({
  page: { padding: 34, fontSize: 9, color: "#152033", fontFamily: "Helvetica" },
  header: { borderBottomWidth: 2, borderBottomColor: "#244b82", paddingBottom: 12, marginBottom: 16 },
  eyebrow: { color: "#52709a", fontSize: 8, letterSpacing: 1.1, textTransform: "uppercase" },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", marginTop: 5 },
  subtitle: { color: "#475467", fontSize: 10, marginTop: 4 },
  badge: { alignSelf: "flex-start", backgroundColor: "#edf4ff", color: "#244b82", borderRadius: 4, paddingVertical: 4, paddingHorizontal: 6, marginTop: 8, fontFamily: "Helvetica-Bold", fontSize: 8 },
  section: { marginBottom: 14 },
  sectionTitle: { color: "#244b82", fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  card: { borderWidth: 1, borderColor: "#d8dee9", borderRadius: 4, padding: 8, backgroundColor: "#fbfcfe" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -3 },
  cell: { width: "50%", padding: 3 },
  label: { color: "#667085", fontSize: 8, marginBottom: 2 },
  value: { fontSize: 9, lineHeight: 1.35 },
  small: { color: "#475467", fontSize: 8, lineHeight: 1.35 },
  reason: { borderLeftWidth: 2, borderLeftColor: "#52709a", paddingLeft: 6, marginBottom: 5 },
  warning: { backgroundColor: "#fff7e8", borderWidth: 1, borderColor: "#f4c772", borderRadius: 4, padding: 8 },
  footer: { position: "absolute", left: 34, right: 34, bottom: 26, borderTopWidth: 1, borderTopColor: "#d8dee9", paddingTop: 6, color: "#667085", fontSize: 7 },
});

function DisplayField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value == null || value === "" ? "Not recorded" : String(value)}</Text>
    </View>
  );
}

function List({ items }: { items: string[] }) {
  if (items.length === 0) return <Text style={styles.small}>None recorded.</Text>;
  return <>{items.map((item, index) => <Text key={`${index}-${item}`} style={styles.small}>• {item}</Text>)}</>;
}

function CaseReportPdf({ report }: { report: CaseReport }) {
  const title = report.listing.title ?? "Untitled listing";
  const scoreSummary = report.score
    ? `${report.score.totalScore} / ${report.score.riskLevel} / ${report.score.confidenceBand}`
    : "No score recorded";

  return (
    <Document title={`BrandArmor evidence report — ${title}`} author="BrandArmor">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>BrandArmor • Evidence report • Internal review</Text>
          <Text style={styles.title}>Evidence report</Text>
          <Text style={styles.subtitle}>{title}</Text>
          <Text style={styles.badge}>Generated {report.generatedAt}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Case summary</Text>
          <View style={styles.card}>
            <View style={styles.grid}>
              <DisplayField label="Listing ID" value={report.listing.id} />
              <DisplayField label="Marketplace" value={report.listing.marketplace} />
              <DisplayField label="Seller" value={report.listing.sellerName} />
              <DisplayField label="Observed" value={report.listing.observedAt} />
              <DisplayField label="Price" value={report.listing.price == null ? null : `${report.listing.currency ?? "IDR"} ${report.listing.price}`} />
              <DisplayField label="Routing score" value={scoreSummary} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product baseline and provenance</Text>
          <View style={styles.card}>
            <Text style={styles.value}>{report.baseline ? report.baseline.name : "No product baseline linked"}</Text>
            {report.baseline && <Text style={styles.small}>BPOM/NIE: {report.baseline.bpomNie ?? "Not recorded"} • Official references: {report.baseline.officialUrls.length}</Text>}
            <View style={{ marginTop: 6 }}>
              {report.provenance.map((item) => <Text key={item.area} style={styles.small}>• {item.area}: {item.mode.toUpperCase()} — {item.detail}</Text>)}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why the case was routed</Text>
          <View style={styles.card}>
            {report.score?.reasons.length ? report.score.reasons.map((reason) => (
              <View key={reason.ruleId} style={styles.reason}>
                <Text style={styles.value}>{reason.ruleName} ({reason.points} points)</Text>
                <Text style={styles.small}>{reason.message}</Text>
                <Text style={styles.small}>Evidence IDs: {reason.evidenceRefs.join(", ") || "none"}</Text>
              </View>
            )) : <Text style={styles.small}>No deterministic score reasons are recorded.</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Evidence checks</Text>
          <View style={styles.card}>
            <Text style={styles.value}>OCR: {report.ocr ? `${report.ocr.provider} / ${report.ocr.status}` : "Not run"}</Text>
            <Text style={styles.small}>BPOM/NIE: {report.regulatory ? `${report.regulatory.provider} / ${report.regulatory.status}` : "Not run"}</Text>
            <Text style={styles.small}>Visual: {report.visual ? `${report.visual.provider} / ${report.visual.status}` : "Not run"}</Text>
            <Text style={styles.small}>Judge: {report.judge ? `${report.judge.provider} / ${report.judge.judgeRisk}` : "Not run"}</Text>
            <Text style={styles.small}>Evidence records: {report.evidence.length}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Investigation trail and reviewer gate</Text>
          <View style={styles.card}>
            {report.investigation.events.map((event) => <Text key={event.id} style={styles.small}>• {event.type.replaceAll("_", " ")}: {event.summary}</Text>)}
            <Text style={[styles.value, { marginTop: 6 }]}>Missing evidence</Text>
            <List items={report.investigation.missingEvidence.map((item) => item.replaceAll("_", " "))} />
            <Text style={[styles.value, { marginTop: 6 }]}>Recommended next actions</Text>
            <List items={report.investigation.nextRecommendedActions} />
          </View>
        </View>

        <View style={styles.warning}>
          <Text style={styles.value}>{report.disclaimer}</Text>
          <Text style={[styles.small, { marginTop: 4 }]}>{report.claimBoundary}</Text>
          {report.judge?.doNotClaimReasons.length ? <Text style={[styles.small, { marginTop: 4 }]}>Claim limits: {report.judge.doNotClaimReasons.join(" ")}</Text> : null}
        </View>

        <Text style={styles.footer}>BrandArmor evidence report • Case data may be user-provided or collected • Not for automatic enforcement or legal determination</Text>
      </Page>
    </Document>
  );
}

export async function renderCaseReportPdf(report: CaseReport): Promise<Buffer> {
  return renderToBuffer(<CaseReportPdf report={report} />) as Promise<Buffer>;
}
