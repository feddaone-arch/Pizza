import { BLENDS, FLOURS, OVENS, SURFACES, MIXERS, STYLES, TIPS } from './data.js';
import { calculate, timeline, fmtH, defaultMode } from './calc.js';
import { loadJSON, saveJSON, logStore, shrinkImage, blobToDataURL, dataURLToBlob } from './store.js';

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
