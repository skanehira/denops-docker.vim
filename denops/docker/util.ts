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

// from https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
export function formatBytes(bytes: number, decimals?: number) {
  if (bytes === 0) return "0 Bytes";
  if (!decimals) decimals = 2;

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
