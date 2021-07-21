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

export function buildDockerCommand(line: string, command: string): string[] {
  const cols = line.split(" ").filter((v) => v != "");
  const result = command.match(/{(\d+)}/);
  if (result) {
    const target = result[0];
    const idx = parseInt(result[1]);
    if (cols.length <= idx) {
      console.log(`out of index ${idx} in ${cols}`);
      return [];
    }
    const cmd = command.replace(target, cols[idx]);
    return cmd.split(" ");
  }
  return command.split(" ");
}
