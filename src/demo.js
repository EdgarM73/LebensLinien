// Beispieldaten, damit sich der Renderer ohne Gramps-Zugang testen lässt.
export const demoModel = {
  person: { name: 'Max Mustermann', first: 'Max', birth: 1962.4, death: null, gender: 1 },
  endT: 2026.8,
  members: [
    { id: 'a', name: 'Karl', rel: 'Opa', group: 0, start: 1962.4, end: 1981.2, exit: 'star', initial: true },
    { id: 'b', name: 'Anna', rel: 'Oma', group: 0, start: 1962.4, end: 1995.6, exit: 'star', initial: true },
    { id: 'c', name: 'Heinz', rel: 'Vater', group: 1, start: 1962.4, end: 2009.3, exit: 'star', initial: true },
    { id: 'd', name: 'Ilse', rel: 'Mutter', group: 1, start: 1962.4, end: null, exit: null, initial: true },
    { id: 'e', name: 'Petra', rel: 'Schwester', group: 2, start: 1965.7, end: null, exit: null, initial: false },
    { id: 'f', name: 'Uwe', rel: 'Bruder', group: 2, start: 1968.1, end: 1991.5, exit: 'star', initial: false },
    { id: 'g', name: 'Sabine', rel: 'Ehefrau', group: 3, start: 1989.5, end: 2004.2, exit: 'drift', initial: false },
    { id: 'h', name: 'Julia', rel: 'Ehefrau', group: 3, start: 2008.6, end: null, exit: null, initial: false },
    { id: 'i', name: 'Tim', rel: 'Sohn', group: 4, start: 1992.3, end: null, exit: null, initial: false },
    { id: 'j', name: 'Lena', rel: 'Tochter', group: 4, start: 1995.9, end: null, exit: null, initial: false },
    { id: 'k', name: 'Emil', rel: 'Enkel', group: 5, start: 2021.2, end: null, exit: null, initial: false },
    { id: 'n1', name: 'Nina', rel: 'Schwiegertochter', relKey: 'daughterInLaw', group: 7, start: 2017.3, end: null, exit: null, initial: false },
    { id: 'n2', name: 'Tom', rel: 'Schwiegersohn', relKey: 'sonInLaw', group: 7, start: 2019.6, end: null, exit: null, initial: false },
    { id: 'x1', name: 'Peter', rel: 'Freund', group: 6, start: 1970.5, end: null, exit: null, initial: false },
    { id: 'x2', name: 'Birgit', rel: 'Kollegin', group: 6, start: 1988.3, end: 2012.4, exit: 'drift', initial: false },
    { id: 'x3', name: 'Jonas', rel: 'Freund', group: 6, start: 1995.1, end: 2018.6, exit: 'star', initial: false },
  ],
  warnings: [],
};

// Bezeichnungen als Schlüssel, damit die Demo in jeder Sprache läuft (siehe i18n.js)
const KEY_OF = { Opa: 'grandfather', Oma: 'grandmother', Vater: 'father', Mutter: 'mother', Schwester: 'sister', Bruder: 'brother', Ehefrau: 'wife', Sohn: 'son', Tochter: 'daughter', Enkel: 'grandson', Freund: 'friend', Kollegin: 'colleague' };
for (const m of demoModel.members) if (KEY_OF[m.rel]) m.relKey = KEY_OF[m.rel];
