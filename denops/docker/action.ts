import { Denops } from "https://deno.land/x/denops_std@v1.0.0-beta.0/mod.ts";
import { HttpClient } from "./http.ts";
import * as docker from "./docker.ts";
import { makeTableString } from "./table.ts";

export async function getImages(httpClient: HttpClient): Promise<string[]> {
  const images = await docker.images(httpClient);
  const table = makeTableString(images);
  return table;
}

export async function getContainers(httpClient: HttpClient): Promise<string[]> {
  const containers = await docker.containers(httpClient);
  const table = makeTableString(containers);
  return table;
}

export async function pullImage(denops: Denops, name: string) {
  await docker.pullImage(denops, name);
}

export async function inspectImage(httpClient: HttpClient, name: string) {
  const resp = await docker.inspectImage(httpClient, name);
  console.log(resp);
}

export async function attachContainer(denops: Denops, name: string) {
  await docker.attachContainer(denops, name);
}

export async function execContainer(
  denops: Denops,
  name: string,
  command: string,
  args: string[],
) {
  await docker.execContainer(denops, name, command, args);
}

export async function tailContainerLogs(
  denops: Denops,
  name: string,
) {
  await docker.tailContainerLogs(denops, name);
}

export async function startContainer(
  httpClient: HttpClient,
  name: string,
): Promise<boolean> {
  const resp = await docker.startContainer(httpClient, name);
  return resp.status < 300;
}

export async function stopContainer(
  httpClient: HttpClient,
  name: string,
): Promise<boolean> {
  const resp = await docker.stopContainer(httpClient, name);
  return resp.status < 300;
}

export async function killContainer(httpClient: HttpClient, name: string) {
  const resp = await docker.killContainer(httpClient, name);
  return resp.status < 300;
}

export async function searchImage(httpClient: HttpClient, name: string) {
  console.log(`search "${name}" start`);
  const images = await docker.searchImage(httpClient, name);
  console.table(images);
}

export async function quickrunImage(denops: Denops, name: string) {
  await docker.quickrunImage(denops, name);
}

export async function removeImage(httpClient: HttpClient, name: string) {
  const resp = await docker.removeImage(httpClient, name);
  if (resp.status >= 300) {
    console.log(`failed to remove ${name}`);
  } else {
    console.log(`removed ${name}`);
  }
}

export async function removeContainer(httpClient: HttpClient, name: string) {
  const resp = await docker.removeContainer(httpClient, name);
  if (resp.status >= 300) {
    console.log(`failed to remove ${name}`);
  } else {
    console.log(`removed ${name}`);
  }
}
