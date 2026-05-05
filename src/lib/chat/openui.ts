export function looksLikeOpenUiLang(text: string | null | undefined): boolean {
  if (typeof text !== "string") return false
  return /^\s*root\s*=/.test(text.trim())
}
