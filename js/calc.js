import { BOOK, YEAST, DRY_RATIO, FLOURS, BLENDS, blendForHours, OVENS, MIXERS } from './data.js';

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

export const MODE_LIMITS = { rt: [3, 18], ct: [14, 72] };

export function defaultMode(hours) {
  return hours >= 16 ? 'ct' : 'rt';
}

// Bygger hevefordelingen. Alle tider i timer.
export function buildSchedule(input) {
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

export function yeastPct(input, schedule, settings) {
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
export function shortFlourFor(hours, hydration) {
  if (hours <= 6) return 'doppio';
  return hydration > 62 ? 'pizzeria' : 'doppio';
}

export function chooseBlend(input) {
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

export function flourParts(blendId, input) {
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

export function waterTemperature(input, settings) {
  const room = settings.roomTemp;
  const target = room >= 23 ? 21 : room <= 19 ? 23 : 22;
  const flourTemp = settings.chilledFlour ? 8 : room;
  const friction = MIXERS[input.mixer].friction;
  const water = 3 * target - flourTemp - room - friction;
  return { target, water: Math.round(water), friction };
}

export function calculate(input, settings) {
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
export function timeline(input, result, bakeAt) {
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

export function fmtH(h) {
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  if (!whole) return `${min} min`;
  return min ? `${whole} t ${min} min` : `${whole} t`;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
