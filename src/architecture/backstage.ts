import { readFile, stat } from "node:fs/promises";
import { parseAllDocuments } from "yaml";
import { compareCodePoints } from "../normalizer/canonicalize.js";

const MAX_ARCHITECTURE_BYTES = 1024 * 1024;
const MAX_ARCHITECTURE_ENTITIES = 1_000;
const PATH_ANNOTATION = "engineeringspec.org/paths";
const STANDARDS_ANNOTATION = "engineeringspec.org/standards";

export interface ArchitectureComponent {
  id: string;
  owner?: string;
  system?: string;
  dependencies: string[];
  standards: string[];
  paths: string[];
  source: { file: string; document: number };
}

export interface ArchitectureMap {
  format: "engineering-architecture-map";
  version: "0.1";
  authority: "read_only";
  components: ArchitectureComponent[];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function annotationList(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value.split(/[\n,]/u).map((item) => item.trim()).filter(Boolean);
}

function safePathMapping(value: string): boolean {
  return value.length <= 512 && !value.startsWith("/") && !value.includes("\\") && !value.split("/").includes("..") && !value.includes("\0");
}

export async function importBackstageCatalogue(file: string): Promise<ArchitectureMap> {
  const details = await stat(file);
  if (!details.isFile() || details.size > MAX_ARCHITECTURE_BYTES) throw new Error("Architecture source must be a bounded file");
  const source = await readFile(file, "utf8");
  const documents = parseAllDocuments(source, { strict: true, uniqueKeys: true });
  if (documents.length > MAX_ARCHITECTURE_ENTITIES) throw new Error(`Architecture entity limit exceeded (${documents.length} > ${MAX_ARCHITECTURE_ENTITIES})`);
  const components: ArchitectureComponent[] = [];
  for (const [index, document] of documents.entries()) {
    if (document.errors.length > 0) throw new Error(`Invalid architecture YAML document ${index + 1}: ${document.errors[0]!.message}`);
    const entity = document.toJS({ maxAliasCount: 50 }) as Record<string, unknown> | null;
    if (!entity || entity.kind !== "Component") continue;
    const metadata = (entity.metadata ?? {}) as Record<string, unknown>;
    const spec = (entity.spec ?? {}) as Record<string, unknown>;
    const annotations = (metadata.annotations ?? {}) as Record<string, unknown>;
    if (typeof metadata.name !== "string" || !metadata.name) throw new Error(`Component document ${index + 1} is missing metadata.name`);
    const paths = annotationList(annotations[PATH_ANNOTATION]);
    if (paths.some((item) => !safePathMapping(item))) throw new Error(`Component ${metadata.name} has an unsafe ${PATH_ANNOTATION} value`);
    components.push({
      id: metadata.name,
      ...(typeof spec.owner === "string" ? { owner: spec.owner } : {}),
      ...(typeof spec.system === "string" ? { system: spec.system } : {}),
      dependencies: strings(spec.dependsOn).sort(compareCodePoints),
      standards: annotationList(annotations[STANDARDS_ANNOTATION]).sort(compareCodePoints),
      paths: paths.sort(compareCodePoints),
      source: { file, document: index + 1 },
    });
  }
  components.sort((left, right) => compareCodePoints(left.id, right.id));
  const duplicate = components.find((component, index) => components[index - 1]?.id === component.id);
  if (duplicate) throw new Error(`Architecture component id ${duplicate.id} is duplicated`);
  return { format: "engineering-architecture-map", version: "0.1", authority: "read_only", components };
}
