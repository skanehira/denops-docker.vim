import { Denops } from "https://deno.land/x/denops_std@v1.0.0-beta.0/mod.ts";
import { HttpClient } from "./http.ts";
import * as docker from "./docker.ts";
import { ensureString } from "./util.ts";
import { makeTableString } from "./table.ts";
import { BufferManager } from "./vim_buffer.ts";
import { KeyMap } from "./vim_map.ts";

export async function main(denops: Denops): Promise<void> {
  const bm = BufferManager.get(denops);
  const httpClient = await HttpClient.get();

  const commands: string[] = [
    `command! DockerImages call denops#notify("${denops.name}", "images", [])`,
    `command! DockerContainers call denops#notify("${denops.name}", "containers", [])`,
    `command! -nargs=1 DockerStartContainer call denops#notify("${denops.name}", "startContainer", [<q-args>])`,
    `command! -nargs=1 DockerStopContainer call denops#notify("${denops.name}", "stopContainerimages", [<q-args>])`,
  ];

  commands.forEach((cmd) => {
    denops.cmd(cmd);
  });

  denops.dispatcher = {
    async images() {
      const images = await docker.images(httpClient);
      const table = makeTableString(images);
      const buf = await bm.newBuffer({
        name: "images",
        opener: "tabnew",
        buftype: "nofile",
        maps: [new KeyMap("nnoremap", "q", ":bw!<CR>", ["<buffer>"])],
      });

      await bm.setbufline(buf.bufnr, 1, table);
    },

    async containers() {
      const containers = await docker.containers(httpClient);
      const table = makeTableString(containers);
      const buf = await bm.newBuffer({
        name: "containers",
        opener: "tabnew",
        buftype: "nofile",
        maps: [new KeyMap("nnoremap", "q", ":bw!<CR>", ["<buffer>"])],
      });

      await bm.setbufline(buf.bufnr, 1, table);
    },

    async pullImage(name: unknown) {
      if (ensureString(name)) {
        await docker.pullImage(denops, name);
      }
    },

    async inspectImage(name: unknown) {
      if (ensureString(name)) {
        const resp = await docker.inspectImage(httpClient, name);
        console.log(resp);
      }
    },

    async attachContainer(name: unknown) {
      if (ensureString(name)) {
        await docker.attachContainer(denops, name);
      }
    },

    async startContainer(name: unknown) {
      if (ensureString(name)) {
        console.log(`starting ${name}`);
        await docker.upContainer(httpClient, name);
        console.log(`started ${name}`);
      }
    },

    async stopContainer(name: unknown) {
      if (ensureString(name)) {
        console.log(`stopping ${name}`);
        await docker.stopContainer(httpClient, name);
        console.log(`stopped ${name}`);
      }
    },

    async killContainer(name: unknown) {
      if (ensureString(name)) {
        console.log(`kill ${name}`);
        await docker.killContainer(httpClient, name);
        console.log(`killed ${name}`);
      }
    },

    async searchImage(name: unknown) {
      if (ensureString(name)) {
        console.log(`search "${name}" start`);
        const images = await docker.searchImage(httpClient, name);
        console.table(images);
      }
    },

    async quickrunImage(name: unknown) {
      if (ensureString(name)) {
        await docker.quickrunImage(denops, name);
      }
    },

    async removeImage(name: unknown) {
      if (ensureString(name)) {
        await docker.removeImage(httpClient, name);
      }
    },

    async removeContainer(name: unknown) {
      if (ensureString(name)) {
        await docker.removeContainer(httpClient, name);
      }
    },
  };
}
