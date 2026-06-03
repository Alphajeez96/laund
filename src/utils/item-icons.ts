const KEYWORDS: [RegExp, string][] = [
  [/shirt|t-?shirt|top|blouse|polo|singlet|vest/i, "shirt"],
  [/trouser|pant|jean|chino|slacks?/i, "trousers"],
  [/bedsheet|sheet|bed.?spread|fitted/i, "bedsheet"],
  [/duvet|blanket|comforter|quilt|cover/i, "duvet"],
  [/shoe|sneaker|boot|sandal|slipper|footwear/i, "shoe"],
  [/boxer|underwear|brief|panty|undie/i, "boxers"],
  [/native|agbada|dashiki|kaftan|caftan|buba|senator|kente/i, "native wear"],
  [/towel|bath.?towel|hand.?towel/i, "towel"],
  [/suit|blazer|tuxedo/i, "suit"],
  [/dress|gown|frock/i, "dress"],
  [/jacket|coat|hoodie|cardigan|sweater|jumper|pullover/i, "jacket"],
  [/sock/i, "socks"],
  [/short/i, "shorts"],
  [/skirt/i, "skirt"],
];

const COLORS = {
  navy: "#1e293b",
  teal: "#0d9488",
  emerald: "#059669",
} as const;

const COLOR_VALUES = Object.values(COLORS);

const toDataUri = (svg: string): string =>
  `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const pickColor = (): string =>
  COLOR_VALUES[Math.floor(Math.random() * COLOR_VALUES.length)];

const buildSvg = (inner: string, color: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">` +
  `<rect width="80" height="80" rx="16" fill="${color}"/>${inner}</svg>`;

const PATHS: Record<string, string> = {
  shirt: `<path d="M28 24l-8 4 3 8 4-2v24h26V34l4 2 3-8-8-4c-2 4-6 6-10 6s-8-2-10-6z" fill="#fff"/>`,
  trousers: `<path d="M26 22v16l4 22h6l2-16 2 16h6l4-22V22H40v12h-2V22h-2v12h-2V22z" fill="#fff"/>`,
  bedsheet: `<path d="M18 28v32a4 4 0 004 4h36a4 4 0 004-4V28H18zM52 24l4-6h-6l-4 6zm-8 0l4-6h-6l-4 6zm-8 0l4-6h-6l-4 6z" fill="#fff"/>`,
  duvet: `<path d="M18 24v36a4 4 0 004 4h36a4 4 0 004-4V24H18zM22 36h36M22 44h36M22 52h36" fill="#fff"/>`,
  shoe: `<path d="M20 50c0 4 3 6 8 6h24c6 0 10-3 10-8V38c0-3-2-5-5-5h-8l-4 6h-6l-4-6h-6c-5 0-9 4-9 9v8z" fill="#fff"/>`,
  boxers: `<path d="M24 26v16c0 4 2 8 6 10l4 2 6-4 6 4 4-2c4-2 6-6 6-10V26h-8v8l-8-4-8 4v-8z" fill="#fff"/>`,
  "native wear": `<path d="M28 22v6l-6 4v6l6-2v22h6V36h12v22h6V36l6 2v-6l-6-4v-6h-6l2 8h-4l-2-8h-4l-2 8h-4l2-8z" fill="#fff"/>`,
  towel: `<path d="M18 26v32a4 4 0 004 4h36a4 4 0 004-4V26H18z" fill="#none" stroke="#fff" stroke-width="3"/><circle cx="46" cy="50" r="2" fill="#fff" opacity="0.6"/>`,
  suit: `<path d="M26 22l-6 6v4l4-2v26h12V44l8-4 8 4v12h12V30l4 2v-4l-6-6-4 8H36l-4-8z" fill="#fff"/>`,
  dress: `<path d="M34 20c-4 2-6 6-4 10l2 4v24h16V34l2-4c2-4 0-8-4-10l-4 6-4-6z" fill="#fff"/>`,
  jacket: `<path d="M24 22l-4 8v4l4-2v26h10v-4l6-2 6 2v4h10V32l4 2v-4l-4-8-6 2-4-6h-12l-4 6z" fill="#fff"/>`,
  socks: `<path d="M24 26v16c0 4 2 8 6 8s6-4 6-8V26h-4v14c0 2-1 3-2 3s-2-1-2-3V26zM44 26v16c0 4 2 8 6 8s6-4 6-8V26h-4v14c0 2-1 3-2 3s-2-1-2-3V26z" fill="#fff"/>`,
  shorts: `<path d="M24 22v18c0 4 3 8 8 8l8-6 8 6c5 0 8-4 8-8V22h-6v14c0 2-1 4-2 4s-3-1-4-3l-4-3-4 3c-1 2-3 3-4 3s-2-2-2-4V22z" fill="#fff"/>`,
  skirt: `<path d="M40 22c-8 0-14 4-14 10l4 26h20l4-26c0-6-6-10-14-10zM28 38h24M30 46h20" fill="#fff"/>`,
};

const FALLBACK_INNER = [
  `<path d="M18 36 L22 64 L58 64 L62 36 Z" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>`,
  `<line x1="16" y1="36" x2="64" y2="36" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`,
].join("");

const memoized: Record<string, {inner: string; color: string}> = {};

export const getItemIcon = (itemName: string): string => {
  if (memoized[itemName]) {
    const {inner, color} = memoized[itemName];
    return toDataUri(buildSvg(inner, color));
  }

  const match = KEYWORDS.find(([re]) => re.test(itemName));
  const inner = match ? (PATHS[match[1]] ?? FALLBACK_INNER) : FALLBACK_INNER;
  const color = pickColor();
  memoized[itemName] = {inner, color};
  return toDataUri(buildSvg(inner, color));
};
