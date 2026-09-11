import type { ComponentType, ReactNode } from "react";
import { Document, Page, Text, View, StyleSheet, Svg, Rect, Line, G } from "@react-pdf/renderer";
import { doorMarkForRoom, INNER_WALL_THICKNESS_M, OUTER_WALL_THICKNESS_M, scaleToMmPerMeter } from "@/lib/floor-plan/drawing";
import type { FloorSpec } from "@/lib/floor-plan/types";

const PT_PER_MM = 2.834645669;

/**
 * `<Text fontSize={...}>` à l'intérieur d'un <Svg> est supporté au rendu par @react-pdf/renderer
 * (voir @react-pdf/layout, parseProps) mais absent de son typage SVGTextProps — ce wrapper
 * ajoute juste le prop manquant côté TypeScript.
 */
const SvgText = Text as unknown as ComponentType<{
  x: number;
  y: number;
  fontSize: number;
  fill?: string;
  textAnchor?: "start" | "middle" | "end";
  children?: ReactNode;
}>;

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  orgName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  orgLine: { fontSize: 8, color: "#64748b" },
  titleBar: {
    backgroundColor: "#1E3A5F",
    padding: 8,
    borderRadius: 4,
    marginBottom: 14,
  },
  titleText: { color: "#ffffff", fontSize: 12, fontFamily: "Helvetica-Bold" },
  drawingWrap: {
    alignItems: "center",
    marginTop: 10,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 24,
    right: 24,
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
};

function FloorDrawing({ floor, scale }: { floor: FloorSpec; scale: string }) {
  const mmPerMeter = scaleToMmPerMeter(scale);
  const widthPt = floor.widthM * mmPerMeter * PT_PER_MM;
  const heightPt = floor.depthM * mmPerMeter * PT_PER_MM;
  const margin = 0.35;

  return (
    <Svg
      width={widthPt + margin * mmPerMeter * PT_PER_MM * 2}
      height={heightPt + margin * mmPerMeter * PT_PER_MM * 2 + 20}
      viewBox={`${-margin} ${-margin} ${floor.widthM + margin * 2} ${floor.depthM + margin * 2 + 0.6}`}
    >
      <Rect
        x={0}
        y={0}
        width={floor.widthM}
        height={floor.depthM}
        fill="none"
        stroke="#1e293b"
        strokeWidth={OUTER_WALL_THICKNESS_M}
      />
      {floor.rooms.map((room) => {
        const door = doorMarkForRoom(room);
        const fontSize = Math.min(0.3, room.width / 5, room.height / 3);
        return (
          <G key={room.id}>
            <Rect
              x={room.x}
              y={room.y}
              width={room.width}
              height={room.height}
              fill="none"
              stroke="#64748b"
              strokeWidth={INNER_WALL_THICKNESS_M}
            />
            <Line
              x1={door.gap.x1}
              y1={door.gap.y1}
              x2={door.gap.x2}
              y2={door.gap.y2}
              stroke="#ffffff"
              strokeWidth={INNER_WALL_THICKNESS_M + 0.03}
            />
            <Line
              x1={door.leaf.x1}
              y1={door.leaf.y1}
              x2={door.leaf.x2}
              y2={door.leaf.y2}
              stroke="#94a3b8"
              strokeWidth={0.025}
            />
            <SvgText
              x={room.x + room.width / 2}
              y={room.y + room.height / 2}
              fontSize={fontSize}
              fill="#1e293b"
              textAnchor="middle"
            >
              {room.label}
            </SvgText>
            <SvgText
              x={room.x + room.width / 2}
              y={room.y + room.height / 2 + fontSize * 1.2}
              fontSize={fontSize * 0.75}
              fill="#64748b"
              textAnchor="middle"
            >
              {`${room.areaM2} m2`}
            </SvgText>
          </G>
        );
      })}
      <SvgText x={floor.widthM / 2} y={floor.depthM + 0.5} fontSize={0.24} fill="#334155" textAnchor="middle">
        {`${floor.label} — Echelle ${scale}`}
      </SvgText>
    </Svg>
  );
}

export function FloorPlanPdfDocument({
  organization,
  planName,
  scale,
  floors,
}: {
  organization: OrgInfo;
  planName: string;
  scale: string;
  floors: FloorSpec[];
}) {
  return (
    <Document>
      {floors.map((floor) => (
        <Page key={floor.level} size="A4" style={styles.page}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.orgName}>{organization.name}</Text>
              {organization.address && <Text style={styles.orgLine}>{organization.address}</Text>}
              {organization.phone && <Text style={styles.orgLine}>{organization.phone}</Text>}
            </View>
            <Text style={styles.orgLine}>Édité le {new Date().toLocaleDateString("fr-FR")}</Text>
          </View>

          <View style={styles.titleBar}>
            <Text style={styles.titleText}>
              PLAN {floor.label.toUpperCase()} — {planName}
            </Text>
          </View>

          <View style={styles.drawingWrap}>
            <FloorDrawing floor={floor} scale={scale} />
          </View>

          <View style={styles.footer} fixed>
            <Text>
              Plan schématique d&apos;avant-projet généré automatiquement — dimensionnement structurel
              (poteaux, poutres, fondations) à vérifier selon l&apos;Eurocode 2 / BAEL par un professionnel
              avant exécution.
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
