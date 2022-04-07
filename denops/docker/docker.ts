import { Denops } from "./deps.ts";
import * as http from "./http.ts";
import { runTerminal } from "./vim_util.ts";
import {
  Container,
  ContainerListParams,
  Image,
  removeContainerOpts,
  removeImageOpts,
  SearchImage,
} from "./types.ts";

const dec = new TextDecoder();

export async function images(): Promise<Image[]> {
  const resp = await http.get<Image[]>("/images/json");
  const images: Image[] = [];
  // NOTE: to be able remove image when same id
  for (const image of resp.body) {
    if (image.RepoTags && image.RepoTags.length > 1) {
      for (const tag of image.RepoTags) {
        const i: Image = Object.assign({}, image);
        i.RepoTags = [tag];
        images.push(i);
      }
    } else {
      images.push(image);
    }
  }
  return images;
}

export async function inspect(
  id: string,
): Promise<string[]> {
  const p = Deno.run({
    cmd: ["docker", "inspect", id],
    stdout: "piped",
    stderr: "piped",
  });

  const output = await p.output();
  p.close();
  const result = dec.decode(output);
  return result.split("\n");
}

export async function removeImage(
  name: string,
  opts: removeImageOpts = { force: false, noprune: false },
): Promise<http.Response> {
  const resp = await http.del(`/images/${name}`, {
    params: {
      force: opts.force,
      noprune: opts.noprune,
    },
  });
  return resp;
}

export async function removeContainer(
  name: string,
  opts: removeContainerOpts = { v: false, force: false, link: false },
): Promise<http.Response> {
  const resp = await http.del(`/containers/${name}`, {
    params: {
      v: opts.v,
      force: opts.force,
      link: opts.link,
    },
  });
  return resp;
}

export async function containers(
  filters?: ContainerListParams,
): Promise<Container[]> {
  const params = Object.entries(filters ?? { all: true }).map((o) => {
    const [k, v] = o;
    if (k === "filters") {
      return `${k}=${JSON.stringify(v)}`;
    }
    return `${k}=${v}`;
  }).join("&");
  const url = `/containers/json?${params}`;
  const resp = await http.get<Container[]>(url);
  return resp.body;
}

export async function pullImage(denops: Denops, name: string) {
  const [image, tag] = name.split(":");
  const fromImage = [image, ":", tag || "latest"].join("");
  await runTerminal(denops, ["docker", "pull", fromImage]);
}

export async function searchImage(
  name: string,
): Promise<SearchImage[]> {
  const resp = await http.get<SearchImage[]>("/images/search", {
    params: {
      term: name,
      limit: 100,
    },
  });
  return resp.body;
}

export async function quickrunImage(denops: Denops, name: string) {
  const cmd = <string[]> [
    "docker",
    "run",
    "--rm",
    "-it",
    "--detach-keys=ctrl-\\",
    "--entrypoint",
    "sh",
    name,
    "-c",
    "[ -e /bin/bash ] || [ -e /usr/local/bin/bash ] && bash || sh",
  ];
  await runTerminal(denops, cmd);
}

export async function attachContainer(denops: Denops, name: string) {
  const cmd = <string[]> [
    "docker",
    "exec",
    "-it",
    "--detach-keys=ctrl-\\",
    name,
    "sh",
    "-c",
    "[ -e /bin/bash ] || [ -e /usr/local/bin/bash ] && bash || sh",
  ];
  await runTerminal(denops, cmd);
}

export async function execContainer(
  denops: Denops,
  name: string,
  command: string,
  args: string[],
) {
  const cmd = <string[]> [
    "docker",
    "exec",
    "-it",
    "--detach-keys=ctrl-\\",
    name,
    command,
  ];
  cmd.push(...args);
  await runTerminal(denops, cmd);
}

export async function tailContainerLogs(denops: Denops, name: string) {
  const cmd = <string[]> [
    "docker",
    "logs",
    "-f",
    name,
  ];
  await runTerminal(denops, cmd);
}

export async function startContainer(
  name: string,
): Promise<http.Response> {
  return await http.post(`/containers/${name}/start`);
}

export async function stopContainer(
  name: string,
): Promise<http.Response> {
  return await http.post(`/containers/${name}/stop`);
}

export async function killContainer(
  name: string,
): Promise<http.Response> {
  return await http.post(`/containers/${name}/kill`);
}

export async function restartContainer(
  name: string,
): Promise<http.Response> {
  return await http.post(`/containers/${name}/restart`);
}

export async function copyFileToContainer(
  id: string,
  from: string,
  to: string,
): Promise<void> {
  const opt: Deno.RunOptions = {
    cmd: [
      "docker",
      "cp",
      from,
      `${id}:${to}`,
    ],
    stdin: "null",
    stdout: "null",
    stderr: "piped",
  };

  const p = Deno.run(opt);
  const status = await p.status();
  if (!status.success) {
    const error = await p.stderrOutput();
    throw new Error(`failed to copy file to container: ${dec.decode(error)}`);
  }
  p.stderr?.close();
  p.close();
}

export async function copyFileFromContainer(
  id: string,
  from: string,
  to: string,
): Promise<void> {
  const opt: Deno.RunOptions = {
    cmd: [
      "docker",
      "cp",
      `${id}:${from}`,
      to,
    ],
    stdin: "null",
    stdout: "null",
    stderr: "piped",
  };

  const p = Deno.run(opt);
  const status = await p.status();
  if (!status.success) {
    const error = await p.stderrOutput();
    throw new Error(`failed to copy file from container: ${dec.decode(error)}`);
  }
  p.stderr?.close();
  p.close();
}
