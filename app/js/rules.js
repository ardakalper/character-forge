// Pure 5e (SRD 5.1) rules engine. Every function takes plain data and returns plain data;
// nothing here touches the DOM. `data` is the bundle loaded from app/data, `ch` a character.

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const ABILITY_NAMES = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
export const mod = (score) => Math.floor((score - 10) / 2);
export const fmt = (n) => (n >= 0 ? `+${n}` : `${n}`);

// ---------- ability scores ----------
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
export const POINT_COSTS = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
export const POINT_BUDGET = 27;
export const pointCost = (scores) => ABILITIES.reduce((n, a) => n + (POINT_COSTS[scores[a]] ?? Infinity), 0);

export function newCharacter() {
  return {
    name: '', playerName: '', alignment: '', level: 1,
    method: 'array', base: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    race: null, subrace: null, klass: null, background: 'acolyte',
    hpMethod: 'average', // 'average' | 'max'
    choices: { skills: [], expertise: [], languages: [], raceSkills: [], equipment: {}, cantrips: [], spells: [], asi: {}, traitLang: [] },
    notes: '', appearance: '',
  };
}

// racial bonuses (race + subrace)
export function racialBonus(data, ch) {
  const out = Object.fromEntries(ABILITIES.map((a) => [a, 0]));
  const race = data.races.find((r) => r.id === ch.race);
  if (!race) return out;
  for (const [a, b] of Object.entries(race.bonuses)) out[a] += b;
  const sub = race.subraces.find((s) => s.id === ch.subrace);
  if (sub) for (const [a, b] of Object.entries(sub.bonuses)) out[a] += b;
  return out;
}
// ASI allocations: ch.choices.asi = { [level]: {str:1, dex:1} | {feat:'grappler'} }
export function asiBonus(data, ch) {
  const out = Object.fromEntries(ABILITIES.map((a) => [a, 0]));
  for (const lv of asiLevels(data, ch)) {
    const pick = ch.choices.asi[lv];
    if (pick && !pick.feat) for (const [a, n] of Object.entries(pick)) if (out[a] != null) out[a] += n;
  }
  return out;
}
export function abilities(data, ch) {
  const racial = racialBonus(data, ch), asi = asiBonus(data, ch);
  return Object.fromEntries(ABILITIES.map((a) => [a, Math.min(20, (ch.base[a] ?? 10) + racial[a] + asi[a])]));
}

// ---------- class helpers ----------
export const klass = (data, ch) => data.classes.find((c) => c.id === ch.klass) ?? null;
export const race = (data, ch) => data.races.find((r) => r.id === ch.race) ?? null;
export const background = (data, ch) => data.backgrounds.find((b) => b.id === ch.background) ?? null;
export const levelRow = (data, ch, lv = ch.level) => klass(data, ch)?.levels.find((l) => l.level === lv) ?? null;
export const profBonus = (data, ch) => levelRow(data, ch)?.prof ?? Math.ceil(ch.level / 4) + 1;
export function asiLevels(data, ch) {
  const k = klass(data, ch); if (!k) return [];
  const out = []; let prev = 0;
  for (const l of k.levels) { if (l.level > ch.level) break; if (l.asi > prev) out.push(l.level); prev = l.asi; }
  return out;
}
// every class feature gained up to the current level, subclass included (subclass from level 1-3 per class data)
export function features(data, ch) {
  const k = klass(data, ch); if (!k) return [];
  const out = [];
  for (const l of k.levels) {
    if (l.level > ch.level) break;
    for (const name of l.features) out.push({ level: l.level, name, desc: k.features[name] ?? '' });
  }
  for (const [lv, names] of Object.entries(k.subclass.levels)) {
    if (Number(lv) > ch.level) continue;
    for (const name of names) out.push({ level: Number(lv), name: `${name} (${k.subclass.name})`, desc: k.subclass.features[name] ?? '' });
  }
  return out.sort((a, b) => a.level - b.level);
}

// ---------- hit points ----------
export function maxHp(data, ch) {
  const k = klass(data, ch); if (!k) return 0;
  const con = mod(abilities(data, ch).con);
  let hp = k.hitDie + con;
  const perLevel = ch.hpMethod === 'max' ? k.hitDie : k.hitDie / 2 + 1;
  for (let l = 2; l <= ch.level; l++) hp += Math.max(1, perLevel + con);
  return Math.max(1, hp);
}

// ---------- proficiencies ----------
export function skillSources(data, ch) {
  // returns { skillId: 'class' | 'background' | 'race' }
  const out = {};
  const r = race(data, ch), b = background(data, ch);
  for (const s of r?.skills ?? []) out[s] = 'race';
  for (const t of r?.traits ?? []) for (const s of t.skills ?? []) out[s] = 'race';
  for (const s of ch.choices.raceSkills) out[s] = 'race';
  for (const s of b?.skills ?? []) out[s] = 'background';
  for (const s of ch.choices.skills) out[s] = 'class';
  return out;
}
export function skillBonus(data, ch, skillId) {
  const sk = data.core.skills.find((s) => s.id === skillId);
  const ab = abilities(data, ch);
  const prof = skillSources(data, ch)[skillId] ? profBonus(data, ch) : 0;
  const exp = ch.choices.expertise.includes(skillId) ? profBonus(data, ch) : 0;
  return mod(ab[sk.ability]) + prof + exp;
}
export function saveBonus(data, ch, abilityId) {
  const ab = abilities(data, ch);
  const k = klass(data, ch);
  return mod(ab[abilityId]) + (k?.saves.includes(abilityId) ? profBonus(data, ch) : 0);
}
export function expertiseSlots(data, ch) {
  if (ch.klass === 'rogue') return ch.level >= 6 ? 4 : 2;
  if (ch.klass === 'bard') return ch.level >= 10 ? 4 : ch.level >= 3 ? 2 : 0;
  return 0;
}
export function languages(data, ch) {
  const r = race(data, ch);
  const set = new Set(r?.languages ?? []);
  for (const l of [...ch.choices.languages, ...ch.choices.traitLang]) set.add(l);
  return [...set];
}
export function languageChoices(data, ch) {
  const r = race(data, ch), b = background(data, ch);
  const sub = r?.subraces.find((s) => s.id === ch.subrace);
  const traitN = [...(r?.traits ?? []), ...(sub?.traits ?? [])].reduce((n, t) => n + (t.langChoice?.n ?? 0), 0);
  return (r?.langChoice?.n ?? 0) + (sub?.langChoice?.n ?? 0) + (b?.langChoice?.n ?? 0) + traitN;
}
export function otherProfs(data, ch) {
  const r = race(data, ch), k = klass(data, ch);
  const sub = r?.subraces.find((s) => s.id === ch.subrace);
  const set = new Set([...(k?.profs ?? []), ...(r?.profs ?? [])]);
  for (const t of [...(r?.traits ?? []), ...(sub?.traits ?? [])]) for (const p of t.profs ?? []) set.add(p);
  return [...set].filter((p) => !p.startsWith('Saving Throw'));
}

// ---------- equipment, AC, attacks ----------
export function equippedItems(data, ch) {
  // resolves fixed equipment + chosen options into a flat list of { id?, name, n }
  const k = klass(data, ch), b = background(data, ch);
  const out = [];
  const add = (name, n = 1, id = null) => { const hit = out.find((x) => x.name === name); if (hit) hit.n += n; else out.push({ name, n, id }); };
  for (const line of [...(k?.equipment ?? []), ...(b?.equipment ?? [])]) { const m = line.match(/^(\d+)× (.+)$/); add(m[2], Number(m[1])); }
  (k?.equipmentChoices ?? []).forEach((ch2, i) => {
    const picked = ch.choices.equipment[i];
    const apply = (opt) => {
      if (!opt) return;
      if (opt.all) { opt.all.forEach(apply); return; }
      if (opt.cat) { const id = ch.choices.equipment[`${i}:cat`]; const name = data.equipment.names[id]; if (name) add(name, opt.n ?? 1, id); return; }
      add(opt.name, opt.n ?? 1, opt.id);
    };
    if (ch2.cat) { const id = ch.choices.equipment[`${i}:cat`]; const name = data.equipment.names[id]; if (name) add(name, ch2.cat.n ?? 1, id); return; }
    apply(ch2.options[picked ?? -1]);
  });
  return out;
}
const byName = (data, name) => data.equipment.names ? Object.entries(data.equipment.names).find(([, n]) => n === name)?.[0] : null;
export function armorClass(data, ch) {
  const ab = abilities(data, ch);
  const items = equippedItems(data, ch);
  const ids = items.map((i) => i.id ?? byName(data, i.name)).filter(Boolean);
  const worn = data.equipment.armors.filter((a) => ids.includes(a.id) && a.cat !== 'Shield');
  const shield = data.equipment.armors.some((a) => ids.includes(a.id) && a.cat === 'Shield') ? 2 : 0;
  let best = 10 + mod(ab.dex), how = 'Unarmored';
  if (ch.klass === 'barbarian') { const v = 10 + mod(ab.dex) + mod(ab.con); if (v > best) { best = v; how = 'Unarmored Defense'; } }
  if (ch.klass === 'monk' && !worn.length && !shield) { const v = 10 + mod(ab.dex) + mod(ab.wis); if (v > best) { best = v; how = 'Unarmored Defense'; } }
  for (const a of worn) { const v = a.base + Math.min(mod(ab.dex), a.dex); if (v >= best) { best = v; how = a.name; } }
  return { ac: best + shield, how: shield ? `${how} + shield` : how };
}
export function attacks(data, ch) {
  const ab = abilities(data, ch), pb = profBonus(data, ch);
  const items = equippedItems(data, ch);
  const out = [];
  for (const it of items) {
    const id = it.id ?? byName(data, it.name);
    const w = data.equipment.weapons.find((x) => x.id === id);
    if (!w || out.some((o) => o.name === w.name)) continue;
    const finesse = w.props.includes('Finesse');
    const useDex = w.range === 'Ranged' || (finesse && mod(ab.dex) > mod(ab.str));
    const m = useDex ? mod(ab.dex) : mod(ab.str);
    out.push({ name: w.name, bonus: m + pb, dmg: w.dmg.replace(/^(\S+)/, (d) => d) , mod: m, range: w.far ?? (w.reach ? `${w.reach} ft.` : ''), props: w.props.join(', ') });
  }
  if (ch.klass === 'monk') { const m = Math.max(mod(ab.dex), mod(ab.str)); const die = levelRow(data, ch)?.specific?.martial_arts?.dice_value ?? 4; out.push({ name: 'Unarmed Strike', bonus: m + pb, dmg: `1d${die} bludgeoning`, mod: m, range: '5 ft.', props: 'Martial Arts' }); }
  return out;
}

// ---------- spellcasting ----------
export const caster = (data, ch) => klass(data, ch)?.spellcasting ?? null;
export function spellInfo(data, ch) {
  const sc = caster(data, ch); if (!sc || ch.level < sc.startLevel) return null;
  const row = levelRow(data, ch); const s = row?.spells; if (!s) return null;
  const ab = abilities(data, ch);
  const m = mod(ab[sc.ability]);
  const slots = []; for (let i = 1; i <= 9; i++) slots.push(s[`spell_slots_level_${i}`] ?? 0);
  const prepared = sc.prepared ? Math.max(1, m + (sc.prepared.endsWith('halflevel') ? Math.floor(ch.level / 2) : ch.level)) : null;
  return {
    ability: sc.ability, mod: m, dc: 8 + profBonus(data, ch) + m, attack: profBonus(data, ch) + m,
    cantrips: s.cantrips_known ?? 0, known: s.spells_known ?? null, prepared, slots,
    maxSlotLevel: slots.reduce((mx, n, i) => (n > 0 ? i + 1 : mx), 0), ritual: sc.ritual,
  };
}
export const spellList = (data, ch, level) => data.spells.filter((s) => s.classes.includes(ch.klass) && s.level === level);

// ---------- validation: what still needs choosing ----------
export function pending(data, ch) {
  const out = [];
  const k = klass(data, ch), r = race(data, ch);
  if (!ch.race) out.push('race');
  if (r?.subraces.length && !ch.subrace) out.push('subrace');
  if (!ch.klass) return [...out, 'class'];
  if (ch.method === 'points' && pointCost(ch.base) !== POINT_BUDGET) out.push('points');
  if (ch.choices.skills.length < (k.skillChoice?.n ?? 0)) out.push('skills');
  if (ch.choices.expertise.length < expertiseSlots(data, ch)) out.push('expertise');
  const rc = r?.skillChoice ?? r?.traits.map((t) => t.skillChoice).find(Boolean);
  if (rc && ch.choices.raceSkills.length < rc.n) out.push('raceSkills');
  if (ch.choices.languages.length < languageChoices(data, ch)) out.push('languages');
  for (const lv of asiLevels(data, ch)) {
    const a = ch.choices.asi[lv];
    if (!a || (!a.feat && Object.values(a).reduce((x, y) => x + y, 0) !== 2)) { out.push('asi'); break; }
  }
  (k.equipmentChoices ?? []).forEach((c, i) => {
    if (c.cat ? !ch.choices.equipment[`${i}:cat`] : ch.choices.equipment[i] == null) out.push(`equipment`);
    else if (c.options?.[ch.choices.equipment[i]]?.cat && !ch.choices.equipment[`${i}:cat`]) out.push('equipment');
  });
  const si = spellInfo(data, ch);
  if (si) {
    if (ch.choices.cantrips.length < si.cantrips) out.push('cantrips');
    const want = si.known ?? si.prepared ?? 0;
    if (ch.choices.spells.length < want) out.push('spells');
  }
  return [...new Set(out)];
}

// passive perception, initiative, speed
export const initiative = (data, ch) => mod(abilities(data, ch).dex);
export const passivePerception = (data, ch) => 10 + skillBonus(data, ch, 'perception');
export const speed = (data, ch) => race(data, ch)?.speed ?? 30;
