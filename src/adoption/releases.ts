// The reviewed Visual Verification Brief runtime anchor: the trusted main commit that merged the bundled
// Action (action/cli.mjs). It already existed when this pin was written.
export const CURRENT_ACTION_SHA = "7360ea935bb19d49912f055ec509b364f9e6ad9b";

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
