export const STATUSES = ['Pending', 'Under Review', 'Resolved'];

export const SOURCES = ['Walk-in', 'Phone call', 'Letter / Petition', 'Praja Darbar', 'WhatsApp', 'Other'];

export const PRIORITIES = ['Normal', 'High', 'Urgent'];

// Department / category list. `keywords` power the automatic suggestion
// shown while staff type the complaint description.
export const DEPARTMENTS = [
  { name: 'Revenue / Land', keywords: ['land', 'survey', 'pattadar', 'passbook', 'patta', 'mutation', 'encroach', 'registration', 'mro', 'tahsildar', 'boundary', 'acre'] },
  { name: 'Police', keywords: ['police', 'theft', 'fir', 'attack', 'threat', 'harass', 'fight', 'missing', 'murder', 'cheat', 'fraud', 'violence', 'si '] },
  { name: 'Health / Aarogyasri', keywords: ['hospital', 'aarogyasri', 'arogyasri', 'medical', 'treatment', 'surgery', 'doctor', 'medicine', 'health', 'operation', 'cmrf'] },
  { name: 'Pensions', keywords: ['pension', 'old age', 'widow', 'disability pension', 'handicap'] },
  { name: 'Housing', keywords: ['house', 'housing', 'home', 'plot', 'indiramma', 'shelter'] },
  { name: 'Agriculture / Farm Loans', keywords: ['farm', 'crop', 'loan', 'farmer', 'seed', 'fertilizer', 'rythu', 'agriculture', 'irrigation', 'insurance'] },
  { name: 'Aadhaar / Ration Card', keywords: ['aadhaar', 'aadhar', 'ration', 'card', 'certificate', 'caste', 'income certificate'] },
  { name: 'Electricity', keywords: ['electric', 'current', 'power', 'transformer', 'meter', 'bill', 'pole'] },
  { name: 'Water / Drainage', keywords: ['water', 'drinking', 'drainage', 'tap', 'borewell', 'sewage', 'pipeline'] },
  { name: 'Roads / Infrastructure', keywords: ['road', 'bridge', 'street light', 'culvert', 'pothole', 'building'] },
  { name: 'Education', keywords: ['school', 'college', 'fee', 'scholarship', 'student', 'teacher', 'hostel'] },
  { name: 'Employment', keywords: ['job', 'employment', 'work', 'salary', 'nrega', 'wage'] },
  { name: 'Other', keywords: [] },
];

export const DEPARTMENT_NAMES = DEPARTMENTS.map((d) => d.name);

/** Returns the best-matching department name for some free text, or ''. */
export function suggestDepartment(text) {
  const t = ` ${(text || '').toLowerCase()} `;
  let best = '';
  let bestScore = 0;
  for (const d of DEPARTMENTS) {
    const score = d.keywords.reduce((s, k) => (t.includes(k) ? s + 1 : s), 0);
    if (score > bestScore) {
      best = d.name;
      bestScore = score;
    }
  }
  return best;
}
