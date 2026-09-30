// Renders the printable character sheet as DOM. Always ink-on-paper regardless of app theme;
// css/sheet.css carries the print rules.
import * as R from './rules.js';
import { t } from './i18n.js';

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

export function renderSheet(data, ch) {
  const root = el('div', 'sheet');
  const ab = R.abilities(data, ch);
  const k = R.klass(data, ch), r = R.race(data, ch), b = R.background(data, ch);
  const ac = R.armorClass(data, ch);

  // header
  const head = el('header', 'sh-head');
  const name = el('div', 'sh-name');
  name.append(el('div', 'big', ch.name || t('chars.unnamed')), el('label', 'lab', t('sheet.name')));
  const meta = el('div', 'sh-meta');
  const metaPairs = [
    [`${k?.name ?? '—'} ${ch.level}`, `${t('nav.class')} · ${t('ab.level')}`],
    [[r?.name, r?.subraces.find((s) => s.id === ch.subrace)?.name].filter(Boolean).join(' · ') || '—', t('nav.race')],
    [b?.name ?? '—', t('nav.background')],
    [data.core.alignments.find((a) => a.id === ch.alignment)?.name ?? '—', t('sheet.alignment')],
    [ch.playerName || '—', t('sheet.player')],
  ];
  for (const [v, lab] of metaPairs) { const c = el('div', 'sh-cell'); c.append(el('div', 'v', v), el('label', 'lab', lab)); meta.append(c); }
  head.append(name, meta);
  root.append(head);

  const cols = el('div', 'sh-cols');

  // column 1: abilities + saves + skills
  const c1 = el('div', 'sh-col');
  const abBox = el('div', 'sh-abilities');
  for (const a of R.ABILITIES) {
    const cell = el('div', 'sh-ab');
    cell.append(el('div', 'k', a.toUpperCase()), el('div', 'm', R.fmt(R.mod(ab[a]))), el('div', 's', String(ab[a])));
    abBox.append(cell);
  }
  c1.append(abBox);
  const saves = el('div', 'sh-box');
  saves.append(el('h4', null, t('sheet.saves')));
  for (const a of R.ABILITIES) {
    const row = el('div', 'sh-line');
    row.append(el('span', `pip${k?.saves.includes(a) ? ' on' : ''}`), el('span', 'b', R.fmt(R.saveBonus(data, ch, a))), el('span', null, R.ABILITY_NAMES[a]));
    saves.append(row);
  }
  c1.append(saves);
  const skills = el('div', 'sh-box');
  skills.append(el('h4', null, t('sheet.skills')));
  const src = R.skillSources(data, ch);
  for (const s of data.core.skills) {
    const row = el('div', 'sh-line');
    const exp = ch.choices.expertise.includes(s.id);
    row.append(el('span', `pip${src[s.id] ? ' on' : ''}${exp ? ' exp' : ''}`), el('span', 'b', R.fmt(R.skillBonus(data, ch, s.id))), el('span', null, `${s.name} (${s.ability.toUpperCase()})`));
    skills.append(row);
  }
  c1.append(skills);
  const pp = el('div', 'sh-box sh-passive');
  pp.append(el('span', 'b', String(R.passivePerception(data, ch))), el('span', null, t('sheet.passive')));
  c1.append(pp);

  // column 2: combat numbers, attacks, equipment
  const c2 = el('div', 'sh-col');
  const combat = el('div', 'sh-combat');
  for (const [v, lab] of [[String(ac.ac), t('sheet.ac')], [R.fmt(R.initiative(data, ch)), t('sheet.init')], [`${R.speed(data, ch)} ft`, t('sheet.speed')]]) {
    const cell = el('div', 'sh-cell big3'); cell.append(el('div', 'v', v), el('label', 'lab', lab)); combat.append(cell);
  }
  c2.append(combat);
  const hp = el('div', 'sh-box sh-hp');
  hp.append(el('div', 'v', String(R.maxHp(data, ch))), el('label', 'lab', `${t('sheet.hp')} · ${t('sheet.hitdice')} ${ch.level}d${k?.hitDie ?? '—'} · ${t('sheet.prof')} ${R.fmt(R.profBonus(data, ch))}`));
  c2.append(hp);
  const atts = R.attacks(data, ch);
  const atkBox = el('div', 'sh-box');
  atkBox.append(el('h4', null, t('sheet.attacks')));
  const tbl = el('table', 'sh-table');
  tbl.append(...atts.slice(0, 6).map((a) => { const tr = el('tr'); tr.append(el('td', 'nm', a.name), el('td', 'b', R.fmt(a.bonus)), el('td', null, `${a.dmg.split(' ')[0]}${a.mod ? R.fmt(a.mod) : ''} ${a.dmg.split(' ').slice(1).join(' ')}`)); return tr; }));
  atkBox.append(tbl);
  c2.append(atkBox);
  const inv = el('div', 'sh-box');
  inv.append(el('h4', null, t('sheet.equipment')));
  inv.append(el('div', 'sh-flow', R.equippedItems(data, ch).map((i) => (i.n > 1 ? `${i.name} ×${i.n}` : i.name)).join(', ')));
  c2.append(inv);
  const profs = el('div', 'sh-box');
  profs.append(el('h4', null, t('sheet.profs')));
  profs.append(el('div', 'sh-flow', [...R.otherProfs(data, ch), `${t('race.langs')}: ${R.languages(data, ch).join(', ')}`].join(' · ')));
  c2.append(profs);

  // column 3: features
  const c3 = el('div', 'sh-col');
  const featBox = el('div', 'sh-box grow');
  featBox.append(el('h4', null, t('sheet.features')));
  const feats = [];
  for (const tr2 of r?.traits ?? []) feats.push(tr2.name);
  const sub = r?.subraces.find((s) => s.id === ch.subrace);
  for (const tr2 of sub?.traits ?? []) feats.push(tr2.name);
  if (b) feats.push(`${b.feature.name} (${b.name})`);
  for (const f of R.features(data, ch)) feats.push(`${f.name} (${f.level})`);
  for (const lv of R.asiLevels(data, ch)) if (ch.choices.asi[lv]?.feat) feats.push('Feat: Grappler');
  featBox.append(el('div', 'sh-flow', feats.join(' · ')));
  c3.append(featBox);
  const si = R.spellInfo(data, ch);
  if (si) {
    const sp = el('div', 'sh-box');
    sp.append(el('h4', null, t('sheet.spells')));
    const row = el('div', 'sh-line');
    row.append(el('span', null, `${si.ability.toUpperCase()} · ${t('sp.dc')} ${si.dc} · ${t('sp.atk')} ${R.fmt(si.attack)}`));
    sp.append(row);
    sp.append(el('div', 'sh-flow', `${t('sp.slots')}: ${si.slots.map((n, i) => (n ? `L${i + 1}×${n}` : null)).filter(Boolean).join(' ') || '—'}`));
    const names = (ids) => ids.map((id) => data.spells.find((s) => s.id === id)?.name).filter(Boolean).join(', ');
    if (ch.choices.cantrips.length) sp.append(el('div', 'sh-flow', `${t('sp.cantrip')}: ${names(ch.choices.cantrips)}`));
    if (ch.choices.spells.length) sp.append(el('div', 'sh-flow', names(ch.choices.spells)));
    c3.append(sp);
  }
  if (ch.appearance) { const x = el('div', 'sh-box'); x.append(el('h4', null, t('sheet.appearance')), el('div', 'sh-flow', ch.appearance)); c3.append(x); }
  if (ch.notes) { const x = el('div', 'sh-box'); x.append(el('h4', null, t('sheet.notes')), el('div', 'sh-flow', ch.notes)); c3.append(x); }

  cols.append(c1, c2, c3);
  root.append(cols);
  return root;
}
