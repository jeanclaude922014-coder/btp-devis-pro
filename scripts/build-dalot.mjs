// Assemble l'outil autonome outils/Dalot_Pro_CI.html : interface + moteur de calcul dans un seul fichier.
// Usage : node scripts/build-dalot.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const racine = new URL('../outils/', import.meta.url);
const gabarit = readFileSync(new URL('dalot/interface.html', racine), 'utf8');
const moteur = readFileSync(new URL('dalot/moteur-dalot.cjs', racine), 'utf8');
const marque = '/*__MOTEUR__*/';
if (!gabarit.includes(marque)) throw new Error('Repère du moteur introuvable dans interface.html');
if (moteur.includes('</script')) throw new Error('Le moteur ne doit pas contenir de balise script fermante');
writeFileSync(new URL('Dalot_Pro_CI.html', racine), gabarit.split(marque).join(moteur));
console.log('outils/Dalot_Pro_CI.html généré');
