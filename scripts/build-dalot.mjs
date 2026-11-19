// Assemble l'outil autonome outils/Dalot_Pro_CI.html : interface + moteur de calcul + têtes d'ouvrage + module de plans dans un seul fichier.
// Usage : node scripts/build-dalot.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const racine = new URL('../outils/', import.meta.url);
const gabarit = readFileSync(new URL('dalot/interface.html', racine), 'utf8');
const moteur = readFileSync(new URL('dalot/moteur-dalot.cjs', racine), 'utf8');
const plans = readFileSync(new URL('dalot/plans-dalot.cjs', racine), 'utf8');
const tetes = readFileSync(new URL('dalot/tetes-dalot.cjs', racine), 'utf8');
const marque = '/*__MOTEUR__*/';
if (!gabarit.includes(marque)) throw new Error('Repère du moteur introuvable dans interface.html');
for (const [nom, src] of [['moteur', moteur], ['tetes', tetes], ['plans', plans]]) if (src.includes('</script')) throw new Error(`Le module ${nom} ne doit pas contenir de balise script fermante`);
if (!gabarit.includes('/*__PLANS__*/')) throw new Error('Repère du module de plans introuvable dans interface.html');
writeFileSync(new URL('Dalot_Pro_CI.html', racine), gabarit.split(marque).join(moteur).split('/*__TETES__*/').join(tetes).split('/*__PLANS__*/').join(plans));
console.log('outils/Dalot_Pro_CI.html généré');
