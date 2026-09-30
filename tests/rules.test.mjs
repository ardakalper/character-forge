import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as R from '../app/js/rules.js';

const data = Object.fromEntries(['core', 'races', 'classes', 'spells', 'equipment', 'backgrounds'].map((n) => [n, JSON.parse(readFileSync(`app/data/${n}.json`, 'utf8'))]));

const fighter = () => { const c = R.newCharacter(); c.klass = 'fighter'; c.race = 'human'; return c; };

test('data integrity: every class has 20 levels, features resolve, spells reference real classes', () => {
  assert.equal(data.classes.length, 12);
  for (const k of data.classes) {
    assert.equal(k.levels.length, 20, k.id);
    assert.deepEqual(k.levels.map((l) => l.level), Array.from({ length: 20 }, (_, i) => i + 1), k.id);
    for (const l of k.levels) for (const f of l.features) assert.ok(k.features[f] != null, `${k.id} ${l.level} ${f}`);
    assert.ok(k.skillChoice.n >= 2, k.id);
    assert.ok(k.subclass.name, k.id);
    for (const names of Object.values(k.subclass.levels)) for (const f of names) assert.ok(k.subclass.features[f] != null, `${k.id} sub ${f}`);
  }
  const ids = new Set(data.classes.map((k) => k.id));
  for (const s of data.spells) { assert.ok(s.classes.length, s.id); for (const c of s.classes) assert.ok(ids.has(c), `${s.id} → ${c}`); }
  assert.equal(data.spells.length, 319);
  assert.equal(data.races.length, 9);
  assert.equal(data.core.skills.length, 18);
  // casters have slot tables
  const wiz = data.classes.find((k) => k.id === 'wizard');
  assert.equal(wiz.levels[2].spells.spell_slots_level_2, 2);
});

test('modifiers, point buy and standard array', () => {
  assert.equal(R.mod(10), 0); assert.equal(R.mod(8), -1); assert.equal(R.mod(15), 2); assert.equal(R.mod(20), 5); assert.equal(R.mod(7), -2);
  assert.equal(R.fmt(2), '+2'); assert.equal(R.fmt(-1), '-1');
  assert.equal(R.pointCost({ str: 15, dex: 15, con: 15, int: 8, wis: 8, cha: 8 }), 27);
  assert.equal(R.pointCost({ str: 13, dex: 13, con: 13, int: 12, wis: 12, cha: 12 }), 27);
  assert.equal(R.POINT_BUDGET, 27);
  assert.deepEqual(R.STANDARD_ARRAY, [15, 14, 13, 12, 10, 8]);
});

test('racial bonuses and ASI stack into final abilities, capped at 20', () => {
  const c = fighter(); // human: +1 all
  const ab = R.abilities(data, c);
  assert.equal(ab.str, 16); assert.equal(ab.cha, 9);
  c.level = 4; c.choices.asi[4] = { str: 2 };
  assert.equal(R.abilities(data, c).str, 18);
  c.level = 8; c.choices.asi[8] = { str: 2 };
  assert.equal(R.abilities(data, c).str, 20);
  c.level = 12; c.choices.asi[12] = { str: 2 };
  assert.equal(R.abilities(data, c).str, 20, 'capped');
  const d = R.newCharacter(); d.race = 'dwarf'; d.subrace = 'hill-dwarf'; d.klass = 'cleric';
  const ab2 = R.abilities(data, d);
  assert.equal(ab2.con, 13 + 2); assert.equal(ab2.wis, 10 + 1);
});

test('proficiency bonus and ASI levels follow the class table', () => {
  const c = fighter();
  assert.equal(R.profBonus(data, c), 2);
  c.level = 5; assert.equal(R.profBonus(data, c), 3);
  c.level = 20; assert.equal(R.profBonus(data, c), 6);
  assert.deepEqual(R.asiLevels(data, c), [4, 6, 8, 12, 14, 16, 19], 'fighter gets seven');
  const w = R.newCharacter(); w.klass = 'wizard'; w.level = 20;
  assert.deepEqual(R.asiLevels(data, w), [4, 8, 12, 16, 19]);
});

test('hit points: max at level 1, average after, minimum 1 per level', () => {
  const c = fighter(); // d10, con 13+1 (human) = 14 → mod +2
  assert.equal(R.maxHp(data, c), 12);
  c.level = 5; assert.equal(R.maxHp(data, c), 12 + 4 * 8);
  c.hpMethod = 'max'; assert.equal(R.maxHp(data, c), 12 + 4 * 12);
  const s = R.newCharacter(); s.klass = 'sorcerer'; s.race = 'elf'; s.base = { str: 8, dex: 14, con: 3, int: 12, wis: 10, cha: 15 };
  s.level = 3; // d6, con mod -4 → each level min 1
  assert.equal(R.maxHp(data, s), Math.max(1, 6 - 4) + 2 * 1);
});

test('saves, skills and expertise', () => {
  const c = fighter(); c.choices.skills = ['athletics', 'perception'];
  assert.equal(R.saveBonus(data, c, 'str'), 3 + 2, 'proficient save');
  assert.equal(R.saveBonus(data, c, 'int'), 1, 'unproficient');
  assert.equal(R.skillBonus(data, c, 'athletics'), 3 + 2);
  assert.equal(R.skillBonus(data, c, 'stealth'), 2);
  const r = R.newCharacter(); r.klass = 'rogue'; r.race = 'half-elf'; r.choices.skills = ['stealth', 'acrobatics', 'deception', 'insight'];
  r.choices.expertise = ['stealth', 'deception'];
  assert.equal(R.expertiseSlots(data, r), 2);
  r.level = 6; assert.equal(R.expertiseSlots(data, r), 4);
  assert.equal(R.skillBonus(data, r, 'stealth'), R.mod(R.abilities(data, r).dex) + 3 + 3);
  assert.equal(R.passivePerception(data, c), 10 + R.skillBonus(data, c, 'perception'));
});

test('armor class: armor with dex caps, shields, unarmored defense', () => {
  const c = fighter(); c.base.dex = 15; // dex 16 with human → +3
  c.choices.equipment = { 0: 0 }; // chain mail option
  const k = R.klass(data, c);
  const i = k.equipmentChoices.findIndex((x) => JSON.stringify(x).includes('chain-mail'));
  c.choices.equipment = { [i]: 0 };
  assert.equal(R.armorClass(data, c).ac, 16, 'heavy armor ignores dex');
  const b = R.newCharacter(); b.klass = 'barbarian'; b.race = 'half-orc'; b.base = { str: 15, dex: 14, con: 14, int: 8, wis: 10, cha: 12 };
  const acb = R.armorClass(data, b);
  assert.equal(acb.ac, 10 + 2 + 2); assert.equal(acb.how, 'Unarmored Defense');
  const m = R.newCharacter(); m.klass = 'monk'; m.race = 'elf'; m.base = { str: 10, dex: 15, con: 10, int: 10, wis: 15, cha: 8 };
  assert.equal(R.armorClass(data, m).ac, 10 + 3 + 2, 'elf +2 dex');
});

test('attacks pick the right ability and monks get martial arts', () => {
  const r = R.newCharacter(); r.klass = 'rogue'; r.race = 'halfling'; r.base.dex = 15; // 15+2=17 → +3
  const k = R.klass(data, r);
  const i = k.equipmentChoices.findIndex((x) => x.desc.includes('rapier'));
  r.choices.equipment = { [i]: 0 };
  const atk = R.attacks(data, r).find((a) => a.name === 'Rapier');
  assert.ok(atk, 'rapier chosen');
  assert.equal(atk.bonus, 3 + 2, 'finesse uses dex');
  const m = R.newCharacter(); m.klass = 'monk'; m.race = 'human'; m.level = 5;
  const ua = R.attacks(data, m).find((a) => a.name === 'Unarmed Strike');
  assert.ok(ua.dmg.startsWith('1d6'), 'martial arts die at level 5');
});

test('spellcasting: slots, DC, known and prepared counts', () => {
  const w = R.newCharacter(); w.klass = 'wizard'; w.race = 'gnome'; w.base.int = 15; w.level = 3; // int 17? gnome +2 int → 17 → +3
  const si = R.spellInfo(data, w);
  assert.equal(si.dc, 8 + 2 + 3);
  assert.deepEqual(si.slots.slice(0, 3), [4, 2, 0]);
  assert.equal(si.cantrips, 3);
  assert.equal(si.prepared, 3 + 3, 'int mod + level');
  assert.equal(si.maxSlotLevel, 2);
  const b = R.newCharacter(); b.klass = 'bard'; b.race = 'half-elf'; b.level = 3;
  assert.equal(R.spellInfo(data, b).known, 6);
  const p = R.newCharacter(); p.klass = 'paladin'; p.race = 'human'; p.level = 1;
  assert.equal(R.spellInfo(data, p), null, 'paladins start casting at 2');
  p.level = 4; const sp = R.spellInfo(data, p);
  assert.equal(sp.prepared, Math.max(1, R.mod(R.abilities(data, p).cha) + 2));
  const wl = R.newCharacter(); wl.klass = 'warlock'; wl.race = 'tiefling'; wl.level = 3;
  assert.deepEqual(R.spellInfo(data, wl).slots, [0, 2, 0, 0, 0, 0, 0, 0, 0], 'pact magic');
  assert.equal(R.spellList(data, w, 3).length > 10, true);
  assert.ok(R.spellList(data, w, 1).every((s) => s.classes.includes('wizard')));
});

test('pending lists what still needs choosing and empties when complete', () => {
  const c = R.newCharacter();
  assert.ok(R.pending(data, c).includes('race'));
  assert.ok(R.pending(data, c).includes('class'));
  c.race = 'human'; c.klass = 'fighter';
  const p1 = R.pending(data, c);
  assert.ok(p1.includes('skills') && p1.includes('equipment'));
  c.choices.skills = ['athletics', 'perception'];
  c.choices.languages = ['Elvish', 'Dwarvish', 'Celestial']; // human +1, acolyte +2
  const k = R.klass(data, c);
  k.equipmentChoices.forEach((ec, i) => {
    if (ec.cat) { c.choices.equipment[`${i}:cat`] = data.equipment.cats[ec.cat.id][0]; return; }
    c.choices.equipment[i] = 0;
    if (ec.options[0].cat) c.choices.equipment[`${i}:cat`] = data.equipment.cats[ec.options[0].cat][0];
  });
  assert.deepEqual(R.pending(data, c), [], JSON.stringify(R.pending(data, c)));
  c.level = 4;
  assert.deepEqual(R.pending(data, c), ['asi']);
  c.choices.asi[4] = { str: 1, con: 1 };
  assert.deepEqual(R.pending(data, c), []);
  c.choices.asi[4] = { feat: 'grappler' };
  assert.deepEqual(R.pending(data, c), []);
});

test('equipment resolves fixed lines, options and category picks', () => {
  const c = fighter();
  const k = R.klass(data, c);
  const catIdx = k.equipmentChoices.findIndex((x) => x.options?.some((o) => o.cat) || x.cat);
  assert.ok(catIdx >= 0, 'fighter has a category choice');
  c.choices.equipment[catIdx] = k.equipmentChoices[catIdx].options?.findIndex((o) => o.cat) ?? 0;
  c.choices.equipment[`${catIdx}:cat`] = 'longsword';
  const items = R.equippedItems(data, c);
  assert.ok(items.some((i) => i.name === 'Longsword'));
  const langs = R.languages(data, { ...c, choices: { ...c.choices, languages: ['Elvish'] } });
  assert.ok(langs.includes('Common') && langs.includes('Elvish'));
  const he = R.newCharacter(); he.race = 'elf'; he.subrace = 'high-elf'; he.background = 'acolyte';
  assert.equal(R.languageChoices(data, he), 3, 'acolyte 2 + high elf Extra Language 1');
});

test('i18n: English and Turkish have the same keys', async () => {
  const { STRINGS } = await import('../app/js/i18n.js');
  assert.deepEqual(Object.keys(STRINGS.tr).sort(), Object.keys(STRINGS.en).sort());
});
