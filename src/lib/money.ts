// All monetary values stored as bigint paise in DB. UI converts.

export function paiseToRupees(paise: number | bigint): number {
  return Number(paise) / 100;
}

export function rupeesToPaise(rupees: number | string): number {
  const n = typeof rupees === 'string' ? Number(rupees) : rupees;
  if (!Number.isFinite(n)) throw new Error(`Invalid rupees: ${rupees}`);
  return Math.round(n * 100);
}

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const inrWithPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2
});

export function formatPaise(paise: number | bigint, opts?: { showPaise?: boolean }): string {
  const rupees = paiseToRupees(paise);
  return opts?.showPaise ? inrWithPaise.format(rupees) : inr.format(rupees);
}

export function formatSignedPaise(paise: number | bigint): string {
  const n = Number(paise);
  const abs = formatPaise(Math.abs(n));
  if (n > 0) return `+${abs}`;
  if (n < 0) return `−${abs}`;
  return abs;
}

// Split `amount` into `n` near-equal parts summing exactly to `amount`.
// Remainder (amount mod n) goes to the first `r` parts (one extra paisa each).
export function equalSplit(amountPaise: number, n: number): number[] {
  if (n <= 0) throw new Error('n must be positive');
  const base = Math.floor(amountPaise / n);
  const remainder = amountPaise - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}
