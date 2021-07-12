import { Denops } from "https://deno.land/x/denops_std@v1.0.0-beta.0/mod.ts";
import { HttpClient, Response } from "./http.ts";
import { runTerminal } from "./vim_util.ts";
import {
  Container,
  Image,
  InspectImage,
  removeContainerOpts,
  removeImageOpts,
  SearchImage,
} from "./types.ts";

export async function images(cli: HttpClient): Promise<Image[]> {
  const resp = await cli.get<Image[]>("/images/json");
  return resp.body;
}

export async function inspectImage(
  cli: HttpClient,
  name: string,
): Promise<InspectImage> {
  const resp = await cli.get<InspectImage>(`/images/${name}/json`);
  return resp.body;
}

export async function removeImage(
  cli: HttpClient,
  name: string,
  opts: removeImageOpts = { force: false, noprune: false },
): Promise<Response> {
  const resp = await cli.delete(`/images/${name}`, {
    params: {
      force: opts.force,
      noprune: opts.noprune,
    },
  });
  return resp;
}

export async function removeContainer(
  cli: HttpClient,
  name: string,
  opts: removeContainerOpts = { v: false, force: false, link: false },
) {
  await cli.delete(`/containers/${name}`, {
    params: {
      v: opts.v,
      force: opts.force,
      link: opts.link,
    },
  });
}

export async function containers(cli: HttpClient): Promise<Container[]> {
  const resp = await cli.get<Container[]>("/containers/json?all=1");
  return resp.body;
}

export async function pullImage(denops: Denops, name: string) {
  const [image, tag] = name.split(":");
  const fromImage = [image, ":", (tag || "latest")].join("");
  await runTerminal(denops, ["docker", "pull", fromImage]);
}

export async function searchImage(
  cli: HttpClient,
  name: string,
): Promise<SearchImage[]> {
  const resp = await cli.get<SearchImage[]>("/images/search", {
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
    "-it",
    "--entrypoint",
    "sh",
    name,
    "-c",
    `"[ -e /bin/bash ] && /bin/bash || sh"`,
  ];
  if (await denops.call("has", "nvim")) {
    cmd[cmd.length - 1] = `[ -e /bin/bash ] && /bin/bash || sh`;
  }
  await runTerminal(denops, cmd);
}

export async function attachContainer(denops: Denops, name: string) {
  const cmd = <string[]> [
    "docker",
    "exec",
    "-it",
    name,
    "sh",
    "-c",
    `"[ -e /bin/bash ] && /bin/bash || sh"`,
  ];
  if (await denops.call("has", "nvim")) {
    cmd[cmd.length - 1] = `[ -e /bin/bash ] && /bin/bash || sh`;
  }
  await runTerminal(denops, cmd);
}

export async function upContainer(
  cli: HttpClient,
  name: string,
): Promise<Response> {
  return await cli.post(`/containers/${name}/start`);
}

export async function stopContainer(cli: HttpClient, name: string) {
  await cli.post(`/containers/${name}/stop`);
}

export async function killContainer(
  cli: HttpClient,
  name: string,
): Promise<Response> {
  return await cli.post(`/containers/${name}/kill`);
}
