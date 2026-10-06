# -*- coding: utf-8 -*-
"""Mini-moteur de formules : une même définition de calcul est écrite
1) dans les feuilles visibles (configuration active) et
2) dans la feuille masquée CALC_GABARITS (une colonne par gabarit / scénario),
ce qui garantit que le comparatif des 7 gabarits utilise exactement les mêmes règles.

Syntaxe des expressions : formules Excel (noms anglais) avec des jetons {nom}
remplacés par la référence de la cellule correspondante selon le contexte.
"""
import re
from collections import OrderedDict

TOKEN = re.compile(r"\{([A-Za-z_][A-Za-z0-9_]*)\}")


def absref(sheet, coord):
    col = re.match(r"[A-Z]+", coord).group(0)
    row = coord[len(col):]
    return f"'{sheet}'!${col}${row}"


class Model:
    def __init__(self):
        self.params = {}            # nom -> référence absolue (identique dans tous les contextes)
        self.vars = OrderedDict()   # nom -> dict(expr, eng, sheet, coord, fmt)
        self.disps = []             # formules d'affichage (contexte actif uniquement)

    # ------------------------------------------------------------------ définitions
    def param(self, name, sheet, coord):
        if name in self.params or name in self.vars:
            raise ValueError("nom en double : " + name)
        self.params[name] = absref(sheet, coord)

    def var(self, name, expr, sheet, coord, fmt=None, eng=None, label=None):
        if name in self.params or name in self.vars:
            raise ValueError("nom en double : " + name)
        self.vars[name] = dict(expr=expr, eng=eng, sheet=sheet, coord=coord, fmt=fmt,
                               label=label or name)

    def disp(self, sheet, coord, expr, fmt=None):
        self.disps.append((sheet, coord, expr, fmt))

    # ------------------------------------------------------------------ résolution
    def ref(self, name, ctx="A"):
        if name in self.params:
            return self.params[name]
        v = self.vars.get(name)
        if v is None:
            raise KeyError("jeton inconnu : {" + name + "}")
        if ctx == "A":
            return absref(v["sheet"], v["coord"])
        return f"{ctx}{v['erow']}"

    def render(self, expr, ctx="A"):
        return TOKEN.sub(lambda m: self.ref(m.group(1), ctx), expr)

    def R(self, name):
        """Référence active d'un nom (raccourci pour les esquisses)."""
        return self.ref(name, "A")
