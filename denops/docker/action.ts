import { Denops } from "./deps.ts";
import { HttpClient } from "./http.ts";
import { runTerminal } from "./vim_util.ts";
import * as docker from "./docker.ts";
import { makeTableString } from "./table.ts";
import { vars } from "./deps.ts";

export async function runDockerCLI(denops: Denops, args: unknown[]) {
  const cmd = new Array<string>("docker");
  (args as string[]).forEach((arg: string) => {
    cmd.push(arg);
  });
  await runTerminal(denops, cmd);
}

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

export async function attachContainer(denops: Denops, name: string) {
  await docker.attachContainer(denops, name);
}

export async function restartContainer(
  httpClient: HttpClient,
  name: string,
): Promise<boolean> {
  const resp = await docker.restartContainer(httpClient, name);
  return resp.status < 300;
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

export async function searchImage(
  httpClient: HttpClient,
  name: string,
): Promise<string[]> {
  console.log(`search "${name}" start`);
  const images = await docker.searchImage(httpClient, name);
  const table = makeTableString(images);
  return table;
}

export async function quickrunImage(denops: Denops, name: string) {
  await docker.quickrunImage(denops, name);
}

export async function removeImage(httpClient: HttpClient, name: string) {
  const resp = await docker.removeImage(httpClient, name);
  return resp.status <= 300;
}

export async function removeContainer(httpClient: HttpClient, name: string) {
  const resp = await docker.removeContainer(httpClient, name);
  return resp.status <= 300;
}

export async function copyFileToContainer(
  id: string,
  from: string,
  to: string,
): Promise<void> {
  await docker.copyFileToContainer(id, from, to);
}

export async function copyFileFromContainer(
  id: string,
  from: string,
  to: string,
): Promise<void> {
  await docker.copyFileFromContainer(id, from, to);
}

export async function inspect(denops: Denops, id: string) {
  await denops.cmd(
    `drop docker://inspect/${id}`,
  );
  const result = await docker.inspect(denops, id);
  await denops.call("setline", 1, result);
  await denops.cmd(
    "setlocal ft=json buftype=nofile bufhidden=hide nolist nomodifiable nomodified",
  );
}

export async function updateContainersBuffer(
  denops: Denops,
  httpClient: HttpClient,
) {
  const pos = await denops.call("getcurpos");
  await denops.cmd("silent setlocal modifiable | %d_");
  const containers = await docker.containers(httpClient);
  await vars.b.set(denops, "docker_containers", containers);
  await denops.batch(["setline", 1, makeTableString(containers)], [
    "setpos",
    ".",
    pos,
  ]);
}

export async function updateImagesBuffer(
  denops: Denops,
  httpClient: HttpClient,
) {
  const pos = await denops.call("getcurpos");
  await denops.cmd("silent setlocal modifiable | %d_");
  const images = await docker.images(httpClient);
  await vars.b.set(denops, "docker_images", images);
  await denops.batch(["setline", 1, makeTableString(images)], [
    "setpos",
    ".",
    pos,
  ]);
}
