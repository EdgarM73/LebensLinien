// Alle sichtbaren Texte des Videos je Sprache. Neue Sprache = einfach einen Block ergänzen.
export const LANGS = {
  de: {
    name: 'Deutsch',
    me: 'Ich', age: 'Alter', friend: 'Freund',
    title: 'Das Leben ist eine Reise',
    lines: ['Manche gehen ein Stück mit dir…', 'Andere bleiben für immer an deinem Himmel…'],
    rel: {
      grandfather: 'Opa', grandmother: 'Oma', father: 'Vater', mother: 'Mutter',
      brother: 'Bruder', sister: 'Schwester', sibling: 'Geschwister', husband: 'Ehemann', wife: 'Ehefrau', partner: 'Partner',
      son: 'Sohn', daughter: 'Tochter', child: 'Kind', grandson: 'Enkel', granddaughter: 'Enkelin', grandchild: 'Enkelkind',
      sonInLaw: 'Schwiegersohn', daughterInLaw: 'Schwiegertochter',
      friend: 'Freund', colleague: 'Kollege',
    },
  },
  en: {
    name: 'English',
    me: 'Me', age: 'Age', friend: 'Friend',
    title: 'Life is a journey',
    lines: ['Some walk with you for a while…', 'Others stay in your sky forever…'],
    rel: {
      grandfather: 'Grandpa', grandmother: 'Grandma', father: 'Dad', mother: 'Mom',
      brother: 'Brother', sister: 'Sister', sibling: 'Sibling', husband: 'Husband', wife: 'Wife', partner: 'Partner',
      son: 'Son', daughter: 'Daughter', child: 'Child', grandson: 'Grandson', granddaughter: 'Granddaughter', grandchild: 'Grandchild',
      sonInLaw: 'Son-in-law', daughterInLaw: 'Daughter-in-law',
      friend: 'Friend', colleague: 'Colleague',
    },
  },
  tr: {
    name: 'Türkçe',
    me: 'Ben', age: 'Yaş', friend: 'Arkadaş',
    title: 'Hayat bir yolculuktur',
    lines: ['Bazıları bir süre seninle yürür…', 'Bazıları ise göğünde sonsuza dek kalır…'],
    rel: {
      grandfather: 'Büyükbaba', grandmother: 'Büyükanne', father: 'Baba', mother: 'Anne',
      brother: 'Erkek kardeş', sister: 'Kız kardeş', sibling: 'Kardeş', husband: 'Eş', wife: 'Eş', partner: 'Partner',
      son: 'Oğul', daughter: 'Kız', child: 'Çocuk', grandson: 'Erkek torun', granddaughter: 'Kız torun', grandchild: 'Torun',
      sonInLaw: 'Damat', daughterInLaw: 'Gelin',
      friend: 'Arkadaş', colleague: 'İş arkadaşı',
    },
  },
  bs: {
    name: 'Bosanski',
    me: 'Ja', age: 'Dob', friend: 'Prijatelj',
    title: 'Život je putovanje',
    lines: ['Neki hodaju s tobom neko vrijeme…', 'Drugi ostaju zauvijek na tvom nebu…'],
    rel: {
      grandfather: 'Djed', grandmother: 'Nana', father: 'Otac', mother: 'Majka',
      brother: 'Brat', sister: 'Sestra', sibling: 'Brat/sestra', husband: 'Muž', wife: 'Žena', partner: 'Partner',
      son: 'Sin', daughter: 'Kćerka', child: 'Dijete', grandson: 'Unuk', granddaughter: 'Unuka', grandchild: 'Unuče',
      sonInLaw: 'Zet', daughterInLaw: 'Snaha',
      friend: 'Prijatelj', colleague: 'Kolega',
    },
  },
};

/** Übersetzt die Bezeichnungen im Modell (nach "relKey") in die gewählte Sprache. */
export function localize(model, code) {
  const t = LANGS[code];
  model.labels = { me: t.me };
  for (const m of model.members) {
    if (m.relKey) m.rel = t.rel[m.relKey] || m.rel;
    else if (typeof m.rel === 'string' && ['friend', 'colleague'].includes(m.rel)) m.rel = t.rel[m.rel];   // "rel": "friend" -> Freund/Friend/Arkadaş/Prijatelj
    else if (m.rel && typeof m.rel === 'object') m.rel = m.rel[code] || Object.values(m.rel)[0];   // "rel": {"de": "Freund", "tr": "Arkadaş"}
    else if (!m.rel) m.rel = t.friend;
  }
  return t;
}
