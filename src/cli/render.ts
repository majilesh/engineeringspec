export function displaySafe(value: string): string {
  const withoutControls = [...value].map((character) => {
    const codePoint = character.codePointAt(0)!;
    const unsafe = codePoint <= 0x1f
      || (codePoint >= 0x7f && codePoint <= 0x9f)
      || codePoint === 0x061c
      || codePoint === 0x200e
      || codePoint === 0x200f
      || (codePoint >= 0x202a && codePoint <= 0x202e)
      || (codePoint >= 0x2066 && codePoint <= 0x2069);
    return unsafe ? " " : character;
  }).join("");
  return withoutControls.replace(/\s+/gu, " ").trim();
}

export function markdownText(value: string): string {
  const escaped = displaySafe(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return ["[", "]", "`", "*", "_", "{", "}", "|"].reduce((text, character) => text.replaceAll(character, `\\${character}`), escaped);
}

export function markdownCode(value: string): string {
  const safe = displaySafe(value);
  const longest = Math.max(0, ...([...safe.matchAll(/`+/gu)].map((match) => match[0].length)));
  const delimiter = "`".repeat(longest + 1);
  return `${delimiter} ${safe} ${delimiter}`;
}
