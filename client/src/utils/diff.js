/**
 * Line-by-line difference between two versions of a prompt, using the classic
 * Longest Common Subsequence (LCS) dynamic-programming table.
 * Returns [{ type: 'same' | 'added' | 'removed', text }] in reading order.
 * Prompts are small (a few hundred lines at most), so O(n·m) is fine.
 */
export function diffLines(oldText = '', newText = '') {
  const a = oldText === '' ? [] : oldText.split('\n');
  const b = newText === '' ? [] : newText.split('\n');
  const n = a.length;
  const m = b.length;

  // lcs[i][j] = length of the LCS of a[i..] and b[j..]
  const lcs = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const out = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: 'same', text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ type: 'removed', text: a[i++] });
    } else {
      out.push({ type: 'added', text: b[j++] });
    }
  }
  while (i < n) out.push({ type: 'removed', text: a[i++] });
  while (j < m) out.push({ type: 'added', text: b[j++] });
  return out;
}

/** Counts for a summary like "+3 −1". */
export function diffStats(lines) {
  return lines.reduce(
    (acc, l) => {
      if (l.type === 'added') acc.added += 1;
      if (l.type === 'removed') acc.removed += 1;
      return acc;
    },
    { added: 0, removed: 0 }
  );
}
