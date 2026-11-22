/**
 * Resolves static public asset paths reliably across both root Express hosting
 * and GitHub Pages sub-path hosting (e.g. https://<user>.github.io/<repo>/).
 */
export function resolveAssetUrl(assetPath: string): string {
  if (!assetPath) return '';
  const trimmed = assetPath.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  const base = (import.meta.env.BASE_URL || './').replace(/\/?$/, '/');
  const cleanRelative = trimmed.replace(/^(\.\/|\/)+/, '');
  return `${base}${cleanRelative}`;
}
