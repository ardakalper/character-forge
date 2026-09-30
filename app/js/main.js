// Character Forge UI. One coarse render per tab; all rules maths lives in rules.js.
import * as R from './rules.js';
import { renderSheet } from './sheet.js';
import { t, setLang, applyI18n, detectLang, getLang } from './i18n.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const TABS = ['abilities', 'race', 'class', 'background', 'spells', 'gear', 'sheet'];

let data = null;
const ui = Object.assign({ theme: 'parchment', lang: null, tab: 'abilities' }, load('cf:ui'));
const store = Object.assign({ chars: [], current: 0 }, load('cf:save'));
if (!store.chars.length) store.chars = [R.newCharacter()];
const ch = () => store.chars[store.current];

function load(k) { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch { return {}; } }
function save() { try { localStorage.setItem('cf:save', JSON.stringify(store)); localStorage.setItem('cf:ui', JSON.stringify(ui)); } catch { /* private mode */ } }
let toastTimer;
function toast(msg) { const n = $('#toast'); n.textContent = msg; n.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { n.hidden = true; }, 2400); }

// migrate any missing fields on old saves
function upgrade(c) { const fresh = R.newCharacter(); return { ...fresh, ...c, base: { ...fresh.base, ...c.base }, choices: { ...fresh.choices, ...(c.choices ?? {}) } }; }
store.chars = store.chars.map(upgrade);

// ---------- shared widgets ----------
function pillGroup({ items, picked, max, onToggle, label }) {
  // items: [{id, name, extra?, locked?}]
  const wrap = el('div');
  if (label) wrap.append(el('h3', null, label));
  const box = el('div', 'pills');
  for (const it of items) {
    const b = el('button', 'pill');
    b.type = 'button'; b.dataset.id = it.id;
    b.append(el('span', null, it.name));
    if (it.extra) b.append(el('span', 'b', it.extra));
    const on = picked.includes(it.id) || it.locked;
    b.setAttribute('aria-pressed', String(on));
    if (it.locked) b.disabled = true;
    else if (!on && picked.length >= max) b.disabled = true;
    b.addEventListener('click', () => { onToggle(it.id); saveRender(); });
    box.append(b);
  }
  wrap.append(box);
  return wrap;
}
const togglePick = (arr, id, max) => { const i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1); else if (arr.length < max) arr.push(id); };
function optCards(items, pickedId, onPick) {
  const box = el('div', 'opts');
  for (const it of items) {
    const b = el('button', 'opt-card'); b.type = 'button'; b.dataset.id = it.id;
    b.setAttribute('aria-pressed', String(it.id === pickedId));
    b.append(el('span', 't', it.name));
    if (it.sub) b.append(el('span', 's', it.sub));
    b.addEventListener('click', () => { onPick(it.id); saveRender(); });
    box.append(b);
  }
  return box;
}
function featureRows(list) {
  const box = el('div');
  for (const f of list) {
    const d = el('details', 'row');
    const s = el('summary');
    if (f.level != null) s.append(el('span', 'lv', String(f.level)));
    s.append(el('span', 'nm', f.name));
    if (f.meta) s.append(el('span', 'meta', f.meta));
    d.append(s, el('div', 'desc', f.desc || '—'));
    box.append(d);
  }
  return box;
}

// ---------- tabs ----------
const tabs = {
  abilities() {
    const c = ch(); const root = el('div');
    root.append(el('h2', null, t('ab.title')));
    // level + hp method
    const lr = el('div', 'lvl-row');
    const lab = el('span', 'field', t('ab.level'));
    const range = Object.assign(el('input'), { type: 'range', min: 1, max: 20, value: c.level });
    const v = el('span', 'v', String(c.level));
    range.addEventListener('input', () => { c.level = Number(range.value); v.textContent = range.value; saveRender(); });
    lr.append(lab, range, v);
    root.append(lr);
    const g = el('div', 'grid2');
    const mf = el('label', 'field'); mf.append(el('span', null, t('ab.method')));
    const ms = el('select');
    for (const [val, key] of [['array', 'ab.array'], ['points', 'ab.points'], ['manual', 'ab.manual']]) ms.append(Object.assign(el('option', null, t(key)), { value: val }));
    ms.value = c.method;
    ms.addEventListener('change', () => { c.method = ms.value; if (c.method === 'array') c.base = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }; if (c.method === 'points') for (const a of R.ABILITIES) c.base[a] = Math.min(15, Math.max(8, c.base[a])); saveRender(); });
    mf.append(ms); g.append(mf);
    const hf = el('label', 'field'); hf.append(el('span', null, t('ab.hp')));
    const hs = el('select');
    for (const [val, key] of [['average', 'ab.hp.average'], ['max', 'ab.hp.max']]) hs.append(Object.assign(el('option', null, t(key)), { value: val }));
    hs.value = c.hpMethod; hs.addEventListener('change', () => { c.hpMethod = hs.value; saveRender(); });
    hf.append(hs); g.append(hf);
    root.append(g);
    if (c.method === 'points') {
      const left = R.POINT_BUDGET - R.pointCost(c.base);
      root.append(Object.assign(el('p', 'note', t('ab.points.left', { n: left })), { id: 'points-left' }));
    }
    // ability grid
    const racial = R.racialBonus(data, c), asi = R.asiBonus(data, c), fin = R.abilities(data, c);
    const grid = el('div', 'ab-grid');
    for (const a of R.ABILITIES) {
      const cell = el('div', 'ab-cell'); cell.dataset.ab = a;
      cell.append(el('div', 'nm', a.toUpperCase()));
      cell.append(el('div', 'mod', R.fmt(R.mod(fin[a]))));
      if (c.method === 'array') {
        const sel = el('select');
        for (const n of R.STANDARD_ARRAY) sel.append(Object.assign(el('option', null, String(n)), { value: n }));
        sel.value = c.base[a];
        sel.addEventListener('change', () => {
          const n = Number(sel.value);
          const other = R.ABILITIES.find((x) => x !== a && c.base[x] === n);
          if (other) c.base[other] = c.base[a]; // swap so the array stays intact
          c.base[a] = n; saveRender();
        });
        cell.append(sel);
      } else if (c.method === 'points') {
        const steps = el('div', 'steps');
        const minus = el('button', null, '−'), score = el('span', 'fin', String(c.base[a])), plus = el('button', null, '+');
        minus.type = plus.type = 'button';
        minus.disabled = c.base[a] <= 8;
        plus.disabled = c.base[a] >= 15 || R.POINT_BUDGET - R.pointCost(c.base) < (R.POINT_COSTS[c.base[a] + 1] - R.POINT_COSTS[c.base[a]]);
        minus.addEventListener('click', () => { c.base[a] -= 1; saveRender(); });
        plus.addEventListener('click', () => { c.base[a] += 1; saveRender(); });
        steps.append(minus, score, plus);
        cell.append(steps);
      } else {
        const inp = Object.assign(el('input'), { type: 'number', min: 3, max: 18, value: c.base[a] });
        inp.addEventListener('change', () => { c.base[a] = Math.max(3, Math.min(18, Number(inp.value) || 10)); saveRender(); });
        cell.append(inp);
      }
      cell.append(el('div', 'fin', `${t('ab.final')} ${fin[a]}  (${c.base[a]}${racial[a] ? ` ${R.fmt(racial[a])} ${t('ab.racial')}` : ''}${asi[a] ? ` ${R.fmt(asi[a])} ${t('ab.asi')}` : ''})`));
      grid.append(cell);
    }
    root.append(grid);
    return root;
  },

  race() {
    const c = ch(); const root = el('div');
    root.append(el('h2', null, t('race.title')));
    root.append(optCards(data.races.map((r) => ({ id: r.id, name: r.name, sub: Object.entries(r.bonuses).map(([a, b]) => `${a.toUpperCase()} ${R.fmt(b)}`).join(' ') })), c.race, (id) => {
      c.race = id; c.subrace = null; c.choices.raceSkills = []; c.choices.languages = []; c.choices.traitLang = [];
    }));
    const r = R.race(data, c);
    if (!r) return root;
    if (r.subraces.length) {
      root.append(el('h3', null, t('race.subrace')));
      root.append(optCards(r.subraces.map((s) => ({ id: s.id, name: s.name, sub: Object.entries(s.bonuses).map(([a, b]) => `${a.toUpperCase()} ${R.fmt(b)}`).join(' ') })), c.subrace, (id) => { c.subrace = id; }));
    }
    const sub = r.subraces.find((s) => s.id === c.subrace);
    const info = el('p', 'note', `${t('race.speed')}: ${r.speed} ft · ${t('race.size')}: ${r.size} · ${t('race.langs')}: ${r.languages.join(', ')}`);
    root.append(info);
    // racial skill choice (e.g. half-elf)
    const rc = r.skillChoice ?? r.traits.map((x) => x.skillChoice).find(Boolean);
    if (rc) root.append(pillGroup({
      label: t('race.pick.skills', { n: rc.n }),
      items: data.core.skills.filter((s) => !rc.from || rc.from.includes(s.id)).map((s) => ({ id: s.id, name: s.name })),
      picked: c.choices.raceSkills, max: rc.n,
      onToggle: (id) => togglePick(c.choices.raceSkills, id, rc.n),
    }));
    // language choices from race + subrace + background
    const nLang = R.languageChoices(data, c);
    if (nLang) root.append(pillGroup({
      label: t('race.pick.langs', { n: nLang }),
      items: data.core.languages.filter((l) => !r.languages.includes(l)).map((l) => ({ id: l, name: l })),
      picked: c.choices.languages, max: nLang,
      onToggle: (id) => togglePick(c.choices.languages, id, nLang),
    }));
    root.append(el('h3', null, t('race.traits')));
    root.append(featureRows([...r.traits, ...(sub?.traits ?? [])].map((x) => ({ name: x.name, desc: x.desc }))));
    return root;
  },

  class() {
    const c = ch(); const root = el('div');
    root.append(el('h2', null, t('class.title')));
    root.append(optCards(data.classes.map((k) => ({ id: k.id, name: k.name, sub: `d${k.hitDie} · ${k.saves.map((s) => s.toUpperCase()).join('/')}` })), c.klass, (id) => {
      c.klass = id; c.choices.skills = []; c.choices.expertise = []; c.choices.equipment = {}; c.choices.cantrips = []; c.choices.spells = []; c.choices.asi = {};
    }));
    const k = R.klass(data, c);
    if (!k) return root;
    root.append(el('p', 'note', `${t('class.hitdie')}: d${k.hitDie} · ${t('class.saves')}: ${k.saves.map((s) => R.ABILITY_NAMES[s]).join(', ')} · ${k.subclass.flavor}: ${k.subclass.name}`));
    // skills
    root.append(pillGroup({
      label: t('class.skills', { n: k.skillChoice.n }),
      items: data.core.skills.filter((s) => !k.skillChoice.from || k.skillChoice.from.includes(s.id)).map((s) => ({ id: s.id, name: s.name })),
      picked: c.choices.skills, max: k.skillChoice.n,
      onToggle: (id) => togglePick(c.choices.skills, id, k.skillChoice.n),
    }));
    // expertise
    const exp = R.expertiseSlots(data, c);
    if (exp) {
      const have = Object.keys(R.skillSources(data, c));
      root.append(pillGroup({
        label: t('class.expertise', { n: exp }),
        items: data.core.skills.filter((s) => have.includes(s.id)).map((s) => ({ id: s.id, name: s.name })),
        picked: c.choices.expertise, max: exp,
        onToggle: (id) => togglePick(c.choices.expertise, id, exp),
      }));
    }
    // ASI
    const lvls = R.asiLevels(data, c);
    if (lvls.length) {
      root.append(el('h3', null, t('class.asi.title')));
      root.append(el('p', 'note', t('class.asi.hint')));
      for (const lv of lvls) {
        const row = el('div');
        row.append(el('h3', null, t('class.asi.at', { n: lv })));
        const pick = c.choices.asi[lv] ?? {};
        const pills = el('div', 'pills');
        for (const a of R.ABILITIES) {
          const n = pick[a] ?? 0;
          const b = el('button', 'pill'); b.type = 'button'; b.dataset.asi = `${lv}:${a}`;
          b.append(el('span', null, `${a.toUpperCase()} ${n ? R.fmt(n) : ''}`));
          const total = Object.entries(pick).filter(([x]) => x !== 'feat').reduce((s2, [, v]) => s2 + v, 0);
          b.setAttribute('aria-pressed', String(n > 0));
          b.addEventListener('click', () => {
            const cur = { ...(c.choices.asi[lv] ?? {}) }; delete cur.feat;
            cur[a] = ((cur[a] ?? 0) + 1) % 3; // 0 → 1 → 2 → 0
            if (cur[a] === 0) delete cur[a];
            let tot = Object.values(cur).reduce((x, y) => x + y, 0);
            if (tot > 2) { for (const other of Object.keys(cur)) if (other !== a) delete cur[other]; }
            c.choices.asi[lv] = cur; saveRender();
          });
          if (total >= 2 && !n) b.disabled = true;
          pills.append(b);
        }
        const featBtn = el('button', 'pill'); featBtn.type = 'button'; featBtn.dataset.asi = `${lv}:feat`;
        featBtn.append(el('span', null, t('class.asi.feat')));
        featBtn.setAttribute('aria-pressed', String(Boolean(pick.feat)));
        featBtn.addEventListener('click', () => { c.choices.asi[lv] = pick.feat ? {} : { feat: 'grappler' }; saveRender(); });
        pills.append(featBtn);
        row.append(pills);
        root.append(row);
      }
    }
    // features by level
    root.append(el('h3', null, t('class.features')));
    root.append(featureRows(R.features(data, c).map((f) => ({ level: f.level, name: f.name, desc: f.desc }))));
    return root;
  },

  background() {
    const c = ch(); const root = el('div');
    root.append(el('h2', null, t('bg.title')));
    root.append(optCards(data.backgrounds.map((b) => ({ id: b.id, name: b.name })), c.background, (id) => { c.background = id; }));
    const b = R.background(data, c);
    if (!b) return root;
    root.append(el('p', 'note', `${t('bg.skills')}: ${b.skills.map((s) => data.core.skills.find((x) => x.id === s)?.name).join(', ')} · ${t('bg.equipment')}: ${b.equipment.map((e) => e.replace(/^1× /, '')).join(', ')}`));
    root.append(featureRows([{ name: b.feature.name, desc: b.feature.desc }]));
    // identity fields
    const g = el('div', 'grid3');
    const mk = (key, prop, ph) => {
      const f = el('label', 'field'); f.append(el('span', null, t(key)));
      const inp = Object.assign(el('input'), { type: 'text', value: c[prop] ?? '' });
      if (ph) inp.placeholder = ph;
      inp.addEventListener('input', () => { c[prop] = inp.value; save(); renderSummaryOnly(); });
      f.append(inp); return f;
    };
    g.append(mk('sheet.name', 'name'), mk('sheet.player', 'playerName'));
    const af = el('label', 'field'); af.append(el('span', null, t('sheet.alignment')));
    const asel = el('select'); asel.append(Object.assign(el('option', null, '—'), { value: '' }));
    for (const a of data.core.alignments) asel.append(Object.assign(el('option', null, a.name), { value: a.id }));
    asel.value = c.alignment; asel.addEventListener('change', () => { c.alignment = asel.value; saveRender(); });
    af.append(asel); g.append(af);
    root.append(g);
    const notes = el('label', 'field'); notes.append(el('span', null, t('sheet.appearance')));
    const ta = Object.assign(el('textarea'), { rows: 3, value: c.appearance ?? '' });
    ta.addEventListener('input', () => { c.appearance = ta.value; save(); });
    notes.append(ta); root.append(notes);
    const n2 = el('label', 'field'); n2.append(el('span', null, t('sheet.notes')));
    const ta2 = Object.assign(el('textarea'), { rows: 3, value: c.notes ?? '' });
    ta2.addEventListener('input', () => { c.notes = ta2.value; save(); });
    n2.append(ta2); root.append(n2);
    return root;
  },

  spells() {
    const c = ch(); const root = el('div');
    root.append(el('h2', null, t('sp.title')));
    const si = R.spellInfo(data, c);
    if (!si) { root.append(el('p', 'note', t('sp.none'))); return root; }
    const head = el('div', 'spell-head');
    for (const [v, k] of [[String(si.dc), t('sp.dc')], [R.fmt(si.attack), t('sp.atk')], [si.slots.map((n, i) => (n ? `L${i + 1}×${n}` : null)).filter(Boolean).join(' ') || '—', t('sp.slots')]]) {
      const s = el('div', 'stat'); s.append(el('span', 'v', v), el('span', 'k', k)); head.append(s);
    }
    root.append(head);
    const search = Object.assign(el('input'), { type: 'text', id: 'sp-search' });
    search.placeholder = t('sp.search');
    const sf = el('label', 'field'); sf.append(search); root.append(sf);
    let query = '';
    search.addEventListener('input', () => { query = search.value.toLowerCase(); renderLists(); });
    const listBox = el('div'); root.append(listBox);
    const c2 = c;
    function spellPill(s, picked, max, arr) {
      return { id: s.id, name: s.name, extra: [s.conc ? 'C' : '', s.ritual ? 'R' : ''].join('') || undefined };
    }
    function renderLists() {
      listBox.replaceChildren();
      // cantrips
      const cans = R.spellList(data, c2, 0).filter((s) => s.name.toLowerCase().includes(query));
      listBox.append(pillGroup({
        label: t('sp.cantrips', { n: si.cantrips }),
        items: cans.map((s) => spellPill(s)), picked: c2.choices.cantrips, max: si.cantrips,
        onToggle: (id) => togglePick(c2.choices.cantrips, id, si.cantrips),
      }));
      const want = si.known ?? si.prepared ?? 0;
      const how = si.known != null ? t('sp.known', { n: want }) : t('sp.prepared', { n: want, how: `${si.ability.toUpperCase()} ${R.fmt(si.mod)} + ${si.prepared === si.mod + Math.floor(c2.level / 2) ? '½ ' : ''}${t('ab.level').toLowerCase()}` });
      listBox.append(el('h3', null, how));
      for (let lv = 1; lv <= si.maxSlotLevel; lv++) {
        const list = R.spellList(data, c2, lv).filter((s) => s.name.toLowerCase().includes(query));
        if (!list.length) continue;
        listBox.append(pillGroup({
          label: t('sp.level', { n: lv }),
          items: list.map((s) => spellPill(s)), picked: c2.choices.spells, max: want,
          onToggle: (id) => togglePick(c2.choices.spells, id, want),
        }));
      }
      // details of picked spells
      const chosen = [...c2.choices.cantrips, ...c2.choices.spells].map((id) => data.spells.find((s) => s.id === id)).filter(Boolean);
      if (chosen.length) listBox.append(featureRows(chosen.map((s) => ({ level: s.level, name: s.name, meta: `${s.school} · ${s.time} · ${s.range}${s.conc ? ` · ${t('sp.conc')}` : ''}${s.ritual ? ` · ${t('sp.ritual')}` : ''}`, desc: `${s.comps} · ${s.duration}\n${s.desc}` }))));
    }
    renderLists();
    return root;
  },

  gear() {
    const c = ch(); const root = el('div');
    root.append(el('h2', null, t('gear.title')));
    const k = R.klass(data, c);
    if (!k) { root.append(el('p', 'note', '—')); return root; }
    const b = R.background(data, c);
    root.append(el('p', 'note', `${t('gear.fixed')}: ${[...k.equipment, ...(b?.equipment ?? [])].map((e) => e.replace(/^1× /, '')).join(', ') || '—'}`));
    k.equipmentChoices.forEach((ecin, i) => {
      const box = el('div');
      box.append(el('h3', null, `${t('gear.pick')}: ${ecin.desc}`));
      const pills = el('div', 'pills');
      const renderCat = (catId, key) => {
        const sel = el('select');
        sel.dataset.eq = key;
        sel.append(Object.assign(el('option', null, '—'), { value: '' }));
        for (const id of data.equipment.cats[catId] ?? []) sel.append(Object.assign(el('option', null, data.equipment.names[id] ?? id), { value: id }));
        sel.value = c.choices.equipment[key] ?? '';
        sel.addEventListener('change', () => { c.choices.equipment[key] = sel.value || undefined; saveRender(); });
        const f = el('label', 'field'); f.append(sel); return f;
      };
      if (ecin.cat) { box.append(renderCat(ecin.cat.id, `${i}:cat`)); root.append(box); return; }
      ecin.options.forEach((o, j) => {
        const bnt = el('button', 'pill'); bnt.type = 'button'; bnt.dataset.eq = `${i}:${j}`;
        const label = o.all ? o.all.map((x) => (x.cat ? x.name : `${x.n > 1 ? `${x.n}× ` : ''}${x.name}`)).join(' + ') : o.cat ? o.name : `${o.n > 1 ? `${o.n}× ` : ''}${o.name}`;
        bnt.append(el('span', null, label));
        bnt.setAttribute('aria-pressed', String(c.choices.equipment[i] === j));
        bnt.addEventListener('click', () => { c.choices.equipment[i] = j; delete c.choices.equipment[`${i}:cat`]; saveRender(); });
        pills.append(bnt);
      });
      box.append(pills);
      const picked = ecin.options[c.choices.equipment[i]];
      const catOpt = picked?.cat ? picked : picked?.all?.find((x) => x.cat);
      if (catOpt) box.append(renderCat(catOpt.cat, `${i}:cat`));
      root.append(box);
    });
    // resulting inventory + combat numbers
    const ac = R.armorClass(data, c);
    root.append(el('h3', null, `${t('gear.ac')}: ${ac.ac} (${ac.how})`));
    const atts = R.attacks(data, c);
    if (atts.length) {
      root.append(el('h3', null, t('gear.attacks')));
      root.append(featureRows(atts.map((a) => ({ name: `${a.name} ${R.fmt(a.bonus)}`, meta: a.range, desc: `${a.dmg}${a.props ? `\n${a.props}` : ''}` }))));
    }
    root.append(el('h3', null, t('gear.list')));
    root.append(el('p', 'note', R.equippedItems(data, c).map((x) => (x.n > 1 ? `${x.name} ×${x.n}` : x.name)).join(', ') || '—'));
    const packs = R.equippedItems(data, c).map((x) => data.equipment.packs.find((p) => p.name === x.name)).filter(Boolean);
    for (const p of packs) root.append(el('p', 'note', `${p.name} ${t('gear.pack.contents')}: ${p.contents.join(', ')}`));
    return root;
  },

  sheet() {
    const c = ch(); const root = el('div');
    const bar = el('div', 'grid2'); bar.id = 'sheet-actions';
    const printBtn = el('button', 'tb primary', t('sheet.print')); printBtn.id = 'btn-print';
    printBtn.addEventListener('click', () => window.print());
    bar.append(printBtn);
    root.append(bar, renderSheet(data, c));
    return root;
  },
};

// ---------- chrome ----------
function renderTabs() {
  const pend = R.pending(data, ch());
  const flag = { abilities: ['points'], race: ['race', 'subrace', 'raceSkills', 'languages'], class: ['class', 'skills', 'expertise', 'asi'], spells: ['cantrips', 'spells'], gear: ['equipment'], background: [], sheet: [] };
  $('#tabs').replaceChildren(...TABS.map((id) => {
    const b = el('button', null, t(`nav.${id}`));
    b.dataset.tab = id;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(ui.tab === id));
    if (flag[id].some((x) => pend.includes(x))) b.append(el('span', 'dot'));
    b.addEventListener('click', () => { ui.tab = id; saveRender(); });
    return b;
  }));
}
function renderSummaryOnly() {
  const c = ch();
  const s = $('#summary'); s.replaceChildren();
  const k = R.klass(data, c), r = R.race(data, c);
  s.append(el('div', 'nm', c.name || t('chars.unnamed')));
  s.append(el('div', 'sub', [r?.name, k ? `${k.name} ${c.level}` : null].filter(Boolean).join(' · ') || '—'));
  const grid = el('div', 'stats');
  const ab = R.abilities(data, c);
  const items = [
    [String(R.armorClass(data, c).ac), t('sheet.ac')], [String(R.maxHp(data, c)), 'HP'], [R.fmt(R.initiative(data, c)), t('sheet.init')],
    ...R.ABILITIES.map((a) => [`${ab[a]}`, `${a.toUpperCase()} ${R.fmt(R.mod(ab[a]))}`]),
  ];
  for (const [v, kk] of items) { const st = el('div', 'stat'); st.append(el('span', 'v', v), el('span', 'k', kk)); grid.append(st); }
  s.append(grid);
  // character select
  $('#char-select').replaceChildren(...store.chars.map((cc, i) => Object.assign(el('option', null, cc.name || `${t('chars.unnamed')} ${i + 1}`), { value: i })));
  $('#char-select').value = store.current;
}
function renderTodo() {
  const box = $('#todo'); box.replaceChildren(el('h3', null, t('todo.title')));
  const pend = R.pending(data, ch());
  if (!pend.length) { box.append(el('p', 'done', t('todo.none'))); return; }
  const ul = el('ul');
  for (const p of pend) ul.append(el('li', null, t(`todo.${p}`)));
  box.append(ul);
}
function render() {
  renderTabs();
  $('#main').replaceChildren(tabs[ui.tab]());
  renderSummaryOnly();
  renderTodo();
}
function saveRender() { save(); render(); }

function download(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

async function init() {
  const names = ['core', 'races', 'classes', 'spells', 'equipment', 'backgrounds'];
  const loaded = await Promise.all(names.map((n) => fetch(`data/${n}.json`).then((r) => r.json())));
  data = Object.fromEntries(names.map((n, i) => [n, loaded[i]]));

  setLang(ui.lang || detectLang());
  $('#set-lang').value = getLang();
  $('#set-theme').value = ui.theme;
  applyI18n();

  $('#set-theme').addEventListener('change', (e) => { ui.theme = e.target.value; document.documentElement.dataset.theme = ui.theme; save(); });
  $('#set-lang').addEventListener('change', (e) => { ui.lang = e.target.value; setLang(ui.lang); save(); applyI18n(); render(); });
  $('#char-select').addEventListener('change', (e) => { store.current = Number(e.target.value); saveRender(); });
  $('#btn-new').addEventListener('click', () => { store.chars.push(R.newCharacter()); store.current = store.chars.length - 1; ui.tab = 'abilities'; saveRender(); });
  $('#btn-del').addEventListener('click', () => {
    if (!confirm(t('msg.confirmdel'))) return;
    store.chars.splice(store.current, 1);
    if (!store.chars.length) store.chars = [R.newCharacter()];
    store.current = Math.max(0, store.current - 1);
    saveRender(); toast(t('msg.deleted'));
  });
  $('#btn-export').addEventListener('click', () => {
    const c = ch();
    download(JSON.stringify({ app: 'character-forge', version: 1, character: c }, null, 1), `${(c.name || 'character').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`);
  });
  $('#btn-import').addEventListener('click', () => $('#file-import').click());
  $('#file-import').addEventListener('change', async () => {
    const f = $('#file-import').files[0]; $('#file-import').value = '';
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      const c = upgrade(j.character ?? j);
      store.chars.push(c); store.current = store.chars.length - 1;
      saveRender(); toast(t('msg.imported', { name: c.name || f.name }));
    } catch { toast(t('msg.badfile')); }
  });
  window.addEventListener('beforeprint', () => { if (ui.tab !== 'sheet') { ui.tab = 'sheet'; render(); } document.body.classList.add('printing'); });
  window.addEventListener('afterprint', () => document.body.classList.remove('printing'));
  window.addEventListener('pagehide', save);

  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !new URLSearchParams(location.search).has('nosw')) navigator.serviceWorker.register('sw.js').catch(() => {});
  render();
  window.__cf = { data, store, ui, ch, R, render };
}
init();
