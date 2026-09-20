export function normalizeUrl(input: string, allowMail = true): string {
  const value = input.trim();
  if (!value) throw new Error("Indique une destination.");
  if (allowMail && /^mailto:[^\s@]+@[^\s@]+$/i.test(value)) return value;
  if (/^[a-z][a-z\d+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) throw new Error("Utilise une adresse HTTP ou HTTPS.");
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`); }
  catch { throw new Error("Cette adresse n’est pas valide."); }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) throw new Error("Cette adresse n’est pas valide.");
  return url.href;
}
