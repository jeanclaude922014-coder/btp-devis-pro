# -*- coding: utf-8 -*-
"""Fiche projet : source unique de données pour le calcul, la note, le DXF et les plans.

Une fiche se lit / s'écrit en JSON, ou se construit à partir du CODE PLANS du classeur Excel.
Elle décrit un bâtiment à une ou plusieurs nefs (portées et pentes indépendantes).
"""
import json
from dataclasses import dataclass, field, asdict
from typing import List


@dataclass
class Nef:
    portee: float            # m
    pente: float = 16.0      # %
    poteau_faitage: bool = False   # poteau intermédiaire sous le faîtage de cette nef


@dataclass
class Vent:
    """Vent EC1 simplifié – valeurs à confirmer (pas de carte EC1 pour la Côte d'Ivoire)."""
    vb: float = 25.0          # m/s, vitesse de référence
    ce: float = 1.7           # coefficient d'exposition ce(z)
    cpe_mur_au_vent: float = 0.8
    cpe_mur_sous_vent: float = -0.3
    cpe_toit_au_vent: float = -0.9     # versant au vent de la 1re nef (moyenne zones F/G/H)
    cpe_toit_sous_vent: float = -0.5   # autres versants
    cpi_surpression: float = 0.2
    cpi_depression: float = -0.3

    @property
    def qp(self):
        """Pression dynamique de pointe (kN/m²)."""
        return self.ce * 0.5 * 1.25 * self.vb ** 2 / 1000


@dataclass
class Projet:
    nom: str = "Bâtiment industriel en charpente métallique"
    lieu: str = "Abidjan (Côte d'Ivoire)"
    client: str = ""
    auteur: str = "Moulo Jean Claude"
    # géométrie
    longueur: float = 40.0
    entraxe: float = 6.0
    hauteur: float = 6.0                        # hauteur sous sablière (m)
    nefs: List[Nef] = field(default_factory=lambda: [Nef(20.0, 16.0)])
    appuis: str = "articulés"                   # « articulés » ou « encastrés »
    jarret_ratio: float = 0.10                  # longueur du jarret / portée de la nef
    jarret_hauteur: float = 2.0                 # hauteur totale au nu du poteau / hauteur de la traverse
    entraxe_pannes: float = 1.35
    entraxe_lisses: float = 1.80
    # profilés (« auto » = choix automatique EC3)
    poteau_rive: str = "auto"
    poteau_interieur: str = "auto"
    traverse: str = "auto"
    famille_poteaux: str = "IPE"                # IPE ou HEA
    # charges (kN/m²)
    G_couverture: float = 0.10                  # tôles, fixations, translucides
    G_pannes: float = 0.06                      # pannes + liernes ramenées au m²
    Q_toiture: float = 0.40                     # EC1 catégorie H
    vent: Vent = field(default_factory=Vent)
    # matériau et critères
    fy: float = 235.0
    E: float = 210000.0
    gM0: float = 1.0
    gM1: float = 1.0
    fleche_traverse: float = 200.0              # L / …
    deplacement_tete: float = 150.0             # H / …
    maintien_poteau: float = 2.0                # longueur de déversement poteau = n × entraxe des lisses (bracons)
    maintien_traverse: float = 2.0              # longueur de déversement traverse = n × entraxe des pannes (bracons)
    # données complémentaires (portes, façade, fondations…) reprises du classeur
    extra: dict = field(default_factory=dict)

    # ------------------------------------------------------------------ dérivés
    @property
    def largeur(self):
        return sum(n.portee for n in self.nefs)

    @property
    def nb_travees(self):
        import math
        return max(1, math.ceil(self.longueur / self.entraxe - 1e-9))

    @property
    def entraxe_reel(self):
        return self.longueur / self.nb_travees

    def description(self):
        nefs = " + ".join(f"{n.portee:g} m" for n in self.nefs)
        return (f"{len(self.nefs)} nef(s) de {nefs} – longueur {self.longueur:g} m – H sablière {self.hauteur:g} m – "
                f"pentes {', '.join(f'{n.pente:g} %' for n in self.nefs)} – portiques tous les {self.entraxe_reel:.2f} m")

    # ------------------------------------------------------------------ E/S
    def to_json(self, path=None):
        txt = json.dumps(asdict(self), ensure_ascii=False, indent=2)
        if path:
            with open(path, "w", encoding="utf-8") as f:
                f.write(txt)
        return txt

    @classmethod
    def from_dict(cls, d):
        d = dict(d)
        d["nefs"] = [Nef(**n) for n in d.get("nefs", [])] or [Nef(20.0)]
        d["vent"] = Vent(**d.get("vent", {}))
        known = {k for k in cls.__dataclass_fields__}
        extra = {k: v for k, v in d.items() if k not in known}
        d = {k: v for k, v in d.items() if k in known}
        p = cls(**d)
        p.extra.update(extra)
        return p

    @classmethod
    def from_json(cls, path):
        with open(path, encoding="utf-8") as f:
            return cls.from_dict(json.load(f))

    @classmethod
    def from_code(cls, code):
        """Construit une fiche à partir du CODE PLANS copié dans le classeur Excel (feuille ACCUEIL)."""
        kv = {}
        for part in code.strip().lstrip("﻿").split(";"):
            if "=" in part:
                k, v = part.split("=", 1)
                kv[k.strip()] = v.strip()

        def num(k, default):
            try:
                return float(kv[k].replace(" ", "").replace(",", "."))
            except (KeyError, ValueError):
                return default

        B, pente = num("B", 20.0), num("p", 16.0)
        p = cls(longueur=num("L", 40.0), entraxe=num("ep", 6.0), hauteur=num("H", 6.0),
                nefs=[Nef(B, pente, kv.get("fint") == "Oui")],
                jarret_ratio=num("rj", 10.0) / 100, entraxe_pannes=num("epan", 1.35),
                entraxe_lisses=num("elis", 1.80))
        sys_treillis = B > 30 or (B > 20 and kv.get("sys") == "Ferme treillis")
        if sys_treillis:
            p.extra["avertissement"] = ("Le classeur retient une ferme treillis : le calcul de portique à âme pleine "
                                        "est donné à titre de comparaison.")
        p.extra.update({k: v for k, v in kv.items()})
        return p
