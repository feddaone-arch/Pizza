// Generert av build.py – ikke rediger direkte.
(() => {
'use strict';
// ---- data.js ----
// Grunnlagsdata. Tallene for gjær, salt, vann, melblandinger og hevefordeling er
// regnet om til bakerprosent fra oppskriftene og tabellene i «Pizzamani – Perfekt
// pizza hjemme» (Rene Munthe Eik). Boken forutsetter 21 °C romtemperatur og 4 °C i kjøleskap.

const BOOK = { roomTemp: 21, fridgeTemp: 4, saltPct: 3.0, firstWaterPct: 60, holdBackPct: 3 };

// Fersk gjær (Idun) i % av mel, per total hevetid i timer.
// RT = kun romtemperatur (50/50 bulk/ball). CT = 2 t RT + kjøleskap + 8 t RT i ball.
const YEAST = {
  rt: [[3, 1.49], [7, 0.46], [8, 0.346], [10, 0.28], [12, 0.192]],
  ct: [[20, 0.229], [24, 0.214], [36, 0.183], [48, 0.159], [72, 0.133]],
  // Med 10 % sammalt emmer/rug (tabellene på s. 168–171)
  ctWholegrain: [[20, 0.276], [24, 0.258], [36, 0.214], [48, 0.181], [72, 0.137]],
};

// Forhold fersk : tørrgjær ifølge bokens tabeller (8/12 t RT ≈ 2,35, kjøleskapsdeiger ≈ 1,26)
const DRY_RATIO = { rt: 2.35, ct: 1.26 };

const FLOURS = {
  doppio: { name: 'Caputo Doppio Zero', short: 'Doppio Zero', strength: 'Svakt', w: 'W ca. 220–240' },
  pizzeria: { name: 'Caputo Pizzeria', short: 'Pizzeria', strength: 'Middels', w: 'W ca. 260–270' },
  cuoco: { name: 'Caputo Cuoco', short: 'Cuoco', strength: 'Sterkt', w: 'W ca. 300–320' },
  manitoba: { name: 'Caputo Manitoba Oro', short: 'Manitoba', strength: 'Veldig sterkt', w: 'W ca. 350–380' },
  wholegrain: { name: 'Fin sammalt emmer eller rug', short: 'Emmer/rug', strength: 'Smak', w: '' },
  criscito: { name: 'Criscito eller Naturkraft', short: 'Criscito', strength: 'Smak', w: 'tørr surdeigsbase' },
};

// Melblandinger (andel av totalt mel). «short» = mel for korte hevinger (Doppio Zero eller Pizzeria).
// Uten sammalt mel går de 10 % til det svakeste melet i blandingen.
const BLENDS = {
  1: { label: 'Blanding 1', parts: [['short', 0.9]], weakest: 'short', maxHydration: 64, use: 'Korte hevinger, 3–12 t' },
  2: { label: 'Blanding 2', parts: [['short', 0.567], ['cuoco', 0.333]], weakest: 'short', maxHydration: 66, use: 'Ca. 20–24 t' },
  3: { label: 'Blanding 3', parts: [['cuoco', 0.9]], weakest: 'cuoco', maxHydration: 68, use: 'Ca. 36–48 t' },
  4: { label: 'Blanding 4', parts: [['cuoco', 0.387], ['manitoba', 0.513]], weakest: 'cuoco', maxHydration: 72, use: 'Lange hevinger, 60–72 t' },
};

function blendForHours(hours) {
  if (hours <= 12) return 1;
  if (hours <= 30) return 2;
  if (hours <= 60) return 3;
  return 4;
}

// Ovnstemperatur styrer olje, sukker og steketid. Napolitansk deig er uten olje og sukker;
// tilleggene under er en tilpasning for hjemmeovner som ikke når 450 °C.
const OVENS = {
  500: { label: '450–500 °C', oil: 0, sugar: 0, bake: '60–90 sek', note: 'Klassisk napolitansk. Snu pizzaen etter 20–30 sek.' },
  400: { label: 'ca. 400 °C', oil: 0, sugar: 0, bake: '90–120 sek', note: 'Nesten napolitansk. Snu pizzaen et par ganger for jevn steking.' },
  350: { label: 'ca. 350 °C', oil: 1, sugar: 0, bake: '2–3 min', note: 'Litt olje gir mykere bunn ved lengre steketid.' },
  300: { label: 'ca. 300 °C', oil: 2, sugar: 1, bake: '3–5 min', note: 'Olje og sukker gir farge og hindrer at bunnen blir tørr og hard.' },
  250: { label: 'ca. 250 °C', oil: 3, sugar: 2, bake: '6–9 min', note: 'Vanlig stekeovn. Bruk øverste rille og grillelement de siste minuttene.' },
};

const SURFACES = {
  steel: { label: 'Pizzastål', note: 'Stål leder varme best og er førstevalget under 350 °C. Forvarm 45–60 min.' },
  stone: { label: 'Pizzastein', note: 'Stein fungerer best fra ca. 300 °C og oppover. Forvarm minst 60 min.' },
  none: { label: 'Ingen', note: 'Forvarm en stekeplate opp ned i ovnen og skyv pizzaen rett på den. Regn med lengre steketid.' },
};

// Friksjonsvarme ved 20 min elting (°C) brukt i vanntemperatur-regnestykket. Kalibrert slik at
// kjøleskapskaldt vann (4–6 °C) gir ferdig deig på ca. 22 °C i et 21 °C rom, som i boken.
// Isbiter anbefales bare for spiralmaskin; for hånd og med kjøkkenmaskin er de vanskelige å elte inn.
const MIXERS = {
  hand: { label: 'For hånd', friction: 12, ice: false },
  spiral: { label: 'Spiralmaskin (f.eks. Wilfa Probaker)', friction: 17, ice: true },
  kitchen: { label: 'Kjøkkenmaskin med krok', friction: 20, ice: false },
};

const STYLES = {
  napoletana: { label: 'Napolitansk', ready: true },
  newyork: { label: 'New York (kommer)', ready: false },
  romana: { label: 'Romersk i langpanne (kommer)', ready: false },
  detroit: { label: 'Detroit (kommer)', ready: false },
};

const TIPS = [
  'Strekk ut pizzaen på semulina (rimacinata) i stedet for tipo 00. Semulina fester seg ikke like lett, brenner mindre i ovnen og trekkes ikke inn i deigen, så hydreringen holder seg.',
  'Bruk fint salt. Grovt salt bør knuses i en morter først, ellers løses det ikke opp.',
  'Små gjærmengder er vanskelige å veie. Bruk en gullvekt (0,01 g), eller løs opp 1 g gjær i 100 g av vannet og bruk den andelen oppskriften trenger.',
  'Mål temperaturen på deigen underveis i eltingen. Den bør ende på 20–24 °C og aldri over 28 °C.',
  'Når du deler opp deigen, skal den tette oversiden av bulkdeigen også bli oversiden av ballen.',
  'Ferdig hevede baller holder seg 4–6 timer i romtemperatur. Skal de ikke brukes på en stund, kan de settes i kjøleskapet.',
  'Har deigen over 68 % hydrering, hjelper det å smøre benken og hendene med et tynt lag olivenolje.',
  'Ved høy hydrering kan deigen balles rett fra kjøleskapet, for da er den fastere og lettere å forme.',
];

// ---- calc.js ----
// Log-log-interpolasjon mellom ankerpunkter, med ekstrapolasjon langs endesegmentene.
function interp(points, x) {
  const lx = Math.log(x);
  let i = points.findIndex(([px]) => px >= x);
  if (i === -1) i = points.length - 1;
  if (i === 0) i = 1;
  const [x0, y0] = points[i - 1];
  const [x1, y1] = points[i];
  const t = (lx - Math.log(x0)) / (Math.log(x1) - Math.log(x0));
  return Math.exp(Math.log(y0) + t * (Math.log(y1) - Math.log(y0)));
}

// Relativ gjæringshastighet ved temperatur T (Q10 ≈ 2,5), normalisert til 21 °C.
const rate = (t) => Math.pow(2.5, (t - BOOK.roomTemp) / 10);

const MODE_LIMITS = { rt: [3, 18], ct: [14, 72] };

function defaultMode(hours) {
  return hours >= 16 ? 'ct' : 'rt';
}

// Bygger hevefordelingen. Alle tider i timer.
function buildSchedule(input) {
  const { hours, mode } = input;
  if (mode === 'rt') {
    // Boken: 3 t = 1 + 2, 7 t = 3 + 4, ellers halvparten i bulk og halvparten i ball.
    const bulkH = hours <= 4 ? 1 : Math.floor(hours / 2);
    return { mode, rtBefore: bulkH, ct: 0, temper: 0, ballRt: hours - bulkH, total: hours };
  }
  const rtBefore = clamp(input.rtBefore ?? 2, 0, 4);
  const ballRt = clamp(input.ballRt ?? 8, 6, 12);
  const temper = input.temper ? 2 : 0;
  const ct = hours - rtBefore - ballRt - temper;
  return { mode, rtBefore, ct, temper, ballRt, total: hours };
}

function equivalentHours(s, roomTemp, fridgeTemp) {
  return (s.rtBefore + s.temper + s.ballRt) * rate(roomTemp) + s.ct * rate(fridgeTemp);
}

function yeastPct(input, schedule, settings) {
  const { hours, mode, wholegrain } = input;
  let fresh;
  if (mode === 'rt') fresh = interp(YEAST.rt, hours);
  else fresh = interp(wholegrain ? YEAST.ctWholegrain : YEAST.ct, hours);
  // Juster for egen rom-/kjøleskapstemperatur og egen fordeling mot bokens standard.
  // Romtemperering før balling tas fra kjøleskapstiden og bruker samme gjær i boken, så den teller ikke som avvik.
  const bookSchedule = buildSchedule({ hours, mode, temper: schedule.temper > 0 });
  const e0 = equivalentHours(bookSchedule, BOOK.roomTemp, BOOK.fridgeTemp);
  const e = equivalentHours(schedule, settings.roomTemp, settings.fridgeTemp);
  const factor = clamp(e0 / e, 0.25, 4);
  fresh *= factor;
  const dry = fresh / DRY_RATIO[mode];
  return { fresh, dry, factor };
}

// Svakt mel for blanding 1 og 2. Doppio Zero er best på de korteste hevingene og lav hydrering.
// Pizzeria tar opp litt mer vann og holder bedre over tid, men kan bli seigt på svært korte hevinger,
// så det brukes bare fra 7 timer og over 62 % hydrering. (Appens egen regel – boken skiller ikke.)
function shortFlourFor(hours, hydration) {
  if (hours <= 6) return 'doppio';
  return hydration > 62 ? 'pizzeria' : 'doppio';
}

function chooseBlend(input) {
  const notes = [];
  const base = blendForHours(input.hours);
  let id = base;
  const max = (b) => BLENDS[b].maxHydration;
  // Svært korte hevinger får ikke sterkere mel (blir seigt); korte RT-hevinger maks ett steg opp.
  const ceiling = input.hours <= 6 ? base : input.mode === 'rt' ? Math.min(4, base + 1) : 4;
  while (input.hydration > max(id) && id < ceiling) id++;
  if (input.hydration > max(id)) {
    notes.push(input.mode === 'rt' && input.hydration > 66
      ? 'Høy hydrering på en kort heving gir en klissete deig som er vanskelig å forme. Anbefalt maks er ca. 64–66 % for korte hevinger.'
      : `${input.hydration} % er over det anbefalte for denne blandingen (maks ca. ${max(id)} %). Det går, men krever erfaring.`);
  }
  if (input.hydration > 64 && input.hydration <= max(id)) {
    notes.push('Er du ikke vant med høy hydrering, er det lurt å starte på 62–64 %.');
  }
  return { id, base, notes };
}

function flourParts(blendId, input) {
  const blend = BLENDS[blendId];
  const resolve = (k) => (k === 'short' ? input.shortFlour : k);
  const parts = blend.parts.map(([k, f]) => [resolve(k), f]);
  if (input.wholegrain) {
    if (input.criscito) parts.push(['wholegrain', 0.08], ['criscito', 0.02]);
    else parts.push(['wholegrain', 0.1]);
  } else {
    const weak = resolve(blend.weakest);
    const p = parts.find(([k]) => k === weak);
    p[1] += 0.1;
  }
  return parts;
}

function explainFlour(blend, input) {
  const h = `${input.hours} timer`;
  const hyd = `${input.hydration} %`;
  const usesShort = blend.id <= 2;
  const shortName = input.shortFlour === 'doppio' ? 'Doppio Zero' : 'Pizzeria';
  const upgraded = blend.id !== blend.base;
  let why;
  if (upgraded) {
    const extra = { 2: 'en tredjedel Cuoco', 3: 'Cuoco', 4: 'over halvparten Manitoba' }[blend.id];
    why = `${h} heving ville normalt brukt ${BLENDS[blend.base].label.toLowerCase()}, men ${hyd} hydrering krever sterkere mel, så appen bruker ${extra}.`;
  } else if (blend.id === 1) why = `Kort heving (${h}) trenger et svakt mel som blir mykt og luftig på kort tid.`;
  else if (blend.id === 2) why = `Ved ${h} må melet tåle litt lengre gjæring, så en tredjedel er byttet ut med Cuoco.`;
  else if (blend.id === 3) why = `Ved ${h} trengs et sterkt mel som holder strukturen gjennom kjøleskapshevingen.`;
  else why = `Så lang heving krever et veldig sterkt mel, så Manitoba utgjør over halvparten.`;
  if (usesShort) {
    why += input.shortFlour === 'doppio'
      ? (input.hours <= 6 ? ' Doppio Zero er best på så kort heving.' : ` Doppio Zero passer ved ${hyd} hydrering.`)
      : ` Pizzeria er valgt fordi det tar opp mer vann enn Doppio Zero ved ${hyd}.`;
  }
  return { text: why, shortName: usesShort ? shortName : null };
}

function waterTemperature(input, settings) {
  const room = settings.roomTemp;
  const target = room >= 23 ? 21 : room <= 19 ? 23 : 22;
  const flourTemp = settings.chilledFlour ? 8 : room;
  const friction = MIXERS[input.mixer].friction;
  const water = 3 * target - flourTemp - room - friction;
  return { target, water: Math.round(water), friction };
}

function calculate(input, settings) {
  const schedule = buildSchedule(input);
  const oven = OVENS[input.oven];
  const useOvenAdds = input.ovenAdjust;
  const oilPct = useOvenAdds ? oven.oil : 0;
  const sugarPct = useOvenAdds ? oven.sugar : 0;
  const y = yeastPct(input, schedule, settings);
  const blend = chooseBlend(input);
  input = { ...input, shortFlour: shortFlourFor(input.hours, input.hydration) };
  const parts = flourParts(blend.id, input);
  const flourReason = explainFlour(blend, input);

  const ballTarget = input.ballWeight;
  const ballCalc = settings.lossMargin ? ballTarget * 1.04 : ballTarget;
  const margin = settings.lossMargin ? 1.04 : 1;
  const totalDough = input.totalDough ? input.totalDough * margin : input.balls * ballCalc;
  const h = input.hydration / 100;
  const flour = totalDough / (1 + h + BOOK.saltPct / 100 + oilPct / 100 + sugarPct / 100 + y.fresh / 100);

  const water = flour * h;
  const firstWater = flour * Math.min(h, BOOK.firstWaterPct / 100);
  const topUp = water - firstWater;
  const withSalt = Math.min(topUp, flour * BOOK.holdBackPct / 100);
  const gradual = topUp - withSalt;

  const wt = waterTemperature(input, settings);
  let ice = 0;
  if (wt.water < 4) ice = Math.min(water * 0.4, water * (5 - wt.water) / 85);

  return {
    schedule,
    blend,
    flourReason,
    flours: parts.map(([k, f]) => ({ key: k, name: FLOURS[k].name, grams: flour * f, pct: f * 100 })),
    flour,
    water,
    firstWater,
    gradual,
    withSalt,
    salt: flour * BOOK.saltPct / 100,
    oil: flour * oilPct / 100,
    sugar: flour * sugarPct / 100,
    oilPct,
    sugarPct,
    yeast: {
      fresh: flour * y.fresh / 100,
      dry: flour * y.dry / 100,
      lievito: flour * y.dry / 100,
      freshPct: y.fresh,
      dryPct: y.dry,
      factor: y.factor,
    },
    totalDough,
    ballCalc,
    waterTemp: wt,
    ice,
  };
}

// Tidsplan regnet baklengs fra steketidspunkt.
function timeline(input, result, bakeAt) {
  const s = result.schedule;
  const H = 3600e3;
  const steps = [];
  const bake = bakeAt.getTime();
  const ballEnd = bake;
  const ballStart = ballEnd - s.ballRt * H;
  const temperStart = ballStart - s.temper * H;
  const ctStart = temperStart - s.ct * H;
  const bulkStart = ctStart - s.rtBefore * H;
  const restStart = bulkStart - 0.5 * H;
  const kneadStart = restStart - (25 / 60) * H;
  const r = result.waterTemp;

  steps.push({ at: kneadStart - 15 * 60e3, title: 'Vei opp alt', text: `Ta frem ${input.mixer === 'hand' ? 'en stor bolle' : 'eltemaskinen'}, vekt og termometer. Vannet bør være ca. ${Math.max(4, r.water)} °C.` });
  steps.push({ at: kneadStart, title: 'Elt deigen', text: `Ca. 20 minutter. Deigen skal ende på ${r.target - 1}–${r.target + 1} °C, aldri over 28 °C.` });
  steps.push({ at: restStart, title: 'Hvile på benken', text: '20–30 minutter under plast. Brett deretter deigen til en stram ball.' });
  if (s.mode === 'rt') {
    steps.push({ at: bulkStart, title: 'Bulkheving i romtemperatur', text: `${fmtH(s.rtBefore)} i lukket boks.` });
  } else {
    if (s.rtBefore > 0) steps.push({ at: bulkStart, title: 'Bulkheving i romtemperatur', text: `${fmtH(s.rtBefore)} i lukket boks.` });
    steps.push({ at: ctStart, title: 'Inn i kjøleskapet', text: `${fmtH(s.ct)} som bulk i kjøleskapet.` });
    if (s.temper) steps.push({ at: temperStart, title: 'Ut av kjøleskapet', text: '2 timer romtemperering før balling. Gjør deigen mykere å jobbe med.' });
  }
  steps.push({
    at: ballStart,
    title: s.mode === 'ct' && !s.temper ? 'Ball rett fra kjøleskapet' : 'Del opp og ball',
    text: `${input.balls} baller à ${input.ballWeight} g. Heves videre ${fmtH(s.ballRt)} i romtemperatur.`,
  });
  steps.push({ at: bake - 60 * 60e3, title: 'Forvarm ovnen', text: `Ovn og ${input.surface === 'none' ? 'stekeplate' : input.surface === 'steel' ? 'stål' : 'stein'} på full varme.` });
  steps.push({ at: bake, title: 'Stek', text: `Ballene er klare og holder seg 4–6 timer i romtemperatur. Steketid ca. ${OVENS[input.oven].bake}.` });
  return steps.sort((a, b) => a.at - b.at).map((st) => ({ ...st, at: new Date(st.at) }));
}

function fmtH(h) {
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  if (!whole) return `${min} min`;
  return min ? `${whole} t ${min} min` : `${whole} t`;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// ---- store.js ----
// Innstillinger og siste valg i localStorage; bakeloggen (med bilder) i IndexedDB.

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
  } catch {
    return { ...fallback };
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* lagring utilgjengelig (privat modus) – appen virker likevel */
  }
}

const DB_NAME = 'pizzadeig';
const STORE = 'log';
let dbPromise;

function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx(mode, fn) {
  return db().then((d) => new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
    t.onerror = () => reject(t.error);
  }));
}

const logStore = {
  all: () => tx('readonly', (s) => s.getAll()).then((rows) => (rows || []).sort((a, b) => b.date.localeCompare(a.date))),
  get: (id) => tx('readonly', (s) => s.get(id)),
  put: (entry) => tx('readwrite', (s) => s.put(entry)),
  remove: (id) => tx('readwrite', (s) => s.delete(id)),
};

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function dataURLToBlob(url) {
  const res = await fetch(url);
  return res.blob();
}

// Skalerer bilder ned til maks 1280 px før lagring, så loggen ikke blir enorm.
function shrinkImage(file, max = 1280) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Kunne ikke lese bildet'))), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Kunne ikke lese bildet')); };
    img.src = url;
  });
}

// ---- app.js ----
const DEFAULT_INPUT = {
  style: 'napoletana', qtyMode: 'balls', balls: 4, totalGrams: 1000, ballWeight: 250,
  hours: 24, mode: 'ct', rtBefore: 2, ballRt: 8, temper: 'auto',
  hydration: 64, wholegrain: false, criscito: false,
  oven: '300', surface: 'steel', mixer: 'kitchen', ovenAdjust: true,
};
const DEFAULT_SETTINGS = { roomTemp: 21, fridgeTemp: 4, chilledFlour: false, lossMargin: false };

const state = {
  input: loadJSON('pd.input', DEFAULT_INPUT),
  settings: loadJSON('pd.settings', DEFAULT_SETTINGS),
  plan: loadJSON('pd.plan', { bakeAt: null }),
  result: null,
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const g = (n) => (n >= 100 ? Math.round(n) : n >= 10 ? Math.round(n) : Math.round(n * 10) / 10).toLocaleString('nb-NO');
const g2 = (n) => n.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n, d = 1) => `${n.toLocaleString('nb-NO', { maximumFractionDigits: d })} %`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Avledet inndata ---------- */

function effectiveInput() {
  const i = { ...state.input };
  if (i.qtyMode === 'grams') {
    i.balls = Math.max(1, Math.floor(i.totalGrams / i.ballWeight));
    i.totalDough = i.totalGrams;
  }
  i.temper = i.temper === 'auto' ? i.hydration <= 64 : i.temper === 'on';
  if (i.mode === 'ct') {
    // Sørg for minst 2 timer i kjøleskapet ved å korte ned RT-delene.
    const need = () => i.hours - i.rtBefore - i.ballRt - (i.temper ? 2 : 0);
    while (need() < 2 && i.rtBefore > 0) i.rtBefore--;
    while (need() < 2 && i.ballRt > 6) i.ballRt--;
    if (need() < 2) i.temper = false;
  }
  return i;
}

function normalizeMode() {
  const h = state.input.hours;
  if (h < 14) state.input.mode = 'rt';
  else if (h > 18) state.input.mode = 'ct';
}

/* ---------- Deig-visningen ---------- */

function syncControls() {
  const i = state.input;
  $('#style').innerHTML = Object.entries(STYLES).map(([k, s]) => `<option value="${k}" ${s.ready ? '' : 'disabled'} ${k === i.style ? 'selected' : ''}>${s.label}</option>`).join('');
  setSeg('#qtyMode', i.qtyMode);
  $('#row-balls').hidden = i.qtyMode !== 'balls';
  $('#row-grams').hidden = i.qtyMode !== 'grams';
  $('#out-balls').textContent = i.balls;
  $('#out-totalGrams').textContent = `${i.totalGrams.toLocaleString('nb-NO')} g`;
  $('#out-ballWeight').textContent = `${i.ballWeight} g`;

  $('#hours').value = i.hours;
  $('#out-hours').innerHTML = `${i.hours}<small>timer</small>`;
  $$('#hourChips button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.h) === i.hours)));
  setSeg('#mode', i.mode);
  $('#mode [data-value="rt"]').disabled = i.hours > 18;
  $('#mode [data-value="ct"]').disabled = i.hours < 14;
  $('#ctOptions').hidden = i.mode !== 'ct';
  $('#out-rtBefore').textContent = `${i.rtBefore} t`;
  $('#out-ballRt').textContent = `${i.ballRt} t`;
  $('#temper').value = i.temper;
  $('#mode-hint').textContent = i.mode === 'rt'
    ? 'Hele hevingen skjer i romtemperatur, halvparten i bulk og halvparten i ball.'
    : 'Deigen hever først litt i romtemperatur, så i kjøleskapet, og til slutt i ball i romtemperatur.';

  $('#hydration').value = i.hydration;
  $('#out-hydration').innerHTML = `${i.hydration}<small>% hydrering</small>`;
  $('#wholegrain').checked = i.wholegrain;
  $('#criscito').checked = i.criscito;
  $('#row-criscito').hidden = !i.wholegrain;

  setSeg('#oven', String(i.oven));
  setSeg('#surface', i.surface);
  $('#mixer').value = i.mixer;
  $('#ovenAdjust').checked = i.ovenAdjust;

  const s = state.settings;
  $('#out-roomTemp').textContent = `${s.roomTemp} °C`;
  $('#out-fridgeTemp').textContent = `${s.fridgeTemp} °C`;
  $('#chilledFlour').checked = s.chilledFlour;
  $('#lossMargin').checked = s.lossMargin;
}

function setSeg(sel, value) {
  $$(`${sel} button`).forEach((b) => {
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(b.dataset.value === value));
  });
}

function update() {
  normalizeMode();
  saveJSON('pd.input', state.input);
  saveJSON('pd.settings', state.settings);
  syncControls();
  const input = effectiveInput();
  const r = calculate(input, state.settings);
  state.result = r;
  state.eff = input;
  renderResults(input, r);
  renderPlan();
}

function renderResults(i, r) {
  let ballInfo = `${i.balls} × ${i.ballWeight} g = ${(i.balls * i.ballWeight).toLocaleString('nb-NO')} g deig`;
  if (state.input.qtyMode === 'grams') {
    const rest = i.totalGrams - i.balls * i.ballWeight;
    const even = Math.round(i.totalGrams / i.balls);
    ballInfo = `${i.totalGrams.toLocaleString('nb-NO')} g deig gir ${i.balls} ${i.balls === 1 ? 'pizza' : 'pizzaer'} à ${i.ballWeight} g`
      + (rest > 0 ? ` (${i.balls} × ${i.ballWeight} = ${(i.balls * i.ballWeight).toLocaleString('nb-NO')} g) og ${rest} g til overs. Deler du alt likt, blir det ${i.balls} à ${even} g` : '');
  }
  $('#qty-hint').textContent = ballInfo + (state.settings.lossMargin ? ' (beregnet med 4 % svinnmargin)' : '');

  const blend = BLENDS[r.blend.id];
  const s = r.schedule;
  const oven = OVENS[i.oven];
  const notes = [...r.blend.notes];
  if (r.yeast.factor < 0.9 || r.yeast.factor > 1.1) {
    notes.push(`Gjæren er justert ${r.yeast.factor > 1 ? 'opp' : 'ned'} ${Math.round(Math.abs(r.yeast.factor - 1) * 100)} % for dine temperaturer og din hevefordeling.`);
  }

  const flourRows = r.flours.map((f) => `
    <tr><td class="name">${esc(f.name)}${f.key !== 'wholegrain' && f.key !== 'criscito' ? `<small>${FLOURS[f.key].strength} · ${FLOURS[f.key].w}</small>` : ''}</td>
    <td class="g">${g(f.grams)} g</td><td class="p">${pct(f.pct, 0)}</td></tr>`).join('');

  const waterSub = [
    `<tr class="sub"><td>Først i bollen</td><td class="g">${g(r.firstWater)} g</td><td class="p"></td></tr>`,
    r.gradual > 0.5 ? `<tr class="sub"><td>Litt etter litt</td><td class="g">${g(r.gradual)} g</td><td class="p"></td></tr>` : '',
    r.withSalt > 0.5 ? `<tr class="sub"><td>Sammen med saltet</td><td class="g">${g(r.withSalt)} g</td><td class="p"></td></tr>` : '',
  ].join('');

  const extras = [
    r.oil > 0 ? `<tr><td class="name">Olivenolje<small>Tilpasset ${oven.label}</small></td><td class="g">${g(r.oil)} g</td><td class="p">${pct(r.oilPct)}</td></tr>` : '',
    r.sugar > 0 ? `<tr><td class="name">Sukker<small>Gir farge ved lavere varme</small></td><td class="g">${g(r.sugar)} g</td><td class="p">${pct(r.sugarPct)}</td></tr>` : '',
  ].join('');

  const iceNote = r.ice > 1
    ? (MIXERS[i.mixer].ice
      ? `<div class="note info">Bytt ut ca. <b>${g(r.ice)} g</b> av vannet med isbiter. Is veier det samme som vann og regnes med i vannmengden.</div>`
      : `<div class="note">Vannet burde egentlig vært kaldere enn kjøleskapskaldt. Isbiter er vanskelige å elte inn ${i.mixer === 'hand' ? 'for hånd' : 'med kjøkkenmaskin'}, så sett heller melet${state.settings.chilledFlour ? '' : ' (og gjerne eltebollen)'} i kjøleskapet et par timer først.${state.settings.chilledFlour ? '' : ' Slå på «Melet står i kjøleskapet» under Innstillinger.'}</div>`)
    : '';

  const flow = s.mode === 'rt'
    ? [['rt', s.rtBefore, 'Bulk, romtemp.'], ['rt', s.ballRt, 'Ball, romtemp.']]
    : [s.rtBefore ? ['rt', s.rtBefore, 'Bulk, romtemp.'] : null, ['ct', s.ct, 'Bulk, kjøleskap'], s.temper ? ['rt', s.temper, 'Romtemperere'] : null, ['rt', s.ballRt, s.temper ? 'Ball, romtemp.' : 'Ball rett fra kaldt']].filter(Boolean);

  $('#results').innerHTML = `
    <div class="card">
      <div class="recipe-head">
        <span class="tag num">${i.hydration} % hydrering</span>
        <span class="tag num">${i.hours} t heving</span>
        <span class="tag">${blend.label}</span>
        <span class="tag num">${i.totalDough ? `${i.totalGrams.toLocaleString('nb-NO')} g deig` : `${i.balls} × ${i.ballWeight} g`}</span>
      </div>
      ${notes.map((n) => `<div class="note">${esc(n)}</div>`).join('')}
      <table class="ing">
        <tr class="grp"><td colspan="3">Mel · valgt av appen</td></tr>
        ${flourRows}
        <tr class="sub"><td colspan="3">${esc(r.flourReason.text)}</td></tr>
        <tr class="grp"><td colspan="3">Væske og salt</td></tr>
        <tr><td class="name">Vann<small>${i.hydration} % hydrering</small></td><td class="g">${g(r.water)} g</td><td class="p">${pct(i.hydration, 0)}</td></tr>
        ${waterSub}
        <tr><td class="name">Fint salt</td><td class="g">${g(r.salt)} g</td><td class="p">${pct(3)}</td></tr>
        ${extras}
        <tr class="grp"><td colspan="3">Gjær · velg én</td></tr>
        <tr><td class="name">Idun fersk gjær</td><td class="g">${g2(r.yeast.fresh)} g</td><td class="p">${pct(r.yeast.freshPct, 3)}</td></tr>
        <tr class="or"><td class="name">Idun tørrgjær</td><td class="g">${g2(r.yeast.dry)} g</td><td class="p">${pct(r.yeast.dryPct, 3)}</td></tr>
        <tr class="or"><td class="name">Caputo Lievito<small>Brukes som tørrgjær</small></td><td class="g">${g2(r.yeast.lievito)} g</td><td class="p"></td></tr>
      </table>
      <p class="hint">Total deig ${g(r.totalDough)} g. Prosentene er bakerprosent, altså andel av melvekten.</p>
    </div>

    <div class="card">
      <h2 class="card-title">Temperatur</h2>
      <div class="temps">
        <div class="temp"><b>${Math.max(4, r.waterTemp.water)}°</b><span>Vann</span></div>
        <div class="temp"><b>${r.waterTemp.target - 1}–${r.waterTemp.target + 1}°</b><span>Ferdig deig</span></div>
        <div class="temp"><b>${state.settings.roomTemp}°</b><span>Rom</span></div>
      </div>
      ${r.waterTemp.water > 25 ? '<div class="note info">Kaldt rom: bruk lunkent vann, men aldri over 30 °C.</div>' : ''}
      ${iceNote}
      <p class="hint">Deigen bør aldri passere 28 °C. Da mister du kontrollen på gjæringen, og glutenet svekkes.</p>
    </div>

    <div class="card">
      <h2 class="card-title">Heving · ${fmtH(s.total)}</h2>
      <div class="flow">
        ${flow.map(([k, h, label]) => `<div class="seg-block ${k}" style="flex-grow:${Math.max(h, 1.5)}"><b>${fmtH(h)}</b>${label}</div>`).join('')}
      </div>
      <button type="button" class="btn" data-goto="plan">Lag tidsplan med klokkeslett</button>
    </div>

    <div class="card">
      <h2 class="card-title">Fremgangsmåte · ${MIXERS[i.mixer].label.toLowerCase()}</h2>
      <ol class="steps">${methodSteps(i, r).map((t) => `<li><span>${t}</span></li>`).join('')}</ol>
    </div>

    <div class="card">
      <h2 class="card-title">Steking · ${oven.label} på ${SURFACES[i.surface].label.toLowerCase()}</h2>
      <p style="margin:0"><b>Steketid ca. ${bakeTime(i)}.</b> ${esc(oven.note)}</p>
      <p class="hint">${esc(SURFACES[i.surface].note)}</p>
      ${!i.ovenAdjust && Number(i.oven) <= 350 ? '<div class="note">Du har slått av tilpasning til ovnen. Uten olje og sukker kan bunnen bli tørr og blek under 350 °C.</div>' : ''}
      ${Number(i.oven) <= 300 ? '<p class="hint">Med lang steketid tørker bunnen mer ut. 1–2 % høyere hydrering kan gi en saftigere kant.</p>' : ''}
    </div>

    <details class="card">
      <summary><h2 class="card-title">Tips</h2></summary>
      <ul>${TIPS.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    </details>

    <div class="btn-row">
      <button type="button" class="btn primary" id="logThis">Lagre i bakeloggen</button>
    </div>
  `;
  updateStickySum();
}

function bakeTime(i) {
  const base = OVENS[i.oven].bake;
  if (i.surface === 'none' && Number(i.oven) <= 350) return `${base}, gjerne litt lengre`;
  return base;
}

function methodSteps(i, r) {
  const yeastText = 'Smuldre den ferske gjæren eller strø tørrgjæren rett i melet.';
  const sugar = r.sugar > 0 ? ` Bland også inn ${g(r.sugar)} g sukker.` : '';
  const oil = r.oil > 0 ? ` Tilsett ${g(r.oil)} g olivenolje de siste par minuttene.` : '';
  const waterT = `${Math.max(4, r.waterTemp.water)} °C`;
  const gradual = r.gradual > 0.5;
  const withSalt = r.withSalt > 0.5;
  if (i.mixer === 'hand') {
    return [
      `Ha melet i en stor bolle. ${yeastText}${sugar}`,
      `Hell i <b>${g(r.firstWater)} g</b> vann (ca. ${waterT}) og rør til det ikke er tørt mel igjen.`,
      `Vend deigen ut på benken og elt i ca. 10 minutter.${gradual ? ` Jobb inn <b>${g(r.gradual)} g</b> vann litt etter litt. Våte hender gjør det lettere.` : ''}`,
      'La deigen hvile 10 minutter under bollen. Da slapper glutenet av, og resten av eltingen går lettere.',
      `Strø over <b>${g(r.salt)} g</b> salt${withSalt ? ` og jobb det inn sammen med de siste <b>${g(r.withSalt)} g</b> vann` : ''}. Elt videre 5–8 minutter til deigen er glatt og smidig.${oil}`,
      i.hydration > 66 ? 'Høy hydrering er tungt for hånd. Gjør 2–3 runder med «strekk og brett» med 15 minutters mellomrom i stedet for å elte lenger.' : `Sjekk temperaturen. Deigen bør ligge på ${r.waterTemp.target - 1}–${r.waterTemp.target + 1} °C.`,
      'Legg deigen på en lett oljet benk, dekk den løst med plast og la den hvile 20–30 minutter. Brett den så til en stram ball og legg den i en oljet boks med lokk.',
    ];
  }
  const kitchen = i.mixer === 'kitchen';
  return [
    `Ha melet i eltebollen. ${yeastText}${sugar}`,
    `Hell i <b>${g(r.firstWater)} g</b> vann (ca. ${waterT}) og start maskinen på lav hastighet.`,
    gradual ? `Når melet har tatt opp vannet og blitt en fast deig, tilsetter du <b>${g(r.gradual)} g</b> vann litt etter litt. La hver skvett trekke inn før neste.` : 'La maskinen elte til deigen henger godt sammen.',
    `Etter 15 minutter: tilsett <b>${g(r.salt)} g</b> salt${withSalt ? ` sammen med de siste <b>${g(r.withSalt)} g</b> vann` : ''}. Elt videre ca. 5 minutter.${oil}`,
    kitchen
      ? `Følg med på temperaturen. Kjøkkenmaskiner varmer deigen mye, og den bør ende på ${r.waterTemp.target - 1}–${r.waterTemp.target + 1} °C. Dra deigen av kroken hvis den klatrer opp.`
      : `Følg med på temperaturen. Deigen bør ende på ${r.waterTemp.target - 1}–${r.waterTemp.target + 1} °C etter ca. 20 minutter totalt.`,
    'Legg deigen på en lett oljet benk, dekk den løst med plast og la den hvile 20–30 minutter. Brett den så til en stram ball og legg den i en oljet boks med lokk.',
  ];
}

/* ---------- Sammendrag nederst på mobil ---------- */

let sumBtn;
function updateStickySum() {
  if (!sumBtn) {
    sumBtn = document.createElement('button');
    sumBtn.type = 'button';
    sumBtn.className = 'sticky-sum';
    sumBtn.addEventListener('click', () => $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' }));
    document.body.appendChild(sumBtn);
    const io = new IntersectionObserver(([e]) => { resultsVisible = e.isIntersecting; toggleSum(); }, { threshold: 0.01 });
    io.observe($('#results'));
  }
  const r = state.result;
  sumBtn.textContent = `Mel ${g(r.flour)} g · Vann ${g(r.water)} g · Se oppskrift ↓`;
  toggleSum();
}
let resultsVisible = false;
function toggleSum() {
  if (sumBtn) sumBtn.hidden = resultsVisible || currentTab !== 'deig';
}

/* ---------- Tidsplan ---------- */

function defaultBakeAt() {
  const total = state.result.schedule.total;
  const earliest = Date.now() + (total + 1.5) * 3600e3;
  const d = new Date(earliest);
  d.setHours(18, 0, 0, 0);
  if (d.getTime() < earliest) d.setDate(d.getDate() + 1);
  return d;
}

function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function renderPlan() {
  if (!state.result) return;
  const bakeAt = state.plan.bakeAt ? new Date(state.plan.bakeAt) : defaultBakeAt();
  const inputEl = $('#bakeAt');
  if (document.activeElement !== inputEl) inputEl.value = toLocalInput(bakeAt);
  const steps = timeline(state.eff, state.result, bakeAt);
  const now = Date.now();
  const start = steps.find((s) => s.title === 'Elt deigen').at;
  const dayFmt = new Intl.DateTimeFormat('nb-NO', { weekday: 'long', day: 'numeric', month: 'short' });
  const timeFmt = new Intl.DateTimeFormat('nb-NO', { hour: '2-digit', minute: '2-digit' });
  const wdFmt = new Intl.DateTimeFormat('nb-NO', { weekday: 'short', day: 'numeric' });
  $('#plan-summary').innerHTML = start.getTime() < now
    ? `<span class="note alert" style="display:block">Med ${state.eff.hours} timers heving måtte eltingen startet ${dayFmt.format(start)} kl. ${timeFmt.format(start)}. Velg et senere steketidspunkt eller en kortere hevetid.</span>`
    : `Start eltingen <b>${dayFmt.format(start)} kl. ${timeFmt.format(start)}</b>. Tidene følger hevetiden og fordelingen du har valgt under Deig.`;
  $('#timeline').innerHTML = steps.map((st) => `
    <li class="${st.at.getTime() < now ? 'past' : ''}">
      <div class="when"><b>${timeFmt.format(st.at)}</b><span>${wdFmt.format(st.at)}</span></div>
      <div class="dot"></div>
      <div class="body"><h3>${esc(st.title)}</h3><p>${esc(st.text)}</p></div>
    </li>`).join('');
}

/* ---------- Logg ---------- */

function recipeSnapshot() {
  const i = state.eff;
  const r = state.result;
  return {
    input: { ...state.input },
    settings: { ...state.settings },
    summary: {
      hours: i.hours, hydration: i.hydration, balls: i.balls, ballWeight: i.ballWeight,
      blend: BLENDS[r.blend.id].label,
      flours: r.flours.map((f) => `${FLOURS[f.key].short} ${g(f.grams)} g`).join(', '),
      water: g(r.water), salt: g(r.salt), oil: r.oil ? g(r.oil) : null, sugar: r.sugar ? g(r.sugar) : null,
      yeastFresh: g2(r.yeast.fresh), yeastDry: g2(r.yeast.dry),
      schedule: describeSchedule(r.schedule),
      oven: `${OVENS[i.oven].label}, ${SURFACES[i.surface].label.toLowerCase()}`,
      mixer: MIXERS[i.mixer].label,
      room: `${state.settings.roomTemp} °C / kjøleskap ${state.settings.fridgeTemp} °C`,
    },
  };
}

function describeSchedule(s) {
  if (s.mode === 'rt') return `${fmtH(s.rtBefore)} bulk + ${fmtH(s.ballRt)} ball i romtemp.`;
  return [s.rtBefore ? `${fmtH(s.rtBefore)} RT` : null, `${fmtH(s.ct)} kjøleskap`, s.temper ? '2 t romtemperering' : null, `${fmtH(s.ballRt)} ball RT`].filter(Boolean).join(' → ');
}

function recipePinHTML(sum) {
  const rows = [
    ['Heving', `${sum.hours} t · ${sum.schedule}`],
    ['Hydrering', `${sum.hydration} %`],
    ['Mengde', `${sum.balls} × ${sum.ballWeight} g`],
    ['Mel', `${sum.blend}: ${sum.flours}`],
    ['Vann / salt', `${sum.water} g / ${sum.salt} g`],
    ['Gjær', `${sum.yeastFresh} g fersk eller ${sum.yeastDry} g tørr`],
    sum.oil ? ['Olje', `${sum.oil} g`] : null,
    sum.sugar ? ['Sukker', `${sum.sugar} g`] : null,
    ['Ovn', sum.oven],
    ['Elting', sum.mixer],
    ['Temperatur', sum.room],
  ].filter(Boolean);
  return `<div class="recipe-pin"><b>Oppskriften som ble brukt</b><dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>`;
}

const objectUrls = [];
function blobUrl(b) {
  const u = URL.createObjectURL(b);
  objectUrls.push(u);
  return u;
}
function freeUrls() {
  while (objectUrls.length) URL.revokeObjectURL(objectUrls.pop());
}

async function renderLog() {
  freeUrls();
  let entries = [];
  try { entries = await logStore.all(); } catch { /* IndexedDB utilgjengelig */ }
  const list = $('#logList');
  if (!entries.length) {
    list.innerHTML = '<div class="empty"><b>Ingen bakeforsøk ennå</b>Trykk «Nytt bakeforsøk» etter neste pizzakveld. Oppskriften du har valgt under Deig, festes automatisk.</div>';
    return;
  }
  list.innerHTML = `<div class="log-list">${entries.map((e) => `
    <button type="button" class="log-item" data-open="${e.id}">
      ${e.photos?.length ? `<img class="log-thumb" src="${blobUrl(e.photos[0])}" alt="">` : '<div class="log-thumb">Ingen bilde</div>'}
      <div>
        <h3>${esc(formatDate(e.date))} <span class="stars">${stars(e.rating)}</span></h3>
        <p>${e.recipe.summary.hours} t · ${e.recipe.summary.hydration} % · ${esc(e.recipe.summary.blend)}</p>
        ${e.notes ? `<p>${esc(e.notes.slice(0, 90))}${e.notes.length > 90 ? '…' : ''}</p>` : ''}
      </div>
    </button>`).join('')}</div>`;
}

const stars = (n) => '★'.repeat(n || 0) + '☆'.repeat(5 - (n || 0));
const formatDate = (iso) => new Intl.DateTimeFormat('nb-NO', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso + 'T12:00'));
const todayISO = () => toLocalInput(new Date()).slice(0, 10);

let draft = null;

function openEditor(entry) {
  draft = entry
    ? { ...entry, photos: [...(entry.photos || [])] }
    : { id: crypto.randomUUID?.() || String(Date.now()), date: todayISO(), rating: 0, notes: '', photos: [], recipe: recipeSnapshot() };
  renderEditor();
  $('#logDialog').showModal();
}

function renderEditor() {
  const d = draft;
  $('#logDialog').innerHTML = `
    <form class="sheet-inner" id="logForm" method="dialog">
      <div class="sheet-head">
        <h2>${d.createdAt ? 'Rediger bakeforsøk' : 'Nytt bakeforsøk'}</h2>
        <button type="button" class="icon-btn" data-close aria-label="Lukk">×</button>
      </div>
      <label class="row"><span class="row-label">Dato</span><input type="date" class="text-input" style="max-width:60%" id="logDate" value="${d.date}"></label>
      <div class="row"><span class="row-label">Hvordan ble det?</span>
        <div class="rating" id="logRating">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" class="${n <= d.rating ? 'on' : ''}" aria-label="${n} av 5">★</button>`).join('')}</div>
      </div>
      <label for="logNotes" class="field-label" style="margin:0">Notater</label>
      <textarea id="logNotes" rows="4" placeholder="Hevet den nok? Hvordan var kanten, bunnen og smaken? Hva gjør du annerledes neste gang?">${esc(d.notes)}</textarea>
      <div class="photos" id="logPhotos">${d.photos.map((p, idx) => `<figure><img src="${blobUrl(p)}" alt="Bilde ${idx + 1}"><button type="button" data-rm-photo="${idx}" aria-label="Fjern bilde">×</button></figure>`).join('')}</div>
      <label class="btn">Legg til bilder<input type="file" id="logPhotoInput" accept="image/*" multiple hidden></label>
      ${recipePinHTML(d.recipe.summary)}
      <div class="btn-row"><button type="submit" class="btn primary">Lagre</button></div>
    </form>`;
}

async function openDetail(id) {
  const e = await logStore.get(id);
  if (!e) return;
  $('#logDialog').innerHTML = `
    <div class="sheet-inner">
      <div class="sheet-head">
        <h2>${esc(formatDate(e.date))}</h2>
        <button type="button" class="icon-btn" data-close aria-label="Lukk">×</button>
      </div>
      <div class="stars" style="font-size:24px">${stars(e.rating)}</div>
      ${e.notes ? `<p style="margin:0;white-space:pre-wrap">${esc(e.notes)}</p>` : ''}
      ${(e.photos || []).map((p) => `<img class="photo-full" src="${blobUrl(p)}" alt="">`).join('')}
      ${recipePinHTML(e.recipe.summary)}
      <div class="btn-row">
        <button type="button" class="btn primary" data-use="${e.id}">Bruk denne oppskriften</button>
        <button type="button" class="btn" data-edit="${e.id}">Rediger</button>
      </div>
      <div class="confirm" id="delZone"><button type="button" class="btn danger" data-del="${e.id}">Slett</button></div>
    </div>`;
  $('#logDialog').showModal();
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 2200);
}

/* ---------- Faner ---------- */

let currentTab = 'deig';
function showTab(tab) {
  currentTab = tab;
  $$('.view').forEach((v) => { v.hidden = v.dataset.view !== tab; });
  $$('.tabbar button').forEach((b) => {
    if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  if (tab === 'logg') renderLog();
  if (tab === 'plan') renderPlan();
  toggleSum();
  window.scrollTo({ top: 0 });
}

/* ---------- Hendelser ---------- */

document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('button, [data-goto]');
  if (!t) return;

  if (t.dataset.tab) return showTab(t.dataset.tab);
  if (t.dataset.goto) return showTab(t.dataset.goto);

  const seg = t.closest('.seg');
  if (seg && t.dataset.value !== undefined) {
    state.input[seg.id] = t.dataset.value;
    return update();
  }
  if (t.dataset.h) {
    state.input.hours = Number(t.dataset.h);
    state.input.mode = defaultMode(state.input.hours);
    return update();
  }
  const stepper = t.closest('.stepper');
  if (stepper && t.dataset.dir) {
    const key = stepper.dataset.field || stepper.dataset.setting;
    const obj = stepper.dataset.field ? state.input : state.settings;
    const step = Number(stepper.dataset.step);
    obj[key] = Math.min(Number(stepper.dataset.max), Math.max(Number(stepper.dataset.min), obj[key] + step * Number(t.dataset.dir)));
    return update();
  }

  if (t.id === 'logThis') { showTab('logg'); return openEditor(null); }
  if (t.id === 'newLog') return openEditor(null);
  if (t.dataset.open) return openDetail(t.dataset.open);
  if (t.dataset.close !== undefined) return $('#logDialog').close();
  if (t.dataset.star) {
    draft.rating = Number(t.dataset.star);
    $$('#logRating button').forEach((b) => b.classList.toggle('on', Number(b.dataset.star) <= draft.rating));
    return;
  }
  if (t.dataset.rmPhoto !== undefined) {
    syncDraftFields();
    draft.photos.splice(Number(t.dataset.rmPhoto), 1);
    return renderEditor();
  }
  if (t.dataset.edit) {
    const e = await logStore.get(t.dataset.edit);
    return openEditor(e);
  }
  if (t.dataset.use) {
    const e = await logStore.get(t.dataset.use);
    state.input = { ...DEFAULT_INPUT, ...e.recipe.input };
    $('#logDialog').close();
    update();
    showTab('deig');
    return toast('Oppskriften er lastet inn');
  }
  if (t.dataset.del) {
    $('#delZone').innerHTML = `<span>Slette dette bakeforsøket for godt?</span><button type="button" class="btn danger" data-del-yes="${t.dataset.del}">Ja, slett</button><button type="button" class="btn" data-close>Avbryt</button>`;
    return;
  }
  if (t.dataset.delYes) {
    await logStore.remove(t.dataset.delYes);
    $('#logDialog').close();
    renderLog();
    return toast('Slettet');
  }
  if (t.id === 'exportBtn') return exportLog();
});

function syncDraftFields() {
  if (!draft) return;
  draft.date = $('#logDate')?.value || draft.date;
  draft.notes = $('#logNotes')?.value ?? draft.notes;
}

document.addEventListener('submit', async (ev) => {
  if (ev.target.id !== 'logForm') return;
  ev.preventDefault();
  syncDraftFields();
  const entry = { ...draft, createdAt: draft.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  try {
    await logStore.put(entry);
    $('#logDialog').close();
    renderLog();
    toast('Lagret i bakeloggen');
  } catch {
    toast('Kunne ikke lagre. Er lagring blokkert i nettleseren?');
  }
});

document.addEventListener('input', (ev) => {
  const el = ev.target;
  if (el.id === 'hours') {
    state.input.hours = Number(el.value);
    state.input.mode = defaultMode(state.input.hours);
    return update();
  }
  if (el.id === 'hydration') {
    state.input.hydration = Number(el.value);
    return update();
  }
  if (el.id === 'bakeAt') {
    if (el.value) {
      state.plan.bakeAt = new Date(el.value).toISOString();
      saveJSON('pd.plan', state.plan);
      renderPlan();
    }
  }
});

document.addEventListener('change', async (ev) => {
  const el = ev.target;
  const inputKeys = ['style', 'temper', 'mixer'];
  const boolKeys = ['wholegrain', 'criscito', 'ovenAdjust'];
  if (inputKeys.includes(el.id)) { state.input[el.id] = el.value; return update(); }
  if (boolKeys.includes(el.id)) {
    state.input[el.id] = el.checked;
    if (el.id === 'wholegrain' && !el.checked) state.input.criscito = false;
    return update();
  }
  if (el.id === 'chilledFlour' || el.id === 'lossMargin') { state.settings[el.id] = el.checked; return update(); }
  if (el.id === 'logPhotoInput') {
    syncDraftFields();
    for (const f of el.files) {
      try { draft.photos.push(await shrinkImage(f)); } catch { toast('Ett av bildene kunne ikke leses'); }
    }
    return renderEditor();
  }
  if (el.id === 'importFile' && el.files[0]) return importLog(el.files[0]);
});

$('#logDialog').addEventListener('close', () => { draft = null; });

/* ---------- Sikkerhetskopi ---------- */

async function exportLog() {
  const entries = await logStore.all();
  const out = [];
  for (const e of entries) out.push({ ...e, photos: await Promise.all((e.photos || []).map(blobToDataURL)) });
  const json = JSON.stringify({ app: 'pizzadeig', version: 1, exportedAt: new Date().toISOString(), entries: out });
  const name = `pizzadeig-logg-${todayISO()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Pizzadeig-logg' }); return; } catch { /* avbrutt */ }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  $('#backupStatus').textContent = `Eksporterte ${entries.length} bakeforsøk.`;
}

async function importLog(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'pizzadeig' || !Array.isArray(data.entries)) throw new Error();
    for (const e of data.entries) {
      e.photos = await Promise.all((e.photos || []).map(dataURLToBlob));
      await logStore.put(e);
    }
    $('#backupStatus').textContent = `Importerte ${data.entries.length} bakeforsøk.`;
    renderLog();
  } catch {
    $('#backupStatus').textContent = 'Filen kunne ikke leses. Velg en fil som er eksportert fra Pizzadeig.';
  }
}

/* ---------- Oppstart ---------- */

update();
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
})();
