export const PESU_WORDS = [
  // Campus life
  'canteen', 'SRN', 'attendance', 'CGPA', 'backlog', 'internal marks',
  'lab record', 'viva', 'proxy', 'late entry', 'ID card', 'assignment',
  'semester', 'elective', 'revaluation', 'hall ticket', 'fee payment',
  'grace marks', 'detention', 'study leave', 'night out', 'hostel',
  // Subjects
  'data structures', 'operating system', 'linked list', 'recursion',
  'SQL query', 'binary tree', 'Fourier transform', 'circuit diagram',
  'machine learning', 'neural network', 'compiler', 'algorithm',
  'microprocessor', 'flip flop', 'truth table', 'stack overflow',
  // Campus landmarks (EC & RR)
  'amphitheatre', 'reading room', 'basketball court', 'seminar hall',
  'library', 'parking lot', 'food court', 'ATM', 'PES block',
  'innovation lab', 'placement cell', 'clock tower',
]

export const GENERAL_WORDS = [
  // Easy
  'pizza', 'bicycle', 'rainbow', 'elephant', 'guitar', 'volcano',
  'umbrella', 'butterfly', 'waterfall', 'sandwich', 'lighthouse',
  'helicopter', 'sunflower', 'keyboard', 'telescope', 'penguin',
  'cactus', 'igloo', 'tornado', 'fireworks', 'treasure', 'compass',
  // Medium
  'rollercoaster', 'submarine', 'quicksand', 'escalator',
  'trampoline', 'avalanche', 'skyscraper', 'constellation',
  'parachute', 'boomerang', 'kaleidoscope', 'stopwatch',
  'hammock', 'magnifying glass', 'hot air balloon', 'dominoes',
  'treadmill', 'ceiling fan', 'traffic jam', 'solar panel',
  // Hard
  'democracy', 'procrastination', 'irony', 'nostalgia',
  'claustrophobia', 'ambiguity', 'serendipity', 'bureaucracy',
  'infinity', 'gravity', 'echo chamber', 'peer pressure',
  'writers block', 'jet lag', 'culture shock', 'inflation',
]

export const ALL_DRAWL_WORDS = [...PESU_WORDS, ...GENERAL_WORDS]

export function pickWordChoices(): [string, string, string] {
  const pesuPool = [...PESU_WORDS]
  const generalPool = [...GENERAL_WORDS]

  const shuffle = <T,>(arr: T[]) => arr.sort(() => Math.random() - 0.5)
  shuffle(pesuPool)
  shuffle(generalPool)

  // 2 PESU + 1 general, or 1 PESU + 2 general randomly
  const mixPESU = Math.random() > 0.5
  return mixPESU
    ? [pesuPool[0], pesuPool[1], generalPool[0]]
    : [pesuPool[0], generalPool[0], generalPool[1]]
}