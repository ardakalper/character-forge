// UI strings in English and Turkish. Rules text (features, spells) stays in English — it is
// quoted SRD content. A unit test enforces key parity between the two languages.
export const STRINGS = {
  en: {
    'app.title': 'Character Forge', 'app.tagline': 'A 5e-compatible character builder on the SRD. Yours stays in your browser.',
    'nav.abilities': 'Abilities', 'nav.race': 'Race', 'nav.class': 'Class', 'nav.background': 'Background', 'nav.spells': 'Spells', 'nav.gear': 'Gear', 'nav.sheet': 'Sheet',
    'chars.title': 'Characters', 'chars.new': 'New character', 'chars.del': 'Delete', 'chars.export': 'Export', 'chars.import': 'Import', 'chars.unnamed': 'Unnamed hero',
    'set.theme': 'Theme', 'theme.parchment': 'Parchment', 'theme.gothic': 'Gothic', 'theme.cyber': 'Neon', 'set.lang': 'Language',
    'ab.title': 'Ability scores', 'ab.method': 'Method', 'ab.array': 'Standard array', 'ab.points': 'Point buy', 'ab.manual': 'Manual',
    'ab.points.left': '{n} points left', 'ab.racial': 'racial', 'ab.asi': 'ASI', 'ab.final': 'Final', 'ab.mod': 'Mod',
    'ab.hp': 'Hit points per level', 'ab.hp.average': 'Average (recommended)', 'ab.hp.max': 'Maximum',
    'ab.level': 'Level',
    'race.title': 'Race', 'race.subrace': 'Subrace', 'race.traits': 'Traits', 'race.speed': 'Speed', 'race.size': 'Size', 'race.langs': 'Languages',
    'race.pick.skills': 'Choose {n} skill(s)', 'race.pick.langs': 'Choose {n} extra language(s)',
    'class.title': 'Class', 'class.hitdie': 'Hit die', 'class.saves': 'Saving throws', 'class.skills': 'Choose {n} skills',
    'class.expertise': 'Expertise: choose {n} proficient skills to double', 'class.features': 'Features by level', 'class.subclass': 'Subclass at this level',
    'class.asi.title': 'Ability score improvements', 'class.asi.at': 'Level {n}', 'class.asi.hint': '+2 to one ability, +1 to two, or the Grappler feat.',
    'class.asi.feat': 'Feat: Grappler',
    'bg.title': 'Background', 'bg.custom': 'Custom background', 'bg.feature': 'Feature', 'bg.skills': 'Skills', 'bg.equipment': 'Equipment',
    'sp.title': 'Spells', 'sp.none': 'This class does not cast spells (or not yet at this level).',
    'sp.dc': 'Spell save DC', 'sp.atk': 'Spell attack', 'sp.slots': 'Slots', 'sp.cantrips': 'Cantrips: choose {n}',
    'sp.known': 'Spells known: choose {n}', 'sp.prepared': 'Prepared spells: {n} ({how})', 'sp.level': 'Level {n}', 'sp.cantrip': 'Cantrip',
    'sp.ritual': 'ritual', 'sp.conc': 'concentration', 'sp.search': 'Search spells…',
    'gear.title': 'Starting equipment', 'gear.fixed': 'You start with', 'gear.pick': 'Choose', 'gear.pack.contents': 'contents',
    'gear.list': 'Inventory', 'gear.ac': 'Armor class', 'gear.attacks': 'Attacks',
    'sheet.title': 'Character sheet', 'sheet.print': 'Print / PDF', 'sheet.name': 'Character name', 'sheet.player': 'Player',
    'sheet.alignment': 'Alignment', 'sheet.ac': 'Armor Class', 'sheet.init': 'Initiative', 'sheet.speed': 'Speed', 'sheet.hp': 'Hit Points',
    'sheet.hitdice': 'Hit Dice', 'sheet.prof': 'Proficiency', 'sheet.passive': 'Passive Perception', 'sheet.saves': 'Saving Throws', 'sheet.skills': 'Skills',
    'sheet.attacks': 'Attacks', 'sheet.equipment': 'Equipment', 'sheet.features': 'Features & Traits', 'sheet.profs': 'Proficiencies & Languages',
    'sheet.spells': 'Spellcasting', 'sheet.notes': 'Notes', 'sheet.appearance': 'Appearance & Story',
    'todo.title': 'Still to choose', 'todo.none': 'All choices made. The sheet is ready.',
    'todo.race': 'a race', 'todo.subrace': 'a subrace', 'todo.class': 'a class', 'todo.points': 'spend all ability points',
    'todo.skills': 'class skills', 'todo.expertise': 'expertise skills', 'todo.raceSkills': 'racial skill choice', 'todo.languages': 'languages',
    'todo.asi': 'ability score improvements', 'todo.equipment': 'equipment options', 'todo.cantrips': 'cantrips', 'todo.spells': 'spells',
    'msg.saved': 'Saved', 'msg.imported': 'Imported {name}', 'msg.badfile': 'That file could not be read.', 'msg.deleted': 'Deleted', 'msg.confirmdel': 'Delete this character? This cannot be undone.',
    'foot.srd': 'This work includes material from the System Reference Document 5.1 by Wizards of the Coast LLC, licensed under CC-BY-4.0. Independent tool: not affiliated with Wizards of the Coast.',
    'foot.source': 'Source on GitHub',
  },
  tr: {
    'app.title': 'Character Forge', 'app.tagline': "SRD üstüne kurulu, 5e uyumlu karakter oluşturucu. Karakterin tarayıcında kalır.",
    'nav.abilities': 'Yetenekler', 'nav.race': 'Irk', 'nav.class': 'Sınıf', 'nav.background': 'Geçmiş', 'nav.spells': 'Büyüler', 'nav.gear': 'Teçhizat', 'nav.sheet': 'Sayfa',
    'chars.title': 'Karakterler', 'chars.new': 'Yeni karakter', 'chars.del': 'Sil', 'chars.export': 'Dışa aktar', 'chars.import': 'İçe aktar', 'chars.unnamed': 'İsimsiz kahraman',
    'set.theme': 'Tema', 'theme.parchment': 'Parşömen', 'theme.gothic': 'Gotik', 'theme.cyber': 'Neon', 'set.lang': 'Dil',
    'ab.title': 'Yetenek puanları', 'ab.method': 'Yöntem', 'ab.array': 'Standart dizi', 'ab.points': 'Puanla alım', 'ab.manual': 'Elle',
    'ab.points.left': '{n} puan kaldı', 'ab.racial': 'ırk', 'ab.asi': 'ASI', 'ab.final': 'Son', 'ab.mod': 'Mod',
    'ab.hp': 'Seviye başına can', 'ab.hp.average': 'Ortalama (önerilen)', 'ab.hp.max': 'En yüksek',
    'ab.level': 'Seviye',
    'race.title': 'Irk', 'race.subrace': 'Alt ırk', 'race.traits': 'Özellikler', 'race.speed': 'Hız', 'race.size': 'Boy', 'race.langs': 'Diller',
    'race.pick.skills': '{n} beceri seç', 'race.pick.langs': '{n} ek dil seç',
    'class.title': 'Sınıf', 'class.hitdie': 'Can zarı', 'class.saves': 'Kurtarma zarları', 'class.skills': '{n} beceri seç',
    'class.expertise': 'Uzmanlık: iki katına çıkacak {n} beceri seç', 'class.features': 'Seviyeye göre özellikler', 'class.subclass': 'Bu seviyede alt sınıf',
    'class.asi.title': 'Yetenek puanı artışları', 'class.asi.at': 'Seviye {n}', 'class.asi.hint': 'Bir yeteneğe +2, iki yeteneğe +1 ya da Grappler yetisi.',
    'class.asi.feat': 'Yeti: Grappler',
    'bg.title': 'Geçmiş', 'bg.custom': 'Özel geçmiş', 'bg.feature': 'Özellik', 'bg.skills': 'Beceriler', 'bg.equipment': 'Teçhizat',
    'sp.title': 'Büyüler', 'sp.none': 'Bu sınıf büyü yapmaz (ya da bu seviyede henüz yapmaz).',
    'sp.dc': 'Büyü kurtarma DC', 'sp.atk': 'Büyü saldırısı', 'sp.slots': 'Slotlar', 'sp.cantrips': 'Cantrip: {n} seç',
    'sp.known': 'Bilinen büyü: {n} seç', 'sp.prepared': 'Hazırlanan büyü: {n} ({how})', 'sp.level': 'Seviye {n}', 'sp.cantrip': 'Cantrip',
    'sp.ritual': 'ritüel', 'sp.conc': 'konsantrasyon', 'sp.search': 'Büyü ara…',
    'gear.title': 'Başlangıç teçhizatı', 'gear.fixed': 'Şununla başlarsın', 'gear.pick': 'Seç', 'gear.pack.contents': 'içindekiler',
    'gear.list': 'Envanter', 'gear.ac': 'Zırh sınıfı', 'gear.attacks': 'Saldırılar',
    'sheet.title': 'Karakter sayfası', 'sheet.print': 'Yazdır / PDF', 'sheet.name': 'Karakter adı', 'sheet.player': 'Oyuncu',
    'sheet.alignment': 'Yönelim', 'sheet.ac': 'Zırh Sınıfı', 'sheet.init': 'İnisiyatif', 'sheet.speed': 'Hız', 'sheet.hp': 'Can Puanı',
    'sheet.hitdice': 'Can Zarları', 'sheet.prof': 'Yetkinlik', 'sheet.passive': 'Pasif Algı', 'sheet.saves': 'Kurtarma Zarları', 'sheet.skills': 'Beceriler',
    'sheet.attacks': 'Saldırılar', 'sheet.equipment': 'Teçhizat', 'sheet.features': 'Özellikler', 'sheet.profs': 'Yetkinlikler ve Diller',
    'sheet.spells': 'Büyücülük', 'sheet.notes': 'Notlar', 'sheet.appearance': 'Görünüş ve Hikâye',
    'todo.title': 'Seçilmesi kalanlar', 'todo.none': 'Tüm seçimler tamam. Sayfa hazır.',
    'todo.race': 'bir ırk', 'todo.subrace': 'bir alt ırk', 'todo.class': 'bir sınıf', 'todo.points': 'tüm yetenek puanlarını harca',
    'todo.skills': 'sınıf becerileri', 'todo.expertise': 'uzmanlık becerileri', 'todo.raceSkills': 'ırk beceri seçimi', 'todo.languages': 'diller',
    'todo.asi': 'yetenek puanı artışları', 'todo.equipment': 'teçhizat seçenekleri', 'todo.cantrips': 'cantripler', 'todo.spells': 'büyüler',
    'msg.saved': 'Kaydedildi', 'msg.imported': '{name} içe aktarıldı', 'msg.badfile': 'Bu dosya okunamadı.', 'msg.deleted': 'Silindi', 'msg.confirmdel': 'Bu karakter silinsin mi? Geri alınamaz.',
    'foot.srd': "Bu çalışma Wizards of the Coast LLC'nin System Reference Document 5.1 içeriğini CC-BY-4.0 lisansıyla kullanır. Bağımsız araçtır, Wizards of the Coast ile ilgisi yoktur.",
    'foot.source': "GitHub'da kaynak",
  },
};
let lang = 'en';
export function setLang(l) { lang = STRINGS[l] ? l : 'en'; document.documentElement.lang = lang; }
export function getLang() { return lang; }
export function t(key, vars) {
  let s = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
export function applyI18n(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-ph]')) el.placeholder = t(el.dataset.i18nPh);
}
export function detectLang() { return (navigator.language || 'en').toLowerCase().startsWith('tr') ? 'tr' : 'en'; }
