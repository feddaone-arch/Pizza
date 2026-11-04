// Grunnlagsdata. Tallene for gjær, salt, vann, melblandinger og hevefordeling er
// regnet om til bakerprosent fra oppskriftene og tabellene i «Pizzamani – Perfekt
// pizza hjemme» (Rene Munthe Eik). Boken forutsetter 21 °C romtemperatur og 4 °C i kjøleskap.

export const BOOK = { roomTemp: 21, fridgeTemp: 4, saltPct: 3.0, firstWaterPct: 60, holdBackPct: 3 };

// Fersk gjær (Idun) i % av mel, per total hevetid i timer.
// RT = kun romtemperatur (50/50 bulk/ball). CT = 2 t RT + kjøleskap + 8 t RT i ball.
export const YEAST = {
  rt: [[3, 1.49], [7, 0.46], [8, 0.346], [10, 0.28], [12, 0.192]],
  ct: [[20, 0.229], [24, 0.214], [36, 0.183], [48, 0.159], [72, 0.133]],
  // Med 10 % sammalt emmer/rug (tabellene på s. 168–171)
  ctWholegrain: [[20, 0.276], [24, 0.258], [36, 0.214], [48, 0.181], [72, 0.137]],
};

// Forhold fersk : tørrgjær ifølge bokens tabeller (8/12 t RT ≈ 2,35, kjøleskapsdeiger ≈ 1,26)
export const DRY_RATIO = { rt: 2.35, ct: 1.26 };

export const FLOURS = {
  doppio: { name: 'Caputo Doppio Zero', short: 'Doppio Zero', strength: 'Svakt', w: 'W ca. 220–240' },
  pizzeria: { name: 'Caputo Pizzeria', short: 'Pizzeria', strength: 'Middels', w: 'W ca. 260–270' },
  cuoco: { name: 'Caputo Cuoco', short: 'Cuoco', strength: 'Sterkt', w: 'W ca. 300–320' },
  manitoba: { name: 'Caputo Manitoba Oro', short: 'Manitoba', strength: 'Veldig sterkt', w: 'W ca. 350–380' },
  wholegrain: { name: 'Fin sammalt emmer eller rug', short: 'Emmer/rug', strength: 'Smak', w: '' },
  criscito: { name: 'Criscito eller Naturkraft', short: 'Criscito', strength: 'Smak', w: 'tørr surdeigsbase' },
};

// Melblandinger (andel av totalt mel). «short» = mel for korte hevinger (Doppio Zero eller Pizzeria).
// Uten sammalt mel går de 10 % til det svakeste melet i blandingen.
export const BLENDS = {
  1: { label: 'Blanding 1', parts: [['short', 0.9]], weakest: 'short', maxHydration: 64, use: 'Korte hevinger, 3–12 t' },
  2: { label: 'Blanding 2', parts: [['short', 0.567], ['cuoco', 0.333]], weakest: 'short', maxHydration: 66, use: 'Ca. 20–24 t' },
  3: { label: 'Blanding 3', parts: [['cuoco', 0.9]], weakest: 'cuoco', maxHydration: 68, use: 'Ca. 36–48 t' },
  4: { label: 'Blanding 4', parts: [['cuoco', 0.387], ['manitoba', 0.513]], weakest: 'cuoco', maxHydration: 72, use: 'Lange hevinger, 60–72 t' },
};

export function blendForHours(hours) {
  if (hours <= 12) return 1;
  if (hours <= 30) return 2;
  if (hours <= 60) return 3;
  return 4;
}

// Ovnstemperatur styrer olje, sukker og steketid. Napolitansk deig er uten olje og sukker;
// tilleggene under er en tilpasning for hjemmeovner som ikke når 450 °C.
export const OVENS = {
  500: { label: '450–500 °C', oil: 0, sugar: 0, bake: '60–90 sek', note: 'Klassisk napolitansk. Snu pizzaen etter 20–30 sek.' },
  400: { label: 'ca. 400 °C', oil: 0, sugar: 0, bake: '90–120 sek', note: 'Nesten napolitansk. Snu pizzaen et par ganger for jevn steking.' },
  350: { label: 'ca. 350 °C', oil: 1, sugar: 0, bake: '2–3 min', note: 'Litt olje gir mykere bunn ved lengre steketid.' },
  300: { label: 'ca. 300 °C', oil: 2, sugar: 1, bake: '3–5 min', note: 'Olje og sukker gir farge og hindrer at bunnen blir tørr og hard.' },
  250: { label: 'ca. 250 °C', oil: 3, sugar: 2, bake: '6–9 min', note: 'Vanlig stekeovn. Bruk øverste rille og grillelement de siste minuttene.' },
};

export const SURFACES = {
  steel: { label: 'Pizzastål', note: 'Stål leder varme best og er førstevalget under 350 °C. Forvarm 45–60 min.' },
  stone: { label: 'Pizzastein', note: 'Stein fungerer best fra ca. 300 °C og oppover. Forvarm minst 60 min.' },
  none: { label: 'Ingen', note: 'Forvarm en stekeplate opp ned i ovnen og skyv pizzaen rett på den. Regn med lengre steketid.' },
};

// Friksjonsvarme ved 20 min elting (°C) brukt i vanntemperatur-regnestykket. Kalibrert slik at
// kjøleskapskaldt vann (4–6 °C) gir ferdig deig på ca. 22 °C i et 21 °C rom, som i boken.
// Isbiter anbefales bare for spiralmaskin; for hånd og med kjøkkenmaskin er de vanskelige å elte inn.
export const MIXERS = {
  hand: { label: 'For hånd', friction: 12, ice: false },
  spiral: { label: 'Spiralmaskin (f.eks. Wilfa Probaker)', friction: 17, ice: true },
  kitchen: { label: 'Kjøkkenmaskin med krok', friction: 20, ice: false },
};

export const STYLES = {
  napoletana: { label: 'Napolitansk', ready: true },
  newyork: { label: 'New York (kommer)', ready: false },
  romana: { label: 'Romersk i langpanne (kommer)', ready: false },
  detroit: { label: 'Detroit (kommer)', ready: false },
};

export const TIPS = [
  'Strekk ut pizzaen på semulina (rimacinata) i stedet for tipo 00. Semulina fester seg ikke like lett, brenner mindre i ovnen og trekkes ikke inn i deigen, så hydreringen holder seg.',
  'Bruk fint salt. Grovt salt bør knuses i en morter først, ellers løses det ikke opp.',
  'Små gjærmengder er vanskelige å veie. Bruk en gullvekt (0,01 g), eller løs opp 1 g gjær i 100 g av vannet og bruk den andelen oppskriften trenger.',
  'Mål temperaturen på deigen underveis i eltingen. Den bør ende på 20–24 °C og aldri over 28 °C.',
  'Når du deler opp deigen, skal den tette oversiden av bulkdeigen også bli oversiden av ballen.',
  'Ferdig hevede baller holder seg 4–6 timer i romtemperatur. Skal de ikke brukes på en stund, kan de settes i kjøleskapet.',
  'Har deigen over 68 % hydrering, hjelper det å smøre benken og hendene med et tynt lag olivenolje.',
  'Ved høy hydrering kan deigen balles rett fra kjøleskapet, for da er den fastere og lettere å forme.',
];
