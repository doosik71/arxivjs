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
