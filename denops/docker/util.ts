export function ensureString(arg: unknown): arg is string {
  const is = typeof arg === "string";
  if (!is) {
    throw new Error(`${arg} is not string`);
  }
  return is;
}

export function ensureBoolean(arg: unknown): arg is boolean {
  const is = typeof arg === "boolean";
  if (!is) {
    throw new Error(`${arg} is not boolean`);
  }
  return is;
}
