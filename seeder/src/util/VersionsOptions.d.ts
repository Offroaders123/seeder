import type { VERSIONS } from "./constants.js";

export interface VersionsOptions<K extends keyof typeof VERSIONS = keyof typeof VERSIONS> {
  label: K;
  value: typeof VERSIONS[K];
}