import { sanitizeMarkdown } from './sanitize-markdown';

describe('sanitizeMarkdown', () => {
  it('keeps pure markdown unchanged', () => {
    expect(sanitizeMarkdown('**bold**')).toBe('**bold**');
    expect(sanitizeMarkdown('[link](https://example.com)')).toBe(
      '[link](https://example.com)',
    );
    expect(sanitizeMarkdown('![img](/uploads/x.png)')).toBe(
      '![img](/uploads/x.png)',
    );
  });

  it('removes script tags and content', () => {
    expect(sanitizeMarkdown('<script>alert(1)</script>**bold**')).toBe(
      '**bold**',
    );
  });

  it('removes iframes', () => {
    expect(sanitizeMarkdown('<iframe src="x"></iframe>texto')).toBe('texto');
  });

  it('removes img tags with handlers', () => {
    expect(sanitizeMarkdown('<img src=x onerror=alert(1)>hola')).toBe('hola');
  });

  it('strips tags and keeps inner text', () => {
    expect(sanitizeMarkdown('<div>texto</div>')).toBe('texto');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeMarkdown('')).toBe('');
  });
});
