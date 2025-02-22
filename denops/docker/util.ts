import { Denops } from "jsr:@denops/std@^7.0.0";
import * as vars from "jsr:@denops/std@^7.0.0/variable";
import { Container, Image, SearchImage } from "./types.ts";

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

export async function getEntry<T>(denops: Denops, varname: string): Promise<T> {
  const entries = await vars.b.get(
    denops,
    varname,
  ) as T[];
  if (!entries || entries.length === 0) {
    throw new Error(`No ${varname} found`);
  }
  const idx = (await denops.call("line", ".") as number) - 2;
  return entries[idx];
}

export async function getContainer(denops: Denops): Promise<Container> {
  return await getEntry<Container>(denops, "docker_containers");
}

export async function getImage(denops: Denops): Promise<Image> {
  return await getEntry<Image>(denops, "docker_images");
}

export async function getImageName(denops: Denops): Promise<string> {
  const image = await getImage(denops);
  let name: string;
  if (
    !image.RepoTags ||
    (image.RepoTags && image.RepoTags[0] === "<none>:<none>")
  ) {
    name = image.Id.substring(7);
  } else {
    name = image.RepoTags[0];
  }
  return name;
}

export async function getSearchImage(denops: Denops): Promise<SearchImage> {
  return await getEntry<SearchImage>(denops, "docker_images");
}

export function formatDate(date: Date) {
  const pad = (n: number) => (n < 10 ? "0" + n : n);

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}
