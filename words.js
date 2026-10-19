// Woordenlijst opgebouwd volgens Lijn 3 (Malmberg) voor Groep 3 (SBO)
// Elk woord heeft een duidelijk, kindvriendelijk icoon/illustratie, categorie en Lijn 3 niveau:
// - niveau 1: Thema 1 t/m 3 (korte klankzuivere woorden: mkm, tweeletterklanken aa, ee, oo, oe, ij, eu, ie)
// - niveau 2: Thema 4 t/m 6 (alle tweeletterklanken incl. ui, uu, ei, ou, au + sch/ng/nk en eenvoudige tweeklanken)
// - niveau 3: Thema 7+ (woorden met 4-5 letters, medeklinkerclusters zoals boom, broek, trein, slang, stoel)

const WORDS_DATA = [
  // === NIVEAU 1: Thema 1 - 3 (Eenvoudige MKM-woorden, hele bekende begrippen) ===
  { word: "aap", level: 1, theme: "Dieren", emoji: "🐒", bg: "#FFE8CC" },
  { word: "vis", level: 1, theme: "Dieren", emoji: "🐟", bg: "#D0EBFF" },
  { word: "poes", level: 1, theme: "Dieren", emoji: "🐱", bg: "#FFE3E3" },
  { word: "kip", level: 1, theme: "Dieren", emoji: "🐔", bg: "#FFF3BF" },
  { word: "koe", level: 1, theme: "Dieren", emoji: "🐄", bg: "#E5F9E0" },
  { word: "bij", level: 1, theme: "Dieren", emoji: "🐝", bg: "#FFF9DB" },
  { word: "mier", level: 1, theme: "Dieren", emoji: "🐜", bg: "#FFE8CC" },
  { word: "mug", level: 1, theme: "Dieren", emoji: "🦟", bg: "#E9ECEF" },
  { word: "rat", level: 1, theme: "Dieren", emoji: "🐀", bg: "#E9ECEF" },
  { word: "worm", level: 2, theme: "Dieren", emoji: "🪱", bg: "#FFE3E3" },
  { word: "vos", level: 1, theme: "Dieren", emoji: "🦊", bg: "#FFE8CC" },
  { word: "mol", level: 1, theme: "Dieren", emoji: "🦫", bg: "#E6FCF5" },

  { word: "maan", level: 1, theme: "Natuur", emoji: "🌙", bg: "#E5DBFF" },
  { word: "zon", level: 1, theme: "Natuur", emoji: "☀️", bg: "#FFF3BF" },
  { word: "boom", level: 1, theme: "Natuur", emoji: "🌳", bg: "#D3F9D8" },
  { word: "roos", level: 1, theme: "Natuur", emoji: "🌹", bg: "#FFE3E3" },
  { word: "tak", level: 1, theme: "Natuur", emoji: "🌿", customSvg: "tak", bg: "#EBFBEE" },
  { word: "zee", level: 1, theme: "Natuur", emoji: "🌊", bg: "#D0EBFF" },

  { word: "peer", level: 1, theme: "Eten", emoji: "🍐", bg: "#EBFBEE" },
  { word: "noot", level: 1, theme: "Eten", emoji: "🥜", bg: "#FFE8CC" },
  { word: "kaas", level: 1, theme: "Eten", emoji: "🧀", bg: "#FFF3BF" },
  { word: "soep", level: 1, theme: "Eten", emoji: "🥣", bg: "#FFE8CC" },
  { word: "koek", level: 1, theme: "Eten", emoji: "🍪", bg: "#FFF3BF" },
  { word: "ijs", level: 1, theme: "Eten", emoji: "🍦", bg: "#FFE3E3" },
  { word: "sap", level: 1, theme: "Eten", emoji: "🧃", bg: "#FFE8CC" },
  { word: "peen", level: 1, theme: "Eten", emoji: "🥕", bg: "#FFE8CC" },
  { word: "bes", level: 1, theme: "Eten", emoji: "🫐", bg: "#E5DBFF" },
  { word: "mais", level: 2, theme: "Eten", emoji: "🌽", bg: "#FFF9DB" },

  { word: "bus", level: 1, theme: "Vervoer", emoji: "🚌", bg: "#FFF3BF" },
  { word: "boot", level: 1, theme: "Vervoer", emoji: "⛵", bg: "#D0EBFF" },
  { word: "kar", level: 1, theme: "Vervoer", emoji: "🛒", bg: "#E6FCF5" },
  { word: "wiel", level: 1, theme: "Vervoer", emoji: "🛞", bg: "#E9ECEF" },

  { word: "sok", level: 1, theme: "Kleding", emoji: "🧦", bg: "#FFE3E3" },
  { word: "jas", level: 1, theme: "Kleding", emoji: "🧥", bg: "#D0EBFF" },
  { word: "pet", level: 1, theme: "Kleding", emoji: "🧢", bg: "#D0EBFF" },
  { word: "tas", level: 1, theme: "Kleding", emoji: "🎒", bg: "#FFE8CC" },
  { word: "riem", level: 1, theme: "Kleding", emoji: "🪢", customSvg: "riem", bg: "#FFE8CC" },
  { word: "rok", level: 1, theme: "Kleding", emoji: "👗", customSvg: "rok", bg: "#FFE3E3" },

  { word: "pen", level: 1, theme: "Spullen", emoji: "🖊️", bg: "#D0EBFF" },
  { word: "mes", level: 1, theme: "Spullen", emoji: "🍴", customSvg: "mes", bg: "#E9ECEF" },
  { word: "pan", level: 1, theme: "Spullen", emoji: "🍳", bg: "#FFE8CC" },
  { word: "pot", level: 1, theme: "Spullen", emoji: "🍯", bg: "#FFF3BF" },
  { word: "deur", level: 1, theme: "Huis", emoji: "🚪", bg: "#FFE8CC" },
  { word: "raam", level: 1, theme: "Huis", emoji: "🪟", bg: "#D0EBFF" },
  { word: "bed", level: 1, theme: "Huis", emoji: "🛏️", bg: "#E5DBFF" },
  { word: "dak", level: 1, theme: "Huis", emoji: "🏠", customSvg: "dak", bg: "#FFE3E3" },
  { word: "bel", level: 1, theme: "Spullen", emoji: "🔔", bg: "#FFF3BF" },
  { word: "bal", level: 1, theme: "Spelen", emoji: "⚽", bg: "#D3F9D8" },
  { word: "pop", level: 1, theme: "Spelen", emoji: "🪆", bg: "#FFE3E3" },
  { word: "boek", level: 1, theme: "School", emoji: "📖", bg: "#D0EBFF" },
  { word: "doos", level: 1, theme: "Spullen", emoji: "📦", bg: "#FFE8CC" },
  { word: "vaas", level: 1, theme: "Huis", emoji: "🏺", bg: "#FFE3E3" },
  { word: "kam", level: 1, theme: "Spullen", emoji: "🪮", bg: "#E5DBFF" },
  { word: "zaag", level: 1, theme: "Spullen", emoji: "🪚", bg: "#FFE8CC" },
  { word: "bijl", level: 1, theme: "Spullen", emoji: "🪓", bg: "#FFE3E3" },
  { word: "veer", level: 1, theme: "Natuur", emoji: "🪶", bg: "#D0EBFF" },

  { word: "neus", level: 1, theme: "Lichaam", emoji: "👃", bg: "#FFE8CC" },
  { word: "voet", level: 1, theme: "Lichaam", emoji: "🦶", bg: "#FFE8CC" },
  { word: "been", level: 1, theme: "Lichaam", emoji: "🦵", bg: "#FFE8CC" },
  { word: "oor", level: 1, theme: "Lichaam", emoji: "👂", bg: "#FFE8CC" },
  { word: "oog", level: 1, theme: "Lichaam", emoji: "👁️", bg: "#D0EBFF" },
  { word: "kin", level: 1, theme: "Lichaam", emoji: "🧔", customSvg: "kin", bg: "#FFE8CC" },

  // === NIVEAU 2: Thema 4 - 6 (ui, uu, ei, ou, au, f, g, l + eenvoudige woorden) ===
  { word: "uil", level: 2, theme: "Dieren", emoji: "🦉", bg: "#FFE8CC" },
  { word: "muis", level: 2, theme: "Dieren", emoji: "🐭", bg: "#E9ECEF" },
  { word: "duif", level: 2, theme: "Dieren", emoji: "🕊️", bg: "#D0EBFF" },
  { word: "geit", level: 2, theme: "Dieren", emoji: "🐐", bg: "#F8F9FA" },
  { word: "haai", level: 2, theme: "Dieren", emoji: "🦈", bg: "#D0EBFF" },
  { word: "hond", level: 2, theme: "Dieren", emoji: "🐶", bg: "#FFE8CC" },
  { word: "beer", level: 1, theme: "Dieren", emoji: "🐻", bg: "#FFE8CC" },
  { word: "haas", level: 1, theme: "Dieren", emoji: "🐇", bg: "#F3F0FF" },
  { word: "rups", level: 2, theme: "Dieren", emoji: "🐛", bg: "#D3F9D8" },
  { word: "spin", level: 2, theme: "Dieren", emoji: "🕷️", bg: "#E9ECEF" },
  { word: "slak", level: 2, theme: "Dieren", emoji: "🐌", bg: "#FFE8CC" },
  { word: "kikker", level: 3, theme: "Dieren", emoji: "🐸", bg: "#D3F9D8" },
  { word: "varken", level: 3, theme: "Dieren", emoji: "🐷", bg: "#FFE3E3" },

  { word: "huis", level: 2, theme: "Huis", emoji: "🏡", bg: "#D3F9D8" },
  { word: "vuur", level: 2, theme: "Natuur", emoji: "🔥", bg: "#FFE3E3" },
  { word: "muur", level: 2, theme: "Huis", emoji: "🧱", bg: "#FFE8CC" },
  { word: "hout", level: 2, theme: "Natuur", emoji: "🪵", bg: "#FFE8CC" },
  { word: "touw", level: 2, theme: "Spullen", emoji: "🪢", bg: "#FFF3BF" },
  { word: "zeep", level: 2, theme: "Huis", emoji: "🧼", bg: "#D0EBFF" },
  { word: "lepel", level: 3, theme: "Spullen", emoji: "🥄", bg: "#E9ECEF" },
  { word: "vork", level: 2, theme: "Spullen", emoji: "🍴", customSvg: "vork", bg: "#E9ECEF" },
  { word: "klok", level: 2, theme: "Huis", emoji: "🕰️", bg: "#FFF3BF" },
  { word: "lamp", level: 2, theme: "Huis", emoji: "💡", bg: "#FFF9DB" },
  { word: "bank", level: 2, theme: "Huis", emoji: "🛋️", bg: "#FFE3E3" },
  { word: "tent", level: 2, theme: "Spelen", emoji: "⛺", bg: "#D3F9D8" },
  { word: "ring", level: 2, theme: "Spullen", emoji: "💍", bg: "#FFF3BF" },
  { word: "hand", level: 2, theme: "Lichaam", emoji: "✋", bg: "#FFE8CC" },
  { word: "mond", level: 2, theme: "Lichaam", emoji: "👄", bg: "#FFE3E3" },
  { word: "tand", level: 2, theme: "Lichaam", emoji: "🦷", bg: "#F8F9FA" },
  { word: "buik", level: 2, theme: "Lichaam", emoji: "👕", customSvg: "buik", bg: "#FFE8CC" },
  { word: "duim", level: 2, theme: "Lichaam", emoji: "👍", bg: "#FFE8CC" },
  { word: "hart", level: 2, theme: "Lichaam", emoji: "❤️", bg: "#FFE3E3" },

  // === NIVEAU 3: Thema 7+ (Medeklinkerclusters: mkmm, mmkm, 4-5 letters) ===
  { word: "fiets", level: 3, theme: "Vervoer", emoji: "🚲", bg: "#D0EBFF" },
  { word: "trein", level: 3, theme: "Vervoer", emoji: "🚂", bg: "#FFE3E3" },
  { word: "step", level: 3, theme: "Vervoer", emoji: "🛴", bg: "#D3F9D8" },
  { word: "slee", level: 3, theme: "Vervoer", emoji: "🛷", bg: "#D0EBFF" },
  { word: "auto", level: 3, theme: "Vervoer", emoji: "🚗", bg: "#FFE3E3" },

  { word: "stoel", level: 3, theme: "Huis", emoji: "🪑", bg: "#FFE8CC" },
  { word: "broek", level: 3, theme: "Kleding", emoji: "👖", bg: "#D0EBFF" },
  { word: "schoen", level: 3, theme: "Kleding", emoji: "👟", bg: "#FFE3E3" },
  { word: "kroon", level: 3, theme: "Spullen", emoji: "👑", bg: "#FFF3BF" },
  { word: "vlag", level: 3, theme: "Spullen", emoji: "🚩", bg: "#FFE3E3" },
  { word: "ster", level: 3, theme: "Natuur", emoji: "⭐", bg: "#FFF3BF" },
  { word: "wolk", level: 3, theme: "Natuur", emoji: "☁️", bg: "#D0EBFF" },
  { word: "bloem", level: 3, theme: "Natuur", emoji: "🌻", bg: "#FFF3BF" },
  { word: "blad", level: 3, theme: "Natuur", emoji: "🍃", bg: "#D3F9D8" },
  { word: "gras", level: 3, theme: "Natuur", emoji: "🌱", bg: "#D3F9D8" },
  { word: "slang", level: 3, theme: "Dieren", emoji: "🐍", bg: "#D3F9D8" },
  { word: "krab", level: 3, theme: "Dieren", emoji: "🦀", bg: "#FFE3E3" },
  { word: "zwaan", level: 3, theme: "Dieren", emoji: "🦢", bg: "#F8F9FA" },
  { word: "leeuw", level: 3, theme: "Dieren", emoji: "🦁", bg: "#FFE8CC" },
  { word: "paard", level: 3, theme: "Dieren", emoji: "🐴", bg: "#FFE8CC" },
  { word: "schaap", level: 3, theme: "Dieren", emoji: "🐑", bg: "#F8F9FA" },

  { word: "brood", level: 3, theme: "Eten", emoji: "🍞", bg: "#FFE8CC" },
  { word: "taart", level: 3, theme: "Eten", emoji: "🎂", bg: "#FFE3E3" },
  { word: "druif", level: 3, theme: "Eten", emoji: "🍇", bg: "#E5DBFF" },
  { word: "melk", level: 3, theme: "Eten", emoji: "🥛", bg: "#D0EBFF" },
  { word: "kers", level: 3, theme: "Eten", emoji: "🍒", bg: "#FFE3E3" },
  { word: "friet", level: 3, theme: "Eten", emoji: "🍟", bg: "#FFF3BF" },

  { word: "trom", level: 3, theme: "Spelen", emoji: "🥁", bg: "#FFE3E3" },
  { word: "fluit", level: 3, theme: "Spelen", emoji: "🪈", bg: "#FFF3BF" },
  { word: "kwast", level: 3, theme: "School", emoji: "🖌️", bg: "#FFE8CC" },
  { word: "schaar", level: 3, theme: "School", emoji: "✂️", bg: "#FFE3E3" },
  { word: "bril", level: 3, theme: "Kleding", emoji: "👓", bg: "#D0EBFF" },
  { word: "jurk", level: 3, theme: "Kleding", emoji: "👗", bg: "#E5DBFF" },
  { word: "muts", level: 2, theme: "Kleding", emoji: "🧶", customSvg: "muts", bg: "#FFE3E3" },
  { word: "zeil", level: 2, theme: "Vervoer", emoji: "⛵", customSvg: "zeil", bg: "#D0EBFF" }
];

// Aangepaste SVG-illustraties voor woorden waarvan een emoji niet eenduidig genoeg is
const CUSTOM_SVGS = {
  tak: `<svg viewBox="0 0 120 120" width="100%" height="100%">
    <path d="M18 88 Q55 65 98 34" fill="none" stroke="#8B4513" stroke-width="10" stroke-linecap="round"/>
    <path d="M52 66 Q45 42 30 34" fill="none" stroke="#8B4513" stroke-width="7" stroke-linecap="round"/>
    <path d="M72 52 Q86 56 98 68" fill="none" stroke="#8B4513" stroke-width="6" stroke-linecap="round"/>
    <path d="M30 34 C18 28 22 14 36 20 C44 24 40 36 30 34 Z" fill="#51CF66" stroke="#2B8A3E" stroke-width="3"/>
    <path d="M98 34 C104 20 116 24 110 38 C106 46 94 42 98 34 Z" fill="#51CF66" stroke="#2B8A3E" stroke-width="3"/>
  </svg>`,
  rok: `<svg viewBox="0 0 120 120" width="100%" height="100%">
    <rect x="38" y="24" width="44" height="14" rx="4" fill="#E64980" stroke="#A61E4D" stroke-width="4"/>
    <polygon points="38,38 82,38 100,94 20,94" fill="#FF8787" stroke="#A61E4D" stroke-width="4" stroke-linejoin="round"/>
    <line x1="50" y1="38" x2="40" y2="94" stroke="#A61E4D" stroke-width="3" opacity="0.5"/>
    <line x1="70" y1="38" x2="80" y2="94" stroke="#A61E4D" stroke-width="3" opacity="0.5"/>
  </svg>`,
  riem: `<svg viewBox="0 0 120 120" width="100%" height="100%">
    <rect x="10" y="46" width="100" height="28" rx="6" fill="#8B4513" stroke="#5C2E0B" stroke-width="4"/>
    <rect x="40" y="40" width="30" height="40" rx="6" fill="none" stroke="#FFD43B" stroke-width="8"/>
    <line x1="55" y1="60" x2="72" y2="60" stroke="#FFD43B" stroke-width="6" stroke-linecap="round"/>
    <circle cx="85" cy="60" r="3.5" fill="#3E1F07"/>
    <circle cx="97" cy="60" r="3.5" fill="#3E1F07"/>
  </svg>`,
  mes: `<svg viewBox="0 0 120 120" width="100%" height="100%">
    <g transform="rotate(-35 60 60)">
      <path d="M55 15 C72 15 76 40 74 68 L55 68 Z" fill="#DEE2E6" stroke="#495057" stroke-width="4" stroke-linejoin="round"/>
      <rect x="52" y="68" width="16" height="38" rx="6" fill="#E8590C" stroke="#495057" stroke-width="4"/>
      <circle cx="60" cy="79" r="2.5" fill="#FFF"/>
      <circle cx="60" cy="93" r="2.5" fill="#FFF"/>
    </g>
  </svg>`,
  vork: `<svg viewBox="0 0 120 120" width="100%" height="100%">
    <g transform="rotate(-35 60 60)">
      <path d="M46 18 L46 48 C46 58 74 58 74 48 L74 18 M55 18 L55 46 M65 18 L65 46" fill="none" stroke="#495057" stroke-width="5" stroke-linecap="round"/>
      <rect x="53" y="55" width="14" height="46" rx="6" fill="#339AF0" stroke="#495057" stroke-width="4"/>
    </g>
  </svg>`,
  dak: `<svg viewBox="0 0 120 120" width="100%" height="100%">
    <rect x="26" y="62" width="68" height="42" fill="#F1F3F5" stroke="#ADB5BD" stroke-width="3" stroke-dasharray="4 4"/>
    <polygon points="12,64 60,20 108,64" fill="#FA5252" stroke="#C92A2A" stroke-width="5" stroke-linejoin="round"/>
    <path d="M60 8 L60 17 M45 14 L52 21 M75 14 L68 21" stroke="#FA5252" stroke-width="4" stroke-linecap="round"/>
  </svg>`,
  kin: `<svg viewBox="0 0 120 120" width="100%" height="100%">
    <circle cx="60" cy="52" r="34" fill="#FFD8A8" stroke="#D9480F" stroke-width="4"/>
    <circle cx="48" cy="44" r="4" fill="#343A40"/>
    <circle cx="72" cy="44" r="4" fill="#343A40"/>
    <path d="M48 62 Q60 72 72 62" fill="none" stroke="#343A40" stroke-width="4" stroke-linecap="round"/>
    <circle cx="60" cy="81" r="9" fill="#FF8787" opacity="0.7"/>
    <path d="M22 96 L45 84 M38 78 L46 84 L41 92" fill="none" stroke="#E03131" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  buik: `<svg viewBox="0 0 120 120" width="100%" height="100%">
    <rect x="34" y="20" width="52" height="32" rx="8" fill="#4DABF7" stroke="#1971C2" stroke-width="4"/>
    <ellipse cx="60" cy="72" rx="30" ry="26" fill="#FFD8A8" stroke="#D9480F" stroke-width="4"/>
    <circle cx="60" cy="76" r="3.5" fill="#D9480F"/>
    <path d="M16 72 L26 72 M21 66 L27 72 L21 78" fill="none" stroke="#E03131" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  muts: `<svg viewBox="0 0 120 120" width="100%" height="100%">
    <circle cx="60" cy="22" r="12" fill="#FFD43B" stroke="#F08C00" stroke-width="4"/>
    <path d="M26 82 C26 42 94 42 94 82 Z" fill="#FA5252" stroke="#C92A2A" stroke-width="4"/>
    <path d="M36 62 Q60 56 84 62" fill="none" stroke="#FFD43B" stroke-width="6" stroke-linecap="round"/>
    <rect x="20" y="76" width="80" height="20" rx="8" fill="#FFD43B" stroke="#F08C00" stroke-width="4"/>
  </svg>`,
  zeil: `<svg viewBox="0 0 120 120" width="100%" height="100%">
    <path d="M24 90 L96 90 L84 104 L36 104 Z" fill="#CED4DA" stroke="#868E96" stroke-width="3"/>
    <line x1="56" y1="16" x2="56" y2="90" stroke="#495057" stroke-width="5" stroke-linecap="round"/>
    <polygon points="58,20 96,82 58,82" fill="#FF6B6B" stroke="#C92A2A" stroke-width="4" stroke-linejoin="round"/>
    <polygon points="54,28 26,82 54,82" fill="#FFD43B" stroke="#F08C00" stroke-width="4" stroke-linejoin="round"/>
  </svg>`
};
