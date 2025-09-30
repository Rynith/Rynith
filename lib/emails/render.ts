import { renderToStaticMarkup } from "react-dom/server";

export function renderEmail(element: React.ReactElement) {
  const html = renderToStaticMarkup(element);
  // Minimal wrapper (helps some providers)
  return `<!doctype html><html><body>${html}</body></html>`;
}
