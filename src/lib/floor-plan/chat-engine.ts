import { generateFloors } from "./generate";
import type {
  ChatTurnResult,
  ConversationStep,
  FloorPlanRequest,
  FloorPlanSpec,
  QuickReply,
} from "./types";

const FLOORS_OPTIONS: QuickReply[] = [
  { label: "RDC seul (1 niveau)", value: "1" },
  { label: "R+1 (2 niveaux)", value: "2" },
  { label: "R+2 (3 niveaux)", value: "3" },
  { label: "R+3 (4 niveaux)", value: "4" },
];

const SURFACE_OPTIONS: QuickReply[] = [
  { label: "60 m²", value: "60" },
  { label: "100 m²", value: "100" },
  { label: "150 m²", value: "150" },
  { label: "200 m²", value: "200" },
];

const CHAMBRES_OPTIONS: QuickReply[] = ["1", "2", "3", "4", "5"].map((n) => ({
  label: `${n} chambre${n === "1" ? "" : "s"}`,
  value: n,
}));

const SDB_OPTIONS: QuickReply[] = ["1", "2", "3"].map((n) => ({
  label: `${n} salle${n === "1" ? "" : "s"} de bain`,
  value: n,
}));

const YES_NO: QuickReply[] = [
  { label: "Oui", value: "oui" },
  { label: "Non", value: "non" },
];

const REVIEW_OPTIONS: QuickReply[] = [
  { label: "Aucun changement, c'est parfait", value: "valider" },
  { label: "Proposer un nouveau plan", value: "nouveau_plan" },
];

function parseYesNo(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized.startsWith("oui") || normalized.startsWith("o") || normalized.startsWith("y");
}

function parseNumber(text: string): number | null {
  const match = text.replace(",", ".").match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

function fillDefaults(request: Partial<FloorPlanRequest>): Required<FloorPlanRequest> {
  return {
    floorsCount: request.floorsCount ?? 1,
    surfacePerFloorM2: request.surfacePerFloorM2 ?? 80,
    chambres: request.chambres ?? 2,
    sallesDeBain: request.sallesDeBain ?? 1,
    garage: request.garage ?? false,
    terrasse: request.terrasse ?? false,
    bureau: request.bureau ?? false,
  };
}

export function quickRepliesForStep(step: ConversationStep): QuickReply[] | undefined {
  switch (step) {
    case "floors":
      return FLOORS_OPTIONS;
    case "surface":
      return SURFACE_OPTIONS;
    case "chambres":
      return CHAMBRES_OPTIONS;
    case "sdb":
      return SDB_OPTIONS;
    case "garage":
    case "terrasse":
    case "bureau":
      return YES_NO;
    case "review":
      return REVIEW_OPTIONS;
    case "done":
    default:
      return undefined;
  }
}

export function initialAssistantTurn(): { assistantMessage: string; quickReplies: QuickReply[] } {
  return {
    assistantMessage:
      "Bonjour ! Je vais vous aider à générer un plan. Combien de niveaux souhaitez-vous pour ce bâtiment ?",
    quickReplies: FLOORS_OPTIONS,
  };
}

export function advanceConversation(spec: FloorPlanSpec, input: { value: string }): ChatTurnResult {
  const request = { ...spec.request };

  switch (spec.step) {
    case "floors": {
      const n = parseNumber(input.value);
      const floorsCount = n && n >= 1 && n <= 4 ? Math.round(n) : 1;
      request.floorsCount = floorsCount;
      return {
        spec: { ...spec, request, step: "surface" },
        assistantMessage: `${floorsCount} niveau${floorsCount > 1 ? "x" : ""}, noté. Quelle surface au sol visez-vous par étage (en m²) ?`,
        quickReplies: SURFACE_OPTIONS,
      };
    }
    case "surface": {
      const n = parseNumber(input.value);
      const surfacePerFloorM2 = n && n > 15 ? n : 80;
      request.surfacePerFloorM2 = surfacePerFloorM2;
      return {
        spec: { ...spec, request, step: "chambres" },
        assistantMessage: `${surfacePerFloorM2} m² par étage. Combien de chambres au total ?`,
        quickReplies: CHAMBRES_OPTIONS,
      };
    }
    case "chambres": {
      const n = parseNumber(input.value);
      const chambres = n && n >= 0 ? Math.round(n) : 2;
      request.chambres = chambres;
      return {
        spec: { ...spec, request, step: "sdb" },
        assistantMessage: `${chambres} chambre${chambres > 1 ? "s" : ""}. Combien de salles de bain ?`,
        quickReplies: SDB_OPTIONS,
      };
    }
    case "sdb": {
      const n = parseNumber(input.value);
      const sallesDeBain = n && n >= 0 ? Math.round(n) : 1;
      request.sallesDeBain = sallesDeBain;
      return {
        spec: { ...spec, request, step: "garage" },
        assistantMessage: "Souhaitez-vous un garage ?",
        quickReplies: YES_NO,
      };
    }
    case "garage": {
      request.garage = parseYesNo(input.value);
      return {
        spec: { ...spec, request, step: "terrasse" },
        assistantMessage: "Souhaitez-vous une terrasse ?",
        quickReplies: YES_NO,
      };
    }
    case "terrasse": {
      request.terrasse = parseYesNo(input.value);
      return {
        spec: { ...spec, request, step: "bureau" },
        assistantMessage: "Un bureau ?",
        quickReplies: YES_NO,
      };
    }
    case "bureau": {
      request.bureau = parseYesNo(input.value);
      const finalRequest = fillDefaults(request);
      const floors = generateFloors(finalRequest, spec.layoutSeed);
      return {
        spec: { ...spec, request: finalRequest, step: "review", floors },
        assistantMessage:
          "Votre plan est prêt, consultez-le en 2D et en 3D à droite. Voulez-vous une nouvelle proposition, ou une modification (ex. « ajoute une chambre », « retire le garage », « 3 niveaux ») ?",
        quickReplies: REVIEW_OPTIONS,
      };
    }
    case "review":
    case "done":
    default:
      return advanceReview(spec, input.value);
  }
}

function regenerate(spec: FloorPlanSpec, request: Required<FloorPlanRequest>, message: string): ChatTurnResult {
  const floors = generateFloors(request, spec.layoutSeed);
  return {
    spec: { ...spec, request, step: "review", floors },
    assistantMessage: message,
    quickReplies: REVIEW_OPTIONS,
  };
}

function advanceReview(spec: FloorPlanSpec, text: string): ChatTurnResult {
  const normalized = text.trim().toLowerCase();
  const request = fillDefaults(spec.request);

  if (normalized === "valider" || /aucun changement|c'est parfait|^parfait$/.test(normalized)) {
    return {
      spec: { ...spec, step: "done" },
      assistantMessage: "Très bien, ce plan est finalisé. Vous pouvez l'exporter en PDF depuis les boutons ci-dessus.",
    };
  }

  if (normalized === "nouveau_plan" || /nouveau plan|autre proposition|autre agencement/.test(normalized)) {
    return regenerate(
      { ...spec, layoutSeed: spec.layoutSeed + 1 },
      request,
      "Voici une nouvelle proposition d'agencement, pour les mêmes surfaces. Cela vous convient-il ?"
    );
  }

  const removalWords = /(retire|enlève|enleve|supprime|sans)/;
  const additionWords = /(ajoute|rajoute|avec|je veux|mets|ajouter)/;

  if (/chambre/.test(normalized)) {
    const delta = parseNumber(normalized) ?? 1;
    if (removalWords.test(normalized)) {
      request.chambres = Math.max(0, request.chambres - Math.round(delta));
    } else if (additionWords.test(normalized) || parseNumber(normalized) === null) {
      request.chambres += Math.max(1, Math.round(delta));
    } else {
      request.chambres = Math.round(delta);
    }
    return regenerate(spec, request, `C'est modifié : ${request.chambres} chambre(s) au total.`);
  }

  if (/salle(s)? de bain|sdb/.test(normalized)) {
    const delta = parseNumber(normalized) ?? 1;
    if (removalWords.test(normalized)) {
      request.sallesDeBain = Math.max(0, request.sallesDeBain - Math.round(delta));
    } else {
      request.sallesDeBain += Math.max(1, Math.round(delta));
    }
    return regenerate(spec, request, `C'est modifié : ${request.sallesDeBain} salle(s) de bain au total.`);
  }

  if (/garage/.test(normalized)) {
    request.garage = !removalWords.test(normalized);
    return regenerate(spec, request, request.garage ? "Garage ajouté." : "Garage retiré.");
  }

  if (/terrasse/.test(normalized)) {
    request.terrasse = !removalWords.test(normalized);
    return regenerate(spec, request, request.terrasse ? "Terrasse ajoutée." : "Terrasse retirée.");
  }

  if (/bureau/.test(normalized)) {
    request.bureau = !removalWords.test(normalized);
    return regenerate(spec, request, request.bureau ? "Bureau ajouté." : "Bureau retiré.");
  }

  if (/niveau|étage|etage/.test(normalized)) {
    const n = parseNumber(normalized);
    if (n) {
      request.floorsCount = Math.min(4, Math.max(1, Math.round(n)));
      return regenerate(spec, request, `Le plan compte maintenant ${request.floorsCount} niveau(x).`);
    }
  }

  if (/surface|m2|m²/.test(normalized)) {
    const n = parseNumber(normalized);
    if (n && n > 15) {
      request.surfacePerFloorM2 = n;
      return regenerate(spec, request, `Surface par étage mise à jour : ${n} m².`);
    }
  }

  return {
    spec,
    assistantMessage:
      "Je n'ai pas compris cette demande. Essayez par exemple : « ajoute une chambre », « retire le garage », « 3 niveaux », « surface 120 m² » ou « nouveau plan ».",
    quickReplies: REVIEW_OPTIONS,
  };
}
