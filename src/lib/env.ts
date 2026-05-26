export function cleanEnvValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim() || undefined;
  }
  return trimmed;
}

export function envValue(name: string): string | undefined {
  return cleanEnvValue(process.env[name]);
}

export function hasEnvValue(name: string): boolean {
  return Boolean(envValue(name));
}
