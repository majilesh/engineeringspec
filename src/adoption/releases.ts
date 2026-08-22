// This pre-existing immutable commit contains the reviewed RC16 Action runtime,
// including trusted maintenance sequencing. Pin alignment occurs afterward.
export const CURRENT_ACTION_SHA = "ddf813e4e69d9b2f9a9eb3f0f241747746021cf3";

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
