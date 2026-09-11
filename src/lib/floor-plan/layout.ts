export interface AreaItem {
  id: string;
  areaM2: number;
}

export interface PlacedRect extends AreaItem {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Pavage rectangulaire sans chevauchement d'une surface width×height, par découpes
 * binaires récursives alternant horizontal/vertical (méthode "slice-and-dice").
 * Chaque pièce reçoit une aire proportionnelle à son poids d'origine.
 */
export function tileRects(
  items: AreaItem[],
  x: number,
  y: number,
  width: number,
  height: number,
  horizontalFirst = width >= height
): PlacedRect[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ ...items[0], x, y, width, height }];
  }

  const totalArea = items.reduce((sum, item) => sum + item.areaM2, 0);
  let acc = 0;
  let splitIndex = 1;
  for (let i = 0; i < items.length; i++) {
    acc += items[i].areaM2;
    if (acc >= totalArea / 2) {
      splitIndex = i + 1;
      break;
    }
  }
  splitIndex = Math.min(Math.max(splitIndex, 1), items.length - 1);

  const groupA = items.slice(0, splitIndex);
  const groupB = items.slice(splitIndex);
  const areaA = groupA.reduce((sum, item) => sum + item.areaM2, 0);
  const fractionA = totalArea > 0 ? areaA / totalArea : 0.5;

  if (horizontalFirst) {
    const widthA = width * fractionA;
    return [
      ...tileRects(groupA, x, y, widthA, height, false),
      ...tileRects(groupB, x + widthA, y, width - widthA, height, false),
    ];
  }

  const heightA = height * fractionA;
  return [
    ...tileRects(groupA, x, y, width, heightA, true),
    ...tileRects(groupB, x, y + heightA, width, height - heightA, true),
  ];
}

/** Dimensions d'une empreinte rectangulaire pour une surface donnée, ratio largeur/profondeur cible ~1.3. */
export function footprintForArea(areaM2: number, aspectRatio = 1.3) {
  const widthM = Math.sqrt(areaM2 * aspectRatio);
  const depthM = areaM2 / widthM;
  return { widthM, depthM };
}
