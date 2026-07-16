export const slugifyPaperTitle = (title) => String(title || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/_+/g, '_')
  .replace(/^_+|_+$/g, '');

export const getPaperId = (paper) => {
  if (paper?.id) {
    return paper.id;
  }

  return slugifyPaperTitle(paper?.title);
};

// Mirrors the backend's citationTitlesMatch (index.js) - used for dedup when
// a paper may have no url to compare (manual source), so title is the only
// identity signal available.
const normalizeTitleForMatch = (title) => String(title || '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const titlesLikelyMatch = (a, b) => {
  const left = normalizeTitleForMatch(a);
  const right = normalizeTitleForMatch(b);

  if (!left || !right) {
    return false;
  }

  return left === right || left.includes(right) || right.includes(left);
};
