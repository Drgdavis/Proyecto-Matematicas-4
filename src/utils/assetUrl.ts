/** Resolve files in public/ for both localhost and a subpath deployment. */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}
