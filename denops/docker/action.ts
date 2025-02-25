import { Denops } from "jsr:@denops/std@^7.0.0";
import * as vars from "jsr:@denops/std@^7.0.0/variable";
import open from "jsr:@rdsq/open@1.0.1";
import { runTerminal } from "./vim_util.ts";
import * as docker from "./docker.ts";
import { makeTableString } from "./table.ts";
import { Container } from "./types.ts";

export async function runDockerCLI(denops: Denops, args: unknown[]) {
  const cmd = new Array<string>("docker");
  (args as string[]).forEach((arg: string) => {
    cmd.push(arg);
  });
  await runTerminal(denops, cmd);
}

export async function getImages(): Promise<string[]> {
  const images = await docker.images();
  const table = makeTableString(images, "images");
  return table;
}

export async function getContainers(): Promise<string[]> {
  const containers = await docker.containers();
  const table = makeTableString(containers, "containers");
  return table;
}

export async function pullImage(denops: Denops, name: string) {
  await docker.pullImage(denops, name);
}

export async function attachContainer(denops: Denops, name: string) {
  await docker.attachContainer(denops, name);
}

export async function restartContainer(
  name: string,
): Promise<boolean> {
  const resp = await docker.restartContainer(name);
  return resp.status < 300;
}

export async function execContainer(
  denops: Denops,
  name: string,
) {
  const input = await denops.call("input", "command: ") as string;
  if (input) {
    const parts = input.split(" ");
    const command = parts.shift() as string;
    const args = parts;
    await docker.execContainer(denops, name, command, args);
  }
}

export async function tailContainerLogs(
  denops: Denops,
  name: string,
) {
  await docker.tailContainerLogs(denops, name);
}

export async function startContainer(
  name: string,
): Promise<boolean> {
  const resp = await docker.startContainer(name);
  return resp.status < 300;
}

export async function stopContainer(
  name: string,
): Promise<boolean> {
  const resp = await docker.stopContainer(name);
  return resp.status < 300;
}

async function getContainer(id: string): Promise<Container> {
  const containers = await docker.containers({
    all: true,
    filters: {
      id: [id],
    },
  });

  if (containers.length === 0) {
    throw new Error(`not found container: ${id}`);
  }

  return containers[0];
}

export async function killContainer(id: string) {
  try {
    const container = await getContainer(id);
    if (container.State !== "running") {
      throw new Error(`${id} is not running`);
    }
    const resp = await docker.killContainer(id);
    return resp.status < 300;
  } catch (e) {
    console.error((e as Error).message);
    return false;
  }
}

export async function openBrowser(denops: Denops, id: string) {
  const container = await getContainer(id);
  const choices: string[] = [];
  const ports: string[] = [];
  container.Ports.forEach((p, i) => {
    if (p.PublicPort) {
      const hostPort = `http://${p.IP}:${p.PublicPort}`;
      ports.push(hostPort);
      choices.push(`${i + 1}: ${hostPort}`);
    }
  });
  if (ports.length) {
    const choice = await denops.call("inputlist", choices) as number - 1;
    if (choice >= 0) {
      await open(ports[choice]);
    }
  }
}

export async function searchImage(
  name: string,
): Promise<string[]> {
  console.log(`search "${name}" start`);
  const images = await docker.searchImage(name);
  const table = makeTableString(images, "searchImages");
  return table;
}

export async function quickrunImage(denops: Denops, name: string) {
  await docker.quickrunImage(denops, name);
}

export async function removeImage(name: string) {
  const resp = await docker.removeImage(name);
  return resp.status <= 300;
}

export async function removeContainer(name: string) {
  const resp = await docker.removeContainer(name);
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
  const result = await docker.inspect(id);
  await denops.call("setline", 1, result.split("\n"));
  await denops.cmd(
    "setlocal ft=json buftype=nofile bufhidden=wipe nolist nomodifiable nomodified",
  );
}

export async function updateContainersBuffer(
  denops: Denops,
) {
  const pos = await denops.call("getcurpos");
  await denops.cmd("setlocal modifiable | silent %d_");
  const containers = await docker.containers();
  await vars.b.set(denops, "docker_containers", containers);
  await denops.batch(
    ["setline", 1, makeTableString(containers, "containers")],
    [
      "setpos",
      ".",
      pos,
    ],
  );
}

export async function updateImagesBuffer(
  denops: Denops,
) {
  const pos = await denops.call("getcurpos");
  await denops.cmd("setlocal modifiable | silent %d_");
  const images = await docker.images();
  await vars.b.set(denops, "docker_images", images);
  await denops.batch(["setline", 1, makeTableString(images, "images")], [
    "setpos",
    ".",
    pos,
  ]);
}
