/* =====================================================================
   Lepel Family Timeline — DATA
   Drives the cards rail (left), the persistent atlas map (right),
   captions, chapter markers, era band, and audio-cued effects.
   Timings are calibrated against the actual SRT transcript.
   ===================================================================== */

const TRACKS = [
  { id: 'betourne', label: 'Bétourné · Bétourney',     sub: 'Picardy → Quebec → Massachusetts',                       color: '#D89346', dark: '#8B4A1A', tint: 'rgba(216,147,70,0.18)' },
  { id: 'mongeau',  label: 'Mongeau dit Clermont',     sub: 'Auvergne → Quebec → Massachusetts',                      color: '#9B6CA0', dark: '#3D1F3B', tint: 'rgba(155,108,160,0.18)' },
  { id: 'heppell',  label: 'Heppell · Lepel',          sub: 'Rhineland → New York → Quebec → Massachusetts',          color: '#5D8DC0', dark: '#1F3050', tint: 'rgba(93,141,192,0.18)' },
  { id: 'barbeau',  label: 'Barbeau dit Boisdoré',     sub: 'Nouvelle France → Napierville → Massachusetts',          color: '#6FA973', dark: '#1F3A26', tint: 'rgba(111,169,115,0.18)' },
  { id: 'history',  label: 'World & New World events', sub: 'history that bent the family',                           color: '#D4A04A', dark: '#5D4D2E', tint: 'rgba(212,160,74,0.18)' },
];

const YEAR_MIN = 1604, YEAR_MAX = 2026;

const ACTS = [
  { id: 1, start: 0,    end: 247,  yearStart: 1604, yearEnd: 1665, title: 'Origins',                 sub: 'Europe, before the crossings' },
  { id: 2, start: 247,  end: 654,  yearStart: 1665, yearEnd: 1763, title: 'The Crossings',           sub: 'Carignan-Salières · the Atlantic · New France' },
  { id: 3, start: 654,  end: 855,  yearStart: 1763, yearEnd: 1854, title: 'Conquest & Migration',    sub: 'British rule · revolution · the Saint Lawrence' },
  { id: 4, start: 855,  end: 1260, yearStart: 1854, yearEnd: 1931, title: 'Napierville & the Mills', sub: 'Three lines converge · the trains south' },
  { id: 5, start: 1260, end: 1585, yearStart: 1931, yearEnd: 2026, title: 'Massachusetts to Now',    sub: 'Four lines become one · the circle closes' },
];

/* Year-at-time mapping (still used for caption math; cards key off `t`) */
const audioCues = [
  { t: 0, year: 1604 }, { t: 74, year: 1604 }, { t: 115, year: 1660 }, { t: 134, year: 1635 },
  { t: 141, year: 1615 }, { t: 158, year: 1736 }, { t: 188, year: 1707 }, { t: 247, year: 1665 },
  { t: 274, year: 1665 }, { t: 330, year: 1666 }, { t: 389, year: 1669 }, { t: 419, year: 1656 },
  { t: 536, year: 1750 }, { t: 579, year: 1707 }, { t: 608, year: 1753 }, { t: 654, year: 1763 },
  { t: 691, year: 1790 }, { t: 752, year: 1801 }, { t: 855, year: 1854 }, { t: 924, year: 1870 },
  { t: 969, year: 1880 }, { t: 1041, year: 1887 }, { t: 1128, year: 1898 }, { t: 1175, year: 1911 },
  { t: 1260, year: 1931 }, { t: 1378, year: 1945 }, { t: 1394, year: 1965 }, { t: 1435, year: 2000 },
  { t: 1487, year: 2025 }, { t: 1585, year: 2026 },
];

/* =====================================================================
   PLACES — every named location, with real lat/lon for the atlas map
   ===================================================================== */
const PLACES = {
  'saint-crepin':     { name: 'Saint-Crépin-Ibouvilliers',     region: 'Picardy, France',                lat: 49.27,  lon: 2.06 },
  'rouen':            { name: 'Rouen',                          region: 'Normandy, France',               lat: 49.44,  lon: 1.10 },
  'crucey':           { name: 'Saint-Eustache de Crucey',      region: 'Picardy, France',                lat: 48.61,  lon: 1.04 },
  'beauport':         { name: 'Beauport',                       region: 'Nouvelle France',                lat: 46.87, lon: -71.20 },
  'clermont-ferrand': { name: 'Saint-Pierre, Clermont-Ferrand',region: 'Auvergne, France',               lat: 45.78,  lon: 3.08 },
  'baumholder':       { name: 'Baumholder',                     region: 'Rhineland, Prussia',             lat: 49.62,  lon: 7.31 },
  'quebec-city':      { name: 'Quebec City',                    region: 'Nouvelle France',                lat: 46.81, lon: -71.21 },
  'montreal':         { name: 'Montreal',                       region: 'Nouvelle France',                lat: 45.50, lon: -73.57 },
  'richelieu-fort':   { name: 'Fort along the Richelieu',       region: 'Nouvelle France',                lat: 45.30, lon: -73.25 },
  'rimouski':         { name: 'Rimouski',                       region: 'Bas-Saint-Laurent, Lower Canada',lat: 48.45, lon: -68.52 },
  'napierville':      { name: 'Saint-Édouard de Napierville',  region: 'Montérégie, Quebec',             lat: 45.23, lon: -73.51 },
  'saint-liboire':    { name: 'Saint-Liboire de Bagot',         region: 'Montérégie, Quebec',             lat: 45.66, lon: -72.81 },
  'salem-ny':         { name: 'Salem, NY',                      region: 'Washington Co., New York',       lat: 43.17, lon: -73.33 },
  'albany':           { name: 'Albany, NY',                     region: 'New York',                       lat: 42.65, lon: -73.76 },
  'fall-river':       { name: 'Fall River',                     region: 'Massachusetts',                  lat: 41.72, lon: -71.16 },
  'williamstown':     { name: 'Williamstown',                   region: 'Berkshire Co., Massachusetts',   lat: 42.71, lon: -73.20 },
  'north-adams':      { name: 'North Adams',                    region: 'Berkshire Co., Massachusetts',   lat: 42.70, lon: -73.11 },
  'winchendon':       { name: 'Winchendon',                     region: 'Massachusetts',                  lat: 42.69, lon: -72.04 },
  'athol':            { name: 'Athol',                          region: 'Massachusetts',                  lat: 42.59, lon: -72.22 },
};

/* =====================================================================
   ERAS — horizontal context bars running alongside the card rail
   spanning `tStart` → `tEnd` in audio-seconds
   ===================================================================== */
const ERAS = [
  { id: 'ancien',     tStart: 0,    tEnd: 654,  label: 'Ancien Régime France',      color: '#7a6a55' },
  { id: 'nouvelle',   tStart: 200,  tEnd: 654,  label: 'Nouvelle France',           color: '#A87B3F' },
  { id: 'carignan',   tStart: 247,  tEnd: 410,  label: 'Carignan-Salières',         color: '#D89346' },
  { id: 'british',    tStart: 654,  tEnd: 1015, label: 'British North America',     color: '#5D8DC0' },
  { id: 'revolution', tStart: 668,  tEnd: 691,  label: 'American Revolution',       color: '#9c5a3a' },
  { id: 'grande',     tStart: 1015, tEnd: 1260, label: 'La Grande Émigration',      color: '#D4A04A' },
  { id: 'mill',       tStart: 1068, tEnd: 1378, label: 'Mill Era · Berkshires',     color: '#6FA973' },
  { id: 'today',      tStart: 1394, tEnd: 1585, label: 'Lepel siblings',            color: '#9B6CA0' },
];

/* =====================================================================
   CARDS — the left-rail timeline of event cards.
   Sequence-driven; the rail slides up so the current card is in focus.
   ===================================================================== */
const CARDS = [
  // ============================== ACT I — Origins ==============================
  { t: 6,   year: '1604',      track: 'betourne', kind: 'normal',
    title: 'Charles Bétourné',
    desc: 'A child named Charles Bétourné is baptized in the parish church of Saint-Crépin-Ibouvilliers — a tiny farming community seventy kilometers north of Paris.',
    place: 'saint-crepin', placeKey: 'saint-crepin',
    source: 'Parish register, Saint-Crépin-Ibouvilliers · Oise départemental archives' },

  { t: 80,  year: '1634',      track: 'betourne', kind: 'normal',
    title: 'Charles ⚭ Marguerite',
    desc: 'On 30 May 1634, Charles marries Marguerite Bétourné at the same parish where he was baptized twenty-nine years before.',
    place: 'saint-crepin', placeKey: 'saint-crepin',
    source: 'Parish marriage register · Saint-Crépin-Ibouvilliers' },

  { t: 115, year: '1660',      track: 'betourne', kind: 'normal',
    title: 'Death in Rouen',
    desc: 'Charles has moved seventy kilometers west to the great commercial city of Rouen, where he dies in 1660. His widow Marguerite follows him two years later.',
    place: 'rouen', placeKey: 'rouen',
    source: 'Burial register · Rouen · Seine-Maritime archives' },

  { t: 134, year: '1635',      track: 'betourne', kind: 'normal',
    title: 'Adrien Bétourné',
    desc: 'Their son Adrien — born in 1635 — will lose both parents before he turns thirty.',
    place: 'saint-crepin', placeKey: 'saint-crepin',
    source: 'Parish baptisms · Picardy · reconstructed by PRDH-IGD' },

  { t: 141, year: 'c. 1620',  track: 'mongeau', kind: 'normal',
    title: 'The Mangot Carpenters',
    desc: 'A thousand kilometers south, a Catholic family named Mangot worships at the Church of Saint-Pierre. The Mangots are carpenters at the foot of the extinct volcano Puy de Dôme.',
    place: 'clermont-ferrand', placeKey: 'clermont-ferrand',
    source: 'Saint-Pierre parish registers · Clermont-Ferrand · Archives départementales du Puy-de-Dôme' },

  { t: 151, year: '1677',      track: 'mongeau', kind: 'normal',
    title: 'Gilbert Mangot',
    desc: 'Gilbert Mangot, born 1677, plies the carpenter’s trade in Clermont-Ferrand and raises a family at Saint-Pierre.',
    place: 'clermont-ferrand', placeKey: 'clermont-ferrand',
    source: 'Saint-Pierre baptisms · Clermont-Ferrand' },

  { t: 158, year: '1736',      track: 'mongeau', kind: 'normal',
    title: 'Gabriel — five in the morning',
    desc: 'Gabriel Mangault is baptized at Saint-Pierre on 23 March 1736, at five o’clock in the morning. The priest noted the godmother’s name was illegible.',
    place: 'clermont-ferrand', placeKey: 'clermont-ferrand',
    source: 'Saint-Pierre baptismal register · 23 March 1736' },

  { t: 192, year: 'c. 1690',  track: 'heppell', kind: 'normal',
    title: 'The Heppels of Baumholder',
    desc: 'A thousand kilometers to the northeast, the Heppel family lives as German Lutherans in or near the town of Baumholder, in the Rhineland of Prussia.',
    place: 'baumholder', placeKey: 'baumholder',
    source: 'Baumholder Lutheran Kirchenbuch · Rhineland-Palatinate archives' },

  // ============================== ACT II — The Crossings ==============================
  { t: 250, year: '1665',      track: 'history', kind: 'normal',
    title: 'The Atlantic Crossing',
    desc: 'In June and July 1665, twelve hundred soldiers of the Carignan-Salières Regiment disembark at Quebec City in waves. Louis XIV’s answer to two decades of Iroquois raids.',
    place: 'quebec-city', placeKey: 'quebec-city',
    source: 'Carignan-Salières muster roll · National Archives of France · ANOM' },

  { t: 274, year: '1665',      track: 'betourne', kind: 'moment',
    title: 'Adrien dit Laviolette',
    desc: 'Among the regiment is Adrien Bétourné, age 30, just buried his parents in Picardy. He carries a soldier’s nickname: dit Laviolette — "called the Violet".',
    place: 'quebec-city', placeKey: 'quebec-city',
    source: 'Carignan-Salières roster · Drouin Collection · BAnQ' },

  { t: 333, year: '1666',      track: 'history', kind: 'normal',
    title: 'The Mohawk Campaigns',
    desc: 'The regiment fights two campaigns against the Mohawk villages in 1666. Adrien winters in a wooden fort along the Richelieu River and watches men die of cold and dysentery.',
    place: 'richelieu-fort', placeKey: 'richelieu-fort',
    source: 'Jésuites Relations · Vol. 50 (1666) · Reuben Gold Thwaites ed.' },

  { t: 389, year: '1669',      track: 'betourne', kind: 'normal',
    title: 'Adrien ⚭ Marie Desjardins',
    desc: 'In 1669 Adrien marries Marie Desjardins, possibly one of the eight hundred Filles du Roi. They settle near Montreal. The Bétourné dit Laviolette line begins in North America.',
    place: 'montreal', placeKey: 'montreal',
    source: 'PRDH-IGD certificate 38121 · marriage 1669' },

  { t: 422, year: '1656',      track: 'betourne', kind: 'normal',
    title: 'Pierre de la Voye dit Le Picard',
    desc: 'A decade before Adrien, another Picardy man made the same crossing — Pierre de la Voye, b. c. 1626. Their descendants will marry each other 232 years later in Massachusetts.',
    place: 'beauport', placeKey: 'beauport',
    source: 'Drouin Collection · Beauport parish marriages · 1660s' },

  { t: 536, year: 'c. 1750',  track: 'mongeau', kind: 'normal',
    title: 'Mongeau crosses to Quebec',
    desc: 'Sometime between 1736 and 1773, Gabriel or his son emigrates to Quebec. The surname slowly morphs from Mangot to Mongeau, and a dit-name appears: Mongeau dit Clermont — preserving the name of the parish back in Auvergne.',
    place: 'quebec-city', placeKey: 'quebec-city',
    source: 'PRDH-IGD ascendant analysis · Mongeau lineage' },

  { t: 579, year: '1707',      track: 'heppell', kind: 'normal',
    title: 'Johann Nickolaus Heppell',
    desc: 'The Heppels of Baumholder have a son — Johann Nickolaus — baptized 22 July 1707. Their grandson will be born in Salem, New York, 46 years later.',
    place: 'baumholder', placeKey: 'baumholder',
    source: 'Baumholder Lutheran baptisms · 22 July 1707' },

  { t: 611, year: '1753',      track: 'heppell', kind: 'normal',
    title: 'John Jacob Jean Heppell',
    desc: 'Johann’s grandson, John Jacob Jankel, is born 24 June 1753 in Salem, New York — sixty miles north of where Daniel will live three centuries later.',
    place: 'salem-ny', placeKey: 'salem-ny',
    source: 'Salem NY town records · Washington County · 1753' },

  { t: 632, year: '1757',      track: 'barbeau', kind: 'normal',
    title: 'Joseph Barbeau dit Boisdoré',
    desc: 'In pre-British New France, Joseph Barbeau is born — "Boisdoré", or "Golden Wood". He is six years old when the Treaty of Paris hands the colony to Britain.',
    place: 'quebec-city', placeKey: 'quebec-city',
    source: 'PRDH-IGD baptism record · Barbeau dit Boisdoré 1757' },

  // ============================== ACT III — Conquest & Migration ==============================
  { t: 657, year: '1763',      track: 'history', kind: 'normal',
    title: 'A Continent Changes Hands',
    desc: 'The Treaty of Paris gives Nouvelle France to Britain. The Barbeaus go to sleep one night as French subjects and wake the next morning as British subjects — without ever leaving their farms.',
    place: 'quebec-city', placeKey: 'quebec-city',
    source: 'Treaty of Paris · 10 February 1763' },

  { t: 668, year: '1775',      track: 'history', kind: 'normal',
    title: 'The American Revolution',
    desc: 'John Jacob Jean Heppell, twenty-two and living in Salem, New York, watches the colony tear itself apart. We do not know which side he supports.',
    place: 'salem-ny', placeKey: 'salem-ny',
    source: 'Washington County loyalist & militia rolls · 1775–1783' },

  { t: 708, year: '1790',      track: 'heppell', kind: 'moment',
    title: 'Heppell ⚭ Lavoie · Rimouski',
    desc: 'On 19 July 1790 at Saint-Germain de Rimouski, John Jacob Jean Heppell — an Anglo-German Protestant — marries Agnès Lavoie, a French Canadian Catholic descended from Pierre de la Voye dit Le Picard. Two families, separated by a century and an ocean, become one.',
    place: 'rimouski', placeKey: 'rimouski',
    source: 'Saint-Germain de Rimouski parish · marriage register · 19 July 1790' },

  { t: 752, year: '1801',      track: 'heppell', kind: 'normal',
    title: 'Bazile Heppel',
    desc: 'Bazile Heppel is born 21 February 1801 in Rimouski. French clerks cannot hear the H — the surname begins to drift: Heppel → Epple → Heppell.',
    place: 'rimouski', placeKey: 'rimouski',
    source: 'Rimouski parish baptisms · 21 February 1801' },

  // ============================== ACT IV — Napierville & The Mills ==============================
  { t: 875, year: '1854',      track: 'betourne', kind: 'normal',
    title: 'Modeste Bétourney',
    desc: 'Modeste Bétourney is born at Saint-Édouard de Napierville — direct seventh-generation descendant of the Carignan-Salières soldier from Picardy.',
    place: 'napierville', placeKey: 'napierville',
    source: 'Saint-Édouard de Napierville parish baptisms · 1854' },

  { t: 909, year: '1865',      track: 'barbeau', kind: 'normal',
    title: 'Magloire Barbeau ⚭ Marie Blais',
    desc: 'On 27 November 1865, Magloire Barbeau marries Marie Blais at the same Saint-Édouard de Napierville parish where the Bétournés already worship.',
    place: 'napierville', placeKey: 'napierville',
    source: 'Saint-Édouard de Napierville parish marriages · 27 November 1865' },

  { t: 924, year: '1870',      track: 'barbeau', kind: 'moment', anchor: true,
    title: '★ Joseph Wilfred Barbeau',
    desc: 'Baptized 28 April 1870 at Saint-Édouard de Napierville. Lived his entire life in that village. Never left Canada. The British subject who never crossed a border is the documentary anchor for Canadian citizenship under Bill C-3.',
    place: 'napierville', placeKey: 'napierville',
    source: 'Saint-Édouard de Napierville parish baptisms · 28 April 1870 · death · Sainte-Dorothée 8 Feb 1938' },

  { t: 960, year: '1878',      track: 'mongeau', kind: 'normal',
    title: 'Mongeau ⚭ at the same parish',
    desc: 'On 19 August 1878, Évaqueste Mongeau dit Clermont marries Élise Boullereau at Saint-Édouard de Napierville. Three of Daniel and Renée’s four lines now worship at the same village parish.',
    place: 'napierville', placeKey: 'napierville',
    source: 'Saint-Édouard de Napierville parish marriages · 19 August 1878' },

  { t: 969, year: '1880',      track: 'mongeau', kind: 'normal',
    title: 'Henri C. Clermont',
    desc: 'Henri C. Clermont is born 1 October 1880 nearby at Saint-Liboire de Bagot — great-great-grandson of the Auvergne carpenters.',
    place: 'saint-liboire', placeKey: 'saint-liboire',
    source: 'Saint-Liboire parish baptisms · 1 October 1880' },

  { t: 985, year: '1854–1878', track: 'mongeau', kind: 'convergence',
    title: 'Three lines at one parish',
    desc: 'In the same generation: Bétournés, Mongeau dit Clermonts, and Barbeaus all worship at Saint-Édouard de Napierville. The priest knows them all. Their children play together. None of them know their American descendants will meet again.',
    place: 'napierville', placeKey: 'napierville', extraTracks: ['betourne','barbeau'],
    source: 'Saint-Édouard de Napierville parish ledgers · 1854–1880' },

  { t: 1015, year: '1840–1930', track: 'history', kind: 'normal',
    title: 'The Mills Call',
    desc: 'Approximately 900,000 French Canadians leave Quebec for the New England mills. The textile and paper mills of Quebec have been hammered by mechanization; Massachusetts and New Hampshire are hungry for cheap Catholic labor.',
    place: 'north-adams', placeKey: 'north-adams',
    source: 'Yves Roby · "Les Franco-Américains de la Nouvelle-Angleterre" · 1990' },

  { t: 1041, year: '1887',     track: 'betourne', kind: 'normal',
    title: 'Modeste crosses south',
    desc: 'Modeste Bétourney crosses the border in 1887, working mill jobs in Winchendon, Massachusetts and Claremont, New Hampshire. He will return to Quebec to die in 1930.',
    place: 'winchendon', placeKey: 'winchendon',
    source: 'US Census 1900 · Worcester County, MA · Bétourney household' },

  { t: 1082, year: '1902',     track: 'heppell', kind: 'normal',
    title: 'Hermenegilde ⚭ Maria Sirois',
    desc: 'On 21 July 1902 at Notre-Dame-de-Lourdes in Fall River, Hermenegilde Heppel marries Maria Sirois. He works as a carpenter at 1570 Pleasant Street. Maria descends from François Sirois dit Duplessis.',
    place: 'fall-river', placeKey: 'fall-river',
    source: 'Notre-Dame-de-Lourdes parish marriages · Fall River · 21 July 1902' },

  { t: 1128, year: '1898',     track: 'mongeau', kind: 'normal',
    title: 'Henri ⚭ Alexina · Williamstown',
    desc: 'On 8 May 1898, Henri C. Clermont marries Alexina Emma Rancourt in Williamstown. Both came south from Saint-Édouard de Napierville. They will have nineteen children — eighteen survive past infancy.',
    place: 'williamstown', placeKey: 'williamstown',
    source: 'Williamstown vital records · 8 May 1898' },

  { t: 1175, year: '1911',     track: 'heppell', kind: 'normal',
    title: 'Alcide J. Lepel',
    desc: 'Alcide J. Lepel is born 2 June 1911 in Fall River. He will eventually move west to North Adams.',
    place: 'fall-river', placeKey: 'fall-river',
    source: 'Massachusetts vital records · Bristol County · 1911' },

  { t: 1191, year: '1907',     track: 'mongeau', kind: 'normal',
    title: 'Regina Hermanise Clermont',
    desc: 'Regina Hermanise Clermont — sixth child of Henri and Alexina — is born in 1907, named for Saint Hermenegild of Spain. The same saint name had been attached to Hermenegilde Heppel decades earlier.',
    place: 'williamstown', placeKey: 'williamstown',
    source: 'Berkshire County vital records · 1907' },

  // ============================== ACT V — Massachusetts to Now ==============================
  { t: 1262, year: '1931',     track: 'barbeau', kind: 'moment',
    title: 'Ernest ⚭ Regina · St. Raphael’s',
    desc: 'On 7 September 1931, Rouville Ernest Barbeau marries Regina Clermont at Saint Raphael’s Catholic Church in Williamstown — the same parish where Regina’s parents had married 33 years before.',
    place: 'williamstown', placeKey: 'williamstown', extraTracks: ['mongeau'],
    source: 'Saint Raphael’s parish marriages · Williamstown · 7 September 1931' },

  { t: 1335, year: '1914',     track: 'betourne', kind: 'normal',
    title: 'Rita Bétourney',
    desc: 'Rita Marie Bétourney is born in North Adams in 1914. She will marry Alcide J. Lepel.',
    place: 'north-adams', placeKey: 'north-adams',
    source: 'Berkshire County vital records · 1914' },

  { t: 1358, year: '1939',     track: 'heppell', kind: 'normal',
    title: 'Ronald Joseph Lepel',
    desc: 'Ronald Joseph Lepel is born in 1939, son of Alcide Lepel and Rita Bétourney. The Bétourné line, descended from the Carignan-Salières soldier, joins the Heppell-Lepel line, descended from the Palatine German Lutherans.',
    place: 'north-adams', placeKey: 'north-adams', extraTracks: ['betourne'],
    source: 'Berkshire County vital records · 1939' },

  { t: 1380, year: 'c. 1960', track: 'heppell', kind: 'convergence',
    title: 'Four lines become one',
    desc: 'Ronald Joseph Lepel marries Lorraine Irene Barbeau, daughter of Ernest Barbeau and Regina Clermont. With that single marriage the Picardy soldiers, the Auvergne carpenters, the Nouvelle France founders and the Rhineland Lutherans converge in a single household in North Adams, Massachusetts.',
    place: 'north-adams', placeKey: 'north-adams', extraTracks: ['betourne','mongeau','barbeau'],
    source: 'Family record · Lepel ⚭ Barbeau · North Adams, MA' },

  { t: 1394, year: '1965',     track: 'heppell', kind: 'descendant',
    title: 'Daniel Lepel',
    desc: 'Born 1965. North Adams. Baptized at Notre-Dame du Sacré-Cœur — the parish where four generations of Lepels, Barbeaus, Bétourneys and Clermonts worshipped before him.',
    place: 'north-adams', placeKey: 'north-adams',
    source: 'Notre-Dame du Sacré-Cœur · North Adams · 1965' },

  { t: 1399, year: '1968',     track: 'heppell', kind: 'descendant',
    title: 'Renée Lepel Hanson',
    desc: 'Born 1968. North Adams. Carries the same blood, the same Catholic heritage, the same complicated mix of Picardy, Auvergne, Rhineland and Nouvelle France.',
    place: 'north-adams', placeKey: 'north-adams',
    source: 'Notre-Dame du Sacré-Cœur · North Adams · 1968' },

  { t: 1435, year: 'c. 2000',  track: 'heppell', kind: 'moment',
    title: 'The Circle Closes',
    desc: 'Daniel moves sixty miles south to Albany, New York. He does not know, at the time, that 273 years before, his fourth great-grandfather John Jacob Jean Heppell was born in Salem, New York — sixty miles north of Albany. The family has crossed the same border three times in three centuries.',
    place: 'albany', placeKey: 'albany',
    source: 'Family record · Daniel Lepel · Albany, NY · c. 2000' },

  { t: 1487, year: '2025',     track: 'history', kind: 'moment',
    title: 'Bill C-3',
    desc: 'On 15 December 2025, the Government of Canada passes Bill C-3. Canadian citizenship by descent is restored past the first generation. The documented birth of Joseph Wilfred Barbeau in 1870 becomes the legal anchor by which his American great-great-grandchildren can claim Canadian citizenship.',
    place: 'napierville', placeKey: 'napierville',
    source: 'Government of Canada · Bill C-3 · Royal Assent · 15 December 2025' },

  { t: 1581, year: '2026',     track: 'history', kind: 'final',
    title: 'This is who they came from.',
    desc: 'Fifteen documented generations. Four ancestral lines. Four countries. Four hundred and twenty-two years. From a Picardy farmhouse in 1604 to a Carignan-Salières fort, to Clermont-Ferrand in 1736, to Rimouski in 1790, to Napierville in 1870, to Fall River in 1900, to Saint Raphael’s in 1931, to a North Adams baby crib in 1940. To Ottawa in 2025. To themselves.',
    place: 'north-adams', placeKey: 'north-adams',
    source: 'Lepel family genealogy · compiled 2026' },
];

/* =====================================================================
   MAP MIGRATIONS — accumulating numbered arrows on the persistent atlas
   Each fires at `t`, draws as a curved polyline from→to, persists thereafter.
   ===================================================================== */
const MAP_MIGRATIONS = [
  { n: 1, t: 422,  track: 'betourne', from: 'crucey',           to: 'beauport',     yearLabel: '1656', label: 'Picardy → Nouvelle France', desc: 'Pierre de la Voye dit Le Picard crosses to Beauport.' },
  { n: 2, t: 365,  track: 'betourne', from: 'saint-crepin',     to: 'quebec-city',  yearLabel: '1665', label: 'Picardy → Quebec',          desc: 'Adrien Bétourné, Carignan-Salières soldier.' },
  { n: 3, t: 600,  track: 'heppell',  from: 'baumholder',       to: 'salem-ny',     yearLabel: 'c.1740', label: 'Rhineland → New York',     desc: 'The Palatine German migration to colonial NY.' },
  { n: 4, t: 540,  track: 'mongeau',  from: 'clermont-ferrand', to: 'quebec-city',  yearLabel: 'c.1750', label: 'Auvergne → Quebec',        desc: 'The Mangot carpenters cross; surname becomes Mongeau dit Clermont.' },
  { n: 5, t: 695,  track: 'heppell',  from: 'salem-ny',         to: 'rimouski',     yearLabel: '1790',  label: 'New York → Lower Canada',   desc: 'John Jacob Jean Heppell migrates north to Rimouski.' },
  { n: 6, t: 1041, track: 'betourne', from: 'napierville',      to: 'winchendon',   yearLabel: '1887',  label: 'Napierville → MA mills',    desc: 'Modeste Bétourney crosses south for mill work.' },
  { n: 7, t: 1075, track: 'heppell',  from: 'rimouski',         to: 'fall-river',   yearLabel: 'c.1900', label: 'Rimouski → Fall River',    desc: 'Hermenegilde Heppel south to the textile city.' },
  { n: 8, t: 1115, track: 'mongeau',  from: 'napierville',      to: 'williamstown', yearLabel: '1897',  label: 'Napierville → Williamstown',desc: 'Henri C. Clermont crosses for the cotton mills.' },
  { n: 9, t: 1300, track: 'heppell',  from: 'fall-river',       to: 'north-adams',  yearLabel: 'c.1930', label: 'Fall River → North Adams', desc: 'Alcide Lepel moves west; the four lines collect in the Berkshires.' },
  { n:10, t: 1435, track: 'heppell',  from: 'north-adams',      to: 'albany',       yearLabel: 'c.2000', label: 'North Adams → Albany',     desc: 'Daniel migrates south. The circle closes — Salem NY is sixty miles north.' },
];

/* =====================================================================
   POINT-OF-INTEREST FOCUS — when to pan the atlas to which place
   ===================================================================== */
const MAP_FOCUS = [
  { t: 0,    place: 'saint-crepin',     zoom: 6,  desc: 'Picardy, France' },
  { t: 141,  place: 'clermont-ferrand', zoom: 6,  desc: 'Clermont-Ferrand, Auvergne' },
  { t: 188,  place: 'baumholder',       zoom: 6,  desc: 'Baumholder, Rhineland' },
  { t: 247,  place: 'quebec-city',      zoom: 5,  desc: 'The North Atlantic crossing' },
  { t: 330,  place: 'richelieu-fort',   zoom: 7,  desc: 'Richelieu River campaigns' },
  { t: 419,  place: 'beauport',         zoom: 7,  desc: 'Beauport — the second Picard' },
  { t: 580,  place: 'baumholder',       zoom: 6,  desc: 'Rhineland → New York · Palatines' },
  { t: 608,  place: 'salem-ny',         zoom: 7,  desc: 'Salem, NY · 1753' },
  { t: 691,  place: 'rimouski',         zoom: 6,  desc: 'Migration north · Rimouski' },
  { t: 855,  place: 'napierville',      zoom: 9,  desc: 'Saint-Édouard de Napierville' },
  { t: 1015, place: 'napierville',      zoom: 6,  desc: 'The mill migration south' },
  { t: 1082, place: 'fall-river',       zoom: 8,  desc: 'Fall River, Massachusetts' },
  { t: 1128, place: 'williamstown',     zoom: 9,  desc: 'Williamstown · the Berkshires' },
  { t: 1300, place: 'north-adams',      zoom: 10, desc: 'North Adams · four lines collect' },
  { t: 1435, place: 'albany',           zoom: 7,  desc: 'Albany — the circle closes' },
  { t: 1540, place: 'north-adams',      zoom: 6,  desc: 'Four hundred years, from above' },
];

/* =====================================================================
   Cues that aren’t cards — captions and dit-name ticker
   ===================================================================== */
const CAPTIONS = [
  { t: 250, text: 'June 1665 — twelve hundred soldiers of the Carignan-Salières disembark at Quebec.' },
  { t: 290, kind: 'ditname', text: 'Bétourné dit Laviolette · Lapierre · Sans Souci · La Fleur · Beau Cœur · La Jeunesse' },
  { t: 440, kind: 'ditname', text: 'Lavoie dit Le Picard' },
  { t: 760, kind: 'ditname', text: 'Ruest dit Lapierre · Sirois dit Duplessis · Riel dit l’Irlande' },
  { t: 1199, text: 'Hermenegilde · Hermanise — the same Catholic saint name, in two unrelated families, that converge through marriage.' },
];

/* =====================================================================
   HISTORY_EVENTS — Track 5 (bottom horizontal strip)
   Each entry: { start, end?, label, short?, tier (1|2), t? (narration cue) }
   end omitted → single-date marker. tier 1 → emphasized.
   ===================================================================== */
const HISTORY_EVENTS = [
  // PRE-COLONIAL
  { start:1608,           label:'Quebec City founded',                         short:'Quebec founded',     tier:2 },
  { start:1663, end:1673, label:'Filles du Roi program',                       short:'Filles du Roi',      tier:2 },
  // CARIGNAN-SALIÈRES ERA
  { start:1665, end:1668, label:'Carignan-Salières Regiment campaigns',        short:'Carignan-Salières',  tier:1, t:240 },
  { start:1666,           label:'Mohawk villages burned',                      short:'Mohawk campaigns',   tier:2, t:330 },
  { start:1667,           label:'Iroquois Confederacy sues for peace',         short:'Iroquois peace',     tier:2 },
  { start:1685,           label:'Edict of Fontainebleau revokes Edict of Nantes', short:'Edict of Nantes revoked', tier:2 },
  // EARLY 1700s
  { start:1707,           label:'War of Spanish Succession ongoing',           short:'Spanish Succession', tier:2 },
  { start:1709, end:1710, label:'Great Palatine migration to colonial New York', short:'Palatine migration', tier:2 },
  // COLONIAL WARS
  { start:1754, end:1763, label:'French & Indian War / Seven Years\u2019 War', short:'French & Indian War', tier:2 },
  { start:1763,           label:'Treaty of Paris ends French rule in N. America', short:'British conquest', tier:1, t:491 },
  { start:1774,           label:'Quebec Act preserves French law & Catholic rights', short:'Quebec Act', tier:2 },
  // REVOLUTIONARY
  { start:1775, end:1783, label:'American Revolution',                         short:'American Revolution', tier:1, t:665 },
  { start:1776,           label:'Declaration of Independence',                 short:'Declaration',        tier:2 },
  { start:1783,           label:'Loyalist migrations to British Canada',       short:'Loyalist migrations', tier:2 },
  { start:1789, end:1799, label:'French Revolution',                           short:'French Revolution',  tier:2 },
  // 1800s
  { start:1812, end:1815, label:'War of 1812',                                 short:'War of 1812',        tier:2 },
  { start:1837, end:1838, label:'Lower Canada Rebellion',                      short:'Lower Canada Rebellion', tier:2 },
  { start:1840, end:1930, label:'French-Canadian Great Migration to New England', short:'Great Migration to NE', tier:1, t:835 },
  { start:1861, end:1865, label:'American Civil War',                          short:'Civil War',          tier:2 },
  { start:1867,           label:'Canadian Confederation',                      short:'Confederation',      tier:2 },
  { start:1873, end:1879, label:'The Long Depression',                         short:'Long Depression',    tier:2 },
  // EARLY 1900s
  { start:1907,           label:'Sprague Electric founded in North Adams',     short:'Sprague founded',    tier:2 },
  { start:1914, end:1918, label:'World War I',                                 short:'WWI',                tier:1, t:1335 },
  { start:1918, end:1919, label:'Spanish flu pandemic',                        short:'Spanish flu',        tier:2 },
  { start:1929, end:1939, label:'Great Depression',                            short:'Great Depression',   tier:2, t:1262 },
  { start:1939, end:1945, label:'World War II',                                short:'WWII',               tier:1, t:1380 },
  // LATE 20TH C.
  { start:1947, end:1965, label:'Berkshires industrial decline',               short:'Mills consolidating', tier:2 },
  { start:1965, end:1975, label:'Vietnam War',                                 short:'Vietnam',            tier:2 },
  { start:1980,           label:'First Quebec Sovereignty Referendum',         short:'Quebec Ref. I',      tier:2 },
  { start:1985,           label:'Sprague Electric closes North Adams',         short:'Sprague closes',     tier:2 },
  { start:1995,           label:'Second Quebec Sovereignty Referendum',        short:'Quebec Ref. II',     tier:2 },
  { start:1999,           label:'MASS MoCA opens in North Adams',              short:'MASS MoCA opens',    tier:2 },
  // 21ST C.
  { start:2001,           label:'September 11 attacks',                        short:'9/11',               tier:2 },
  { start:2008, end:2009, label:'Great Recession',                             short:'Great Recession',    tier:2 },
  { start:2020, end:2021, label:'COVID-19 pandemic',                           short:'COVID-19',           tier:2 },
  { start:2025.96,        label:'Bill C-3 takes effect (15 Dec 2025)',         short:'Bill C-3',           tier:1, t:1487 },
];

window.TIMELINE = {
  TRACKS, YEAR_MIN, YEAR_MAX, ACTS, audioCues,
  PLACES, ERAS, CARDS, MAP_MIGRATIONS, MAP_FOCUS, CAPTIONS, HISTORY_EVENTS,
};
