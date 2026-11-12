import qrcode from "qrcode-generator";

// The QR code's squares, row by row: true = dark.
export function qrMatrix(text: string): boolean[][] {
  // "M" still scans with a crease or a smudge on a printed sheet.
  const code = qrcode(0, "M");
  code.addData(text);
  code.make();
  const size = code.getModuleCount();
  return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, column) => code.isDark(row, column)));
}

export const POSTER = { width: 1080, height: 1440 } as const;
// The empty frame a scanner needs around the code, in squares.
const QUIET_ZONE = 4;
const QR_SIZE = 760;
const INK = "#1b1613";
const MUTED = "#5f5650";

// Splits text over at most maxLines lines that fit maxWidth. Thai and Khmer
// have no spaces, so the browser's own word breaks are used where it has them.
export function wrapLines(
  text: string,
  maxLines: number,
  fits: (line: string) => boolean,
  words: (text: string) => string[] = segmentWords,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of words(text.trim())) {
    if (!line.trim() || fits((line + word).trimEnd())) {
      line += word;
      continue;
    }
    lines.push(line.trim());
    line = word.trimStart();
  }
  if (line.trim()) lines.push(line.trim());
  if (lines.length <= maxLines) return lines;

  // Too long: the last line ends in "…".
  let last = lines.slice(maxLines - 1).join(" ");
  while (last.length > 1 && !fits(`${last}…`)) last = last.slice(0, -1).trimEnd();
  return [...lines.slice(0, maxLines - 1), `${last}…`];
}

function segmentWords(text: string): string[] {
  if (typeof Intl.Segmenter === "function") {
    return [...new Intl.Segmenter(undefined, { granularity: "word" }).segment(text)].map((part) => part.segment);
  }
  return text.split(/(?<=\s)/);
}

export type PosterContent = {
  shopName: string;
  // "Scan to see our products and order".
  caption: string;
  // "shelfie.app/kamal-stores", for people who can't scan.
  linkLabel: string;
  url: string;
  fontFamily: string;
};

// A sheet to print and put on the counter: always dark on white, whatever
// the store's colours, so it scans and prints cleanly.
export function drawPoster(canvas: HTMLCanvasElement, { shopName, caption, linkLabel, url, fontFamily }: PosterContent) {
  canvas.width = POSTER.width;
  canvas.height = POSTER.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn't available");
  const center = POSTER.width / 2;
  const maxText = POSTER.width - 160;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, POSTER.width, POSTER.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = INK;
  ctx.font = `800 84px ${fontFamily}`;
  const nameLines = wrapLines(shopName, 2, (line) => ctx.measureText(line).width <= maxText);
  // One line sits where two would be centered.
  const nameTop = nameLines.length === 1 ? 190 : 140;
  nameLines.forEach((line, index) => ctx.fillText(line, center, nameTop + index * 104, maxText));

  const matrix = qrMatrix(url);
  const cell = QR_SIZE / (matrix.length + 2 * QUIET_ZONE);
  const left = center - QR_SIZE / 2 + QUIET_ZONE * cell;
  const top = 330 + QUIET_ZONE * cell;
  ctx.fillStyle = "#000000";
  matrix.forEach((row, y) =>
    row.forEach((dark, x) => {
      // Whole pixels, a hair oversized: no white seams between squares.
      if (dark) ctx.fillRect(Math.floor(left + x * cell), Math.floor(top + y * cell), Math.ceil(cell), Math.ceil(cell));
    }),
  );

  ctx.fillStyle = INK;
  ctx.font = `700 52px ${fontFamily}`;
  wrapLines(caption, 2, (line) => ctx.measureText(line).width <= maxText).forEach((line, index) =>
    ctx.fillText(line, center, 1180 + index * 68, maxText),
  );

  // A long link gets smaller letters, not squeezed ones.
  ctx.fillStyle = MUTED;
  let linkSize = 38;
  ctx.font = `600 ${linkSize}px ${fontFamily}`;
  while (linkSize > 22 && ctx.measureText(linkLabel).width > maxText) {
    linkSize -= 2;
    ctx.font = `600 ${linkSize}px ${fontFamily}`;
  }
  ctx.fillText(linkLabel, center, 1350, maxText);
}
