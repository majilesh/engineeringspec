export const Codes = {
  missingFrontmatter:"ESP001", malformedYaml:"ESP002", missingBlock:"ESP003", duplicateBlock:"ESP004",
  unknownBlock:"ESP005", inputTooLarge:"ESP006", blockTooLarge:"ESP007", unsafeYaml:"ESP008",
  schema:"ESS001", unsupportedVersion:"ESV001", duplicateId:"ESR001", dangling:"ESR003",
  typedRef:"ESR008",
  traceability:"EST002", path:"ESPTH001", glob:"ESPTH002", profileUnavailable:"ESPR001", profileItem:"ESPR004",
  commandString:"ESEC002", invalidDigest:"ESEC003", expiredException:"ESR006", conflict:"ESR007",
  noDocuments:"ESD001",
  gateOutOfScope:"ESG001", gatePolicy:"ESG002", gateReadOnly:"ESG003", gateDiff:"ESG004",
  gateStatus:"ESG005", gateInterfaceOnly:"ESG006",
} as const;
