export function getRuntimeValue(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}
