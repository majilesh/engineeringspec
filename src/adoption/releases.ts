export const CURRENT_ACTION_SHA = "a23486e3bf4e4b175c06390406c2fd401a0f2515";

export interface IntegrationVersions {
  cliVersions: string[];
  actionPins: string[];
}

export function detectIntegrationVersions(texts: string[]): IntegrationVersions {
  const cliVersions = new Set<string>();
  const actionPins = new Set<string>();
  for (const text of texts) {
    for (const match of text.matchAll(/@engineeringspec\/cli@([0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?)/gu)) cliVersions.add(match[1]!);
    for (const match of text.matchAll(/majilesh\/engineeringspec@([0-9a-f]{40})/gu)) actionPins.add(match[1]!);
  }
  return { cliVersions: [...cliVersions].sort(), actionPins: [...actionPins].sort() };
}
