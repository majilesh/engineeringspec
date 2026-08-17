// This immutable pre-release commit contains RC14 trusted-base routing and
// implementation_with_monotonic_close enforcement. The release commit cannot
// safely pin itself, so adopters use this already-reviewed runtime.
export const CURRENT_ACTION_SHA = "ed2f0acaaa220baa574e97a200535373eca5aa0b";

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
