import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { computeLineTotal, formatXof } from "@/lib/pricing";

Font.register({
  family: "Helvetica-Bold",
  fonts: [{ src: "Helvetica-Bold" }],
});

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  orgName: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  orgLine: { fontSize: 8, color: "#64748b" },
  titleBar: {
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  titleText: { color: "#ffffff", fontSize: 13, fontFamily: "Helvetica-Bold" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    fontSize: 9,
  },
  lotHeader: {
    flexDirection: "row",
    padding: 6,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    padding: 4,
    fontSize: 7.5,
    color: "#64748b",
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    padding: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    fontSize: 8,
  },
  colDesignation: { width: "34%" },
  colUnit: { width: "8%", textAlign: "center" },
  colQty: { width: "10%", textAlign: "right" },
  colPu: { width: "16%", textAlign: "right" },
  colTotal: { width: "16%", textAlign: "right" },
  lotSubtotalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 6,
    backgroundColor: "#f8fafc",
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    marginTop: 16,
    borderRadius: 4,
  },
  grandTotalLabel: { color: "#ffffff", fontSize: 10, fontFamily: "Helvetica-Bold" },
  grandTotalValue: { color: "#ffffff", fontSize: 14, fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#94a3b8",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 6,
  },
});

type OrgInfo = {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  primaryColor: string;
  secondaryColor: string;
  pdfFooterText: string | null;
};

type ProjectInfo = {
  name: string;
  city: string | null;
  reference: string | null;
  contact: { name: string } | null;
};

type LineInfo = {
  designation: string;
  unit: string;
  quantity: number;
  laborHours: number;
  laborRateXof: number;
  materialsXof: number;
  equipmentXof: number;
};

type LotInfo = {
  code: string;
  name: string;
  colorHex: string;
  lines: LineInfo[];
};

type QuoteInfo = {
  name: string;
  currency: string;
  fgPct: number;
  benefitPct: number;
  createdAt: Date;
  lots: LotInfo[];
};

export function QuotePdfDocument({
  organization,
  project,
  quote,
}: {
  organization: OrgInfo;
  project: ProjectInfo;
  quote: QuoteInfo;
}) {
  const grandTotal = quote.lots.reduce(
    (sum, lot) =>
      sum +
      lot.lines.reduce(
        (lotSum, line) =>
          lotSum + computeLineTotal(line, quote.fgPct, quote.benefitPct).totalVente,
        0
      ),
    0
  );

  const footerText = organization.pdfFooterText || organization.name;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.orgName}>{organization.name}</Text>
            {organization.address && <Text style={styles.orgLine}>{organization.address}</Text>}
            <Text style={styles.orgLine}>
              {[organization.phone, organization.email].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.orgLine}>
              Édité le {new Date(quote.createdAt).toLocaleDateString("fr-FR")}
            </Text>
          </View>
        </View>

        <View style={[styles.titleBar, { backgroundColor: organization.primaryColor }]}>
          <Text style={styles.titleText}>DEVIS QUANTITATIF ESTIMATIF — {quote.name}</Text>
        </View>

        <View style={styles.metaRow}>
          <View>
            <Text>Projet : {project.name}</Text>
            {project.reference && <Text>Référence : {project.reference}</Text>}
            {project.city && <Text>Ville : {project.city}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text>Client : {project.contact?.name ?? "—"}</Text>
            <Text>
              Frais généraux {quote.fgPct}% · Bénéfice {quote.benefitPct}%
            </Text>
          </View>
        </View>

        {quote.lots.map((lot, i) => {
          const lotTotal = lot.lines.reduce(
            (sum, line) =>
              sum + computeLineTotal(line, quote.fgPct, quote.benefitPct).totalVente,
            0
          );
          return (
            <View key={i} wrap={false} style={{ marginBottom: 10 }}>
              <View style={[styles.lotHeader, { backgroundColor: lot.colorHex }]}>
                <Text>
                  LOT {lot.code} — {lot.name}
                </Text>
              </View>
              <View style={styles.tableHeaderRow}>
                <Text style={styles.colDesignation}>Désignation</Text>
                <Text style={styles.colUnit}>Unité</Text>
                <Text style={styles.colQty}>Qté</Text>
                <Text style={styles.colPu}>PU ({quote.currency})</Text>
                <Text style={styles.colTotal}>Total ({quote.currency})</Text>
              </View>
              {lot.lines.map((line, j) => {
                const breakdown = computeLineTotal(line, quote.fgPct, quote.benefitPct);
                return (
                  <View key={j} style={styles.tableRow}>
                    <Text style={styles.colDesignation}>{line.designation}</Text>
                    <Text style={styles.colUnit}>{line.unit}</Text>
                    <Text style={styles.colQty}>{line.quantity}</Text>
                    <Text style={styles.colPu}>{formatXof(breakdown.prixVente)}</Text>
                    <Text style={styles.colTotal}>{formatXof(breakdown.totalVente)}</Text>
                  </View>
                );
              })}
              <View style={styles.lotSubtotalRow}>
                <Text>
                  Sous-total lot {lot.code} : {formatXof(lotTotal)} {quote.currency}
                </Text>
              </View>
            </View>
          );
        })}

        <View style={[styles.grandTotalRow, { backgroundColor: organization.secondaryColor }]}>
          <Text style={styles.grandTotalLabel}>TOTAL DEVIS</Text>
          <Text style={styles.grandTotalValue}>
            {formatXof(grandTotal)} {quote.currency}
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>{footerText}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
