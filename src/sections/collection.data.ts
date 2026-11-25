import dillaPlate from '../assets/img/dilla-plate.webp'
import emeraldPlate from '../assets/img/emerald-plate.webp'
import goldPlate from '../assets/img/gold-plate.webp'
import burgundyPlate from '../assets/img/burgundy-plate.webp'
import dillaFg from '../assets/img/dilla-fg.webp'
import emeraldFg from '../assets/img/emerald-fg.webp'
import goldFg from '../assets/img/gold-fg.webp'
import burgundyFg from '../assets/img/burgundy-fg.webp'
import a1 from '../assets/img/avatar1.webp'
import a2 from '../assets/img/avatar2.webp'
import a3 from '../assets/img/avatar3.webp'
import a4 from '../assets/img/avatar4.webp'

// Copy and positions are taken from Figma frames Desktop-22 → 25.
export const COLORWAYS = [
  {
    key: 'dilla',
    name: 'Dilla Lucci',
    grid: 'Dilla Lucci',
    accent: '#7a1f4b',
    plate: dillaPlate,
    fg: dillaFg,
    // full gloved hand in frame, bottle base resting in the palm
    frame: { s: 0.84, top: -24 },
    // phones: where the bottle sits in its photograph (centre x, base y, as
    // fractions of the image) and a size trim, so every scent stands the same
    mobile: { cx: 0.49, base: 0.708, k: 1 },
    title: [
      { text: 'Dilla', x: 265, y: 235 },
      { text: 'Lucci', x: 1026, y: 554 },
    ],
    price: '$82.81',
    badge: 'Limited release',
    users: '20',
    avatars: [a1, a2, a3, a4],
  },
  {
    key: 'emerald',
    name: 'Emerald Couture',
    grid: 'Emerald Couture',
    accent: '#0f5a43',
    plate: emeraldPlate,
    fg: emeraldFg,
    // full gloved hand in frame, bottle base resting in the palm
    frame: { s: 0.84, top: -24 },
    // phones: where the bottle sits in its photograph (centre x, base y, as
    // fractions of the image) and a size trim, so every scent stands the same
    mobile: { cx: 0.49, base: 0.708, k: 1 },
    title: [
      { text: 'Emerald', x: 119, y: 231 },
      { text: 'Couture', x: 1006, y: 554 },
    ],
    price: '$88.81',
    badge: 'Exclusive Fragrance',
    users: '200',
    avatars: [a1, a2, a3, a4],
  },
  {
    key: 'gold',
    name: 'Luxury Gold',
    grid: 'Luxury Gold',
    accent: '#a26a12',
    plate: goldPlate,
    fg: goldFg,
    // full gloved hand in frame, bottle base resting in the palm
    frame: { s: 0.76, top: -14 },
    // phones: where the bottle sits in its photograph (centre x, base y, as
    // fractions of the image) and a size trim, so every scent stands the same
    mobile: { cx: 0.47, base: 0.75, k: 1 },
    title: [
      { text: 'Luxury', x: 169, y: 231 },
      { text: 'Gold', x: 1006, y: 554 },
    ],
    price: '$80.21',
    badge: 'Premium Ingredients',
    users: '200',
    avatars: [a1, a2, a3, a4],
  },
  {
    key: 'burgundy',
    name: 'Burgundy Faceted',
    grid: 'Amber',
    accent: '#8c2a12',
    plate: burgundyPlate,
    fg: burgundyFg,
    // full gloved hand in frame, bottle base resting in the palm
    frame: { s: 0.84, top: -24 },
    // phones: where the bottle sits in its photograph (centre x, base y, as
    // fractions of the image) and a size trim, so every scent stands the same
    mobile: { cx: 0.49, base: 0.705, k: 1 },
    title: [
      { text: 'Burgundy', x: 109, y: 181 },
      { text: 'Faceted', x: 986, y: 544 },
    ],
    price: '$62.81',
    badge: 'Signature Scents',
    users: '200',
    avatars: [a1, a2, a3, a4],
  },
]

// Desktop-19 / 21: the name index, row by row
export const GRID = [
  ['Emerald Couture', 'Dilla Lucci', 'Luxury Gold', 'Amber'],
  ['Dilla Lucci', 'Amber', 'Luxury Gold', 'Emerald Couture'],
  ['Luxury Gold', 'Emerald Couture', 'Amber', 'Dilla Lucci'],
  ['Amber', 'Dilla Lucci', 'Emerald Couture', 'Luxury Gold'],
]
