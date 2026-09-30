// Compiles the SRD 5.1 JSON from 5e-bits/5e-database into the compact files the app ships.
// Source of truth: https://github.com/5e-bits/5e-database (MIT code, SRD content CC-BY-4.0).
// Usage: node tools/build-data.mjs [path-to-5e-database]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SRC = `${process.argv[2] ?? '/home/user/5e-bits/5e-database'}/src/2014/en`;
const load = (n) => JSON.parse(readFileSync(`${SRC}/5e-SRD-${n}.json`, 'utf8'));
const out = (name, data) => { const s = JSON.stringify(data); writeFileSync(`app/data/${name}.json`, s); console.log(name, `${(s.length / 1024).toFixed(0)} KB`); };
mkdirSync('app/data', { recursive: true });

const skills = load('Skills').map((s) => ({ id: s.index, name: s.name, ability: s.ability_score.index }));
const alignments = load('Alignments').map((a) => ({ id: a.index, name: a.name, abbr: a.abbreviation }));
const languages = load('Languages').map((l) => l.name);

// ---------- proficiency helpers ----------
const profName = (p) => p.reference?.name ?? p.name.replace(/^Skill: /, '');
const profKind = (p) => {
  const i = p.index ?? p.url?.split('/').pop() ?? '';
  if (i.startsWith('skill-')) return { kind: 'skill', id: i.slice(6) };
  if (i.startsWith('saving-throw-')) return { kind: 'save', id: i.slice(13) };
  return { kind: 'other', id: i };
};
function choiceToSkills(ch) {
  // a proficiency choice; returns { n, from: [skill ids] } or { n, any: true } or null when not about skills
  if (!ch || ch.type !== 'proficiencies') return null;
  const opts = ch.from?.options ?? [];
  const ids = [];
  for (const o of opts) {
    const item = o.item ?? o.choice ?? o;
    const k = profKind(item.item ?? item);
    if (k.kind === 'skill') ids.push(k.id);
  }
  if (!ids.length) return null;
  return { n: ch.choose, from: ids.length === skills.length ? null : ids };
}

// ---------- races ----------
const traits = Object.fromEntries(load('Traits').map((t) => [t.index, t]));
const subracesRaw = load('Subraces');
function traitOut(id) {
  const t = traits[id];
  const o = { name: t.name, desc: t.desc.join('\n') };
  const skillIds = (t.proficiencies ?? []).map(profKind).filter((k) => k.kind === 'skill').map((k) => k.id);
  if (skillIds.length) o.skills = skillIds;
  const other = (t.proficiencies ?? []).map((p) => ({ ...profKind(p), name: profName(p) })).filter((k) => k.kind === 'other');
  if (other.length) o.profs = other.map((k) => k.name);
  if (t.proficiency_choices) { const c = choiceToSkills(t.proficiency_choices); if (c) o.skillChoice = c; }
  if (t.language_options) o.langChoice = { n: t.language_options.choose };
  return o;
}
const races = load('Races').map((r) => ({
  id: r.index, name: r.name, speed: r.speed, size: r.size,
  bonuses: Object.fromEntries((r.ability_bonuses ?? []).map((b) => [b.ability_score.index, b.bonus])),
  languages: (r.languages ?? []).map((l) => l.name),
  langChoice: r.language_options ? { n: r.language_options.choose } : undefined,
  skillChoice: r.starting_proficiency_options ? choiceToSkills(r.starting_proficiency_options) ?? undefined : undefined,
  profs: (r.starting_proficiencies ?? []).map((p) => ({ ...profKind(p), name: profName(p) })).filter((k) => k.kind === 'other').map((k) => k.name),
  skills: (r.starting_proficiencies ?? []).map(profKind).filter((k) => k.kind === 'skill').map((k) => k.id),
  traits: (r.traits ?? []).map((t) => traitOut(t.index)),
  subraces: subracesRaw.filter((s) => s.race.index === r.index).map((s) => ({
    id: s.index, name: s.name, desc: s.desc,
    bonuses: Object.fromEntries((s.ability_bonuses ?? []).map((b) => [b.ability_score.index, b.bonus])),
    langChoice: s.language_options ? { n: s.language_options.choose } : undefined,
    traits: (s.racial_traits ?? []).map((t) => traitOut(t.index)),
  })),
}));

// ---------- equipment ----------
const equipment = load('Equipment');
const cats = Object.fromEntries(load('Equipment-Categories').map((c) => [c.index, c.equipment.map((e) => e.index)]));
const eqById = Object.fromEntries(equipment.map((e) => [e.index, e]));
const weapons = equipment.filter((e) => e.weapon_category).map((w) => ({
  id: w.index, name: w.name, cat: w.weapon_category, range: w.weapon_range,
  dmg: w.damage ? `${w.damage.damage_dice} ${w.damage.damage_type.name.toLowerCase()}` : '—',
  d2: w.two_handed_damage ? w.two_handed_damage.damage_dice : undefined,
  props: (w.properties ?? []).map((p) => p.name),
  reach: w.range?.normal, far: w.throw_range ? `${w.throw_range.normal}/${w.throw_range.long}` : (w.range?.long ? `${w.range.normal}/${w.range.long}` : undefined),
}));
const armors = equipment.filter((e) => e.armor_category && e.armor_class).map((a) => ({
  id: a.index, name: a.name, cat: a.armor_category, base: a.armor_class.base,
  dex: a.armor_class.dex_bonus ? (a.armor_class.max_bonus ?? 9) : 0, strMin: a.str_minimum || 0, stealthDis: Boolean(a.stealth_disadvantage),
}));
const packs = equipment.filter((e) => e.gear_category?.index === 'equipment-packs').map((p) => ({ id: p.index, name: p.name, contents: (p.contents ?? []).map((c) => `${c.quantity}× ${eqById[c.item.index]?.name ?? c.item.name}`) }));

// starting equipment options → readable choice tree
function eqOption(o) {
  if (o.option_type === 'counted_reference') {
    const r = { n: o.count, id: o.of.index, name: o.of.name };
    if (o.prerequisites?.length) r.req = o.prerequisites.map((p) => p.proficiency?.name?.replace(/^\w+: /, '')).join(', ');
    return r;
  }
  if (o.option_type === 'choice' && o.choice?.from?.equipment_category) {
    const c = o.choice.from.equipment_category;
    return { n: o.choice.choose, cat: c.index, name: c.name };
  }
  if (o.option_type === 'multiple') return { all: o.items.map(eqOption) };
  return { name: '?' };
}
const eqChoice = (ch) => ({ desc: ch.desc, n: ch.choose, options: (ch.from.options ?? []).map(eqOption), cat: ch.from.equipment_category ? { id: ch.from.equipment_category.index, name: ch.from.equipment_category.name, n: ch.choose } : undefined });

// ---------- classes ----------
const levelsRaw = load('Levels').filter((l) => !l.subclass);
const featuresRaw = load('Features');
const subclasses = load('Subclasses');
const classes = load('Classes').map((c) => {
  const lv = levelsRaw.filter((l) => l.class.index === c.index).sort((a, b) => a.level - b.level);
  const feats = featuresRaw.filter((f) => f.class.index === c.index && !f.subclass);
  const sub = subclasses.find((s) => s.class.index === c.index);
  const subFeats = featuresRaw.filter((f) => f.subclass?.index === sub.index);
  const subLevels = load('Levels').filter((l) => l.subclass?.index === sub.index && l.features.length);
  return {
    id: c.index, name: c.name, hitDie: c.hit_die,
    saves: c.saving_throws.map((s) => s.index),
    profs: c.proficiencies.map((p) => ({ ...profKind(p), name: profName(p) })).filter((k) => k.kind === 'other').map((k) => k.name),
    skillChoice: choiceToSkills(c.proficiency_choices[0]),
    equipment: (c.starting_equipment ?? []).map((e) => `${e.quantity}× ${e.equipment.name}`),
    equipmentChoices: (c.starting_equipment_options ?? []).map(eqChoice),
    levels: lv.map((l) => ({
      level: l.level, prof: l.prof_bonus, asi: l.ability_score_bonuses,
      spells: l.spellcasting ?? undefined,
      specific: l.class_specific && ['rage_count', 'rage_damage_bonus', 'martial_arts', 'ki_points', 'unarmored_movement', 'sneak_attack', 'sorcery_points', 'invocations_known', 'song_of_rest_die', 'bardic_inspiration_die', 'brutal_critical_dice', 'extra_attacks', 'channel_divinity_charges', 'wild_shape_max_cr', 'favored_enemies', 'favored_terrain', 'aura_range', 'action_surges', 'indomitable_uses', 'arcane_recovery_levels', 'metamagic_known', 'mystic_arcanum_level_6', 'mystic_arcanum_level_7', 'mystic_arcanum_level_8', 'mystic_arcanum_level_9'].some((k) => l.class_specific[k] != null) ? l.class_specific : undefined,
      features: feats.filter((f) => f.level === l.level).map((f) => f.name),
    })),
    features: Object.fromEntries(feats.map((f) => [f.name, f.desc.join('\n')])),
    spellcasting: c.spellcasting ? {
      ability: c.spellcasting.spellcasting_ability.index, startLevel: c.spellcasting.level,
      prepared: { cleric: 'wis+level', druid: 'wis+level', wizard: 'int+level', paladin: 'cha+halflevel' }[c.index] ?? null,
      ritual: ['cleric', 'druid', 'wizard', 'bard'].includes(c.index),
    } : undefined,
    subclass: (() => {
      const featureMap = Object.fromEntries(subFeats.map((f) => [f.name, f.desc.join('\n')]));
      // a few subclass-level features are tagged only with the class (e.g. Supreme Healing)
      for (const l of subLevels) for (const f of l.features) if (!featureMap[f.name]) {
        const cf = featuresRaw.find((x) => x.name === f.name && x.class.index === c.index);
        if (cf) featureMap[f.name] = cf.desc.join('\n');
      }
      return {
        id: sub.index, name: sub.name, flavor: sub.subclass_flavor, desc: sub.desc.join('\n'),
        levels: Object.fromEntries(subLevels.map((l) => [l.level, l.features.map((f) => f.name)])),
        features: featureMap,
      };
    })(),
  };
});

// ---------- spells ----------
const spells = load('Spells').map((s) => ({
  id: s.index, name: s.name, level: s.level, school: s.school.name,
  classes: s.classes.map((c) => c.index),
  time: s.casting_time, range: s.range, duration: s.duration,
  comps: s.components.join(', ') + (s.material ? ` (${s.material.length > 60 ? s.material.slice(0, 57) + '…' : s.material})` : ''),
  ritual: s.ritual || undefined, conc: s.concentration || undefined,
  desc: s.desc.join('\n') + (s.higher_level?.length ? `\nAt Higher Levels. ${s.higher_level.join('\n')}` : ''),
}));

// ---------- background ----------
const bgs = load('Backgrounds').map((b) => ({
  id: b.index, name: b.name,
  skills: b.starting_proficiencies.map(profKind).filter((k) => k.kind === 'skill').map((k) => k.id),
  langChoice: b.language_options ? { n: b.language_options.choose } : undefined,
  equipment: (b.starting_equipment ?? []).map((e) => `${e.quantity}× ${e.equipment.name}`),
  feature: { name: b.feature.name, desc: b.feature.desc.join('\n') },
}));

out('core', { abilities: ['str', 'dex', 'con', 'int', 'wis', 'cha'], skills, alignments, languages, feats: load('Feats').map((f) => ({ id: f.index, name: f.name, desc: f.desc.join('\n'), req: f.prerequisites?.map((p) => `${p.ability_score.name} ${p.minimum_score}+`).join(', ') })) });
out('races', races);
out('classes', classes);
out('spells', spells);
out('equipment', { weapons, armors, packs, cats: { 'simple-weapons': cats['simple-weapons'], 'martial-weapons': cats['martial-weapons'], 'simple-melee-weapons': cats['simple-melee-weapons'], 'martial-melee-weapons': cats['martial-melee-weapons'], 'holy-symbols': cats['holy-symbols'], 'arcane-foci': cats['arcane-foci'], 'druidic-foci': cats['druidic-foci'], 'musical-instruments': cats['musical-instruments'] }, names: Object.fromEntries(equipment.map((e) => [e.index, e.name])) });
out('backgrounds', bgs);
