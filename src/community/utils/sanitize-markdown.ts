import sanitizeHtml from 'sanitize-html';

export function sanitizeMarkdown(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
}
