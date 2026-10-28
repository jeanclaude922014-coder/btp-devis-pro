import type { SectionId } from "@/lib/dalot/fields";

export type NavItem = { id: string; label: string; section?: SectionId; intro?: string };

export const NAV: { group: string; items: NavItem[] }[] = [
  { group: "Projet", items: [
    { id: "synthese", label: "Synthèse du projet" },
    { id: "general", label: "Données générales", section: "general", intro: "Identification de l'ouvrage, reprise dans le cartouche des plans et l'en-tête de la note." },
  ] },
  { group: "Données", items: [
    { id: "hydro", label: "Hydrologie et hydraulique", section: "hydro", intro: "Débit de crue de projet (Kirpich, Montana, méthode rationnelle) et écoulement dans les cellules (Manning-Strickler)." },
    { id: "geometrie", label: "Géométrie du dalot", section: "geometrie", intro: "Dimensions de l'ouvrage. La coupe se met à jour à chaque saisie et se cote d'elle-même." },
    { id: "remblai", label: "Remblai et chaussée", section: "remblai", intro: "Couverture, poussée des terres et chaussée portée (classe du pont, nombre de voies)." },
    { id: "materiaux", label: "Matériaux et hypothèses", section: "materiaux", intro: "Béton, aciers, enrobage et fissuration (BAEL 91 mod. 99, contrôle EC2)." },
    { id: "sol", label: "Sol de fondation", section: "sol", intro: "Modèle d'appui du radier, caractéristiques du sol, nappe." },
    { id: "convois", label: "Convois de charges", section: "convois", intro: "Fascicule 61 titre II : charges civiles, militaires, exceptionnelles et convoi personnalisé." },
    { id: "tetes", label: "Ouvrages de tête", section: "tetes", intro: "Murs en aile, mur de tête, radiers de tête, bêches et guide-roues." },
    { id: "talus", label: "Talus du remblai", section: "talus", intro: "Stabilité générale du remblai d'accès par la méthode de Fellenius." },
  ] },
  { group: "Calcul et résultats", items: [
    { id: "combinaisons", label: "Combinaisons de calcul" },
    { id: "efforts", label: "Résultats des sollicitations" },
    { id: "dimensionnement", label: "Dimensionnement béton armé" },
    { id: "verifications", label: "Vérifications réglementaires" },
    { id: "res-tetes", label: "Ouvrages de tête (résultats)" },
    { id: "vue3d", label: "Vue 3D" },
  ] },
  { group: "Livrables", items: [
    { id: "plans", label: "Plans DXF" },
    { id: "nomenclature", label: "Nomenclature et métré" },
    { id: "note", label: "Note de calcul Word" },
  ] },
];
