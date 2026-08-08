import { minimatch } from "minimatch";

/**
 * EngineeringSpec target glob dialect (authorization paths).
 * Deliberately boring so independent implementations can match.
 *
 * Allowed: literal segments, `*`, `**`, `?`
 * Forbidden: leading `!` / `#`, extglob, brace expansion, character classes
 */
const FORBIDDEN = [
  { re: /^!/, message: "leading ! negation is not allowed in target globs" },
  { re: /^#/, message: "leading # comments are not allowed in target globs" },
  { re: /[()]/, message: "extglob parentheses are not allowed in target globs" },
  { re: /[{}]/, message: "brace expansion is not allowed in target globs" },
  { re: /[[\]]/, message: "character classes are not allowed in target globs" },
  { re: /(^|\/)\.\.(\/|$)/, message: "parent-directory segments (..) are not allowed in target globs" },
] as const;

export function validateTargetGlob(pattern: string): string | undefined {
  if (!pattern || !pattern.trim()) return "target glob must be non-empty";
  if (pattern.includes("\\")) return "backslashes are not allowed in target globs; use /";
  for (const rule of FORBIDDEN) {
    if (rule.re.test(pattern)) return rule.message;
  }
  return undefined;
}

/** Match a repository-relative path against an EngineeringSpec target glob. */
export function matchTargetGlob(filePath: string, pattern: string): boolean {
  return minimatch(filePath, pattern, {
    dot: true,
    matchBase: false,
    nobrace: true,
    noext: true,
    nocomment: true,
    nonegate: true,
  });
}
