export const SUPPORTED_VERSION = "0.1";
export const MAX_FILE_SIZE = 2 * 1024 * 1024;
export const MAX_BLOCK_SIZE = 512 * 1024;
export const MAX_ITEMS = 10_000;
export const ID_PATTERN = /^[A-Z][A-Z0-9]*-[A-Za-z0-9][A-Za-z0-9._-]*$/;
export const RECOGNISED_BLOCKS = new Set([
  "engineering-source-refs", "engineering-targets", "engineering-decisions",
  "engineering-contracts", "engineering-constraints", "engineering-verification",
  "engineering-rollout", "engineering-evidence", "engineering-exceptions",
  "engineering-authority-controls",
]);
