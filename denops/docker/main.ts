import { Denops } from "https://deno.land/x/denops_std@v1.0.0-beta.0/mod.ts";
import * as autocmd from "https://deno.land/x/denops_std@v1.0.0-beta.8/autocmd/mod.ts";
import { HttpClient } from "./http.ts";
import * as docker from "./docker.ts";
import { ensureString } from "./util.ts";
import { Buffer, BufferManager } from "./vim_buffer.ts";
import { KeyMap } from "./vim_map.ts";
import {
  attachContainer,
  execContainer,
  getContainers,
  getImages,
  quickrunImage,
  removeContainer,
  startContainer,
  stopContainer,
} from "./action.ts";

async function getName(bm: BufferManager, bufnr: number): Promise<string> {
  const line = await bm.getbufline(bufnr, 'line(".")');
  const [_, name] = line[0].split(" ", 2);
  return name;
}

async function updateContainerBuffer(
  bufnr: number,
  bm: BufferManager,
  httpClient: HttpClient,
) {
  const containers = await getContainers(httpClient);
  await bm.setbufline(bufnr, 1, containers);
}

export async function main(denops: Denops): Promise<void> {
  const bm = BufferManager.get(denops);
  const httpClient = await HttpClient.get();
  let intervalTimerID = 0;

  const commands: string[] = [
    `command! DockerImages call denops#notify("${denops.name}", "images", [])`,
    `command! DockerContainers call denops#notify("${denops.name}", "containers", [])`,
  ];

  commands.forEach((cmd) => {
    denops.cmd(cmd);
  });

  let containerBuffer = { bufnr: -1 } as Buffer;
  let imageBuffer = { bufnr: -1 } as Buffer;

  denops.dispatcher = {
    async images() {
      if (await bm.bufexists(containerBuffer.bufnr)) {
        bm.openBuffer(containerBuffer.bufnr);
        return;
      }
      const images = await getImages(httpClient);
      imageBuffer = await bm.newBuffer({
        name: "images",
        opener: "tabnew",
        buftype: "nofile",
        maps: [
          new KeyMap("nnoremap", "q", ":bw!<CR>", ["<buffer>"]),
          new KeyMap(
            "nnoremap",
            "r",
            `:call denops#notify("${denops.name}", "quickrunImage", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
        ],
      });
      await bm.setbufline(imageBuffer.bufnr, 1, images);
    },

    async containers() {
      if (await bm.bufexists(containerBuffer.bufnr)) {
        bm.openBuffer(containerBuffer.bufnr);
        return;
      }
      const containers = await getContainers(httpClient);
      containerBuffer = await bm.newBuffer({
        name: "containers",
        opener: "tabnew",
        buftype: "nofile",
        wrap: "nowrap",
        maps: [
          new KeyMap("nnoremap", "q", ":bw!<CR>", ["<buffer>"]),
          new KeyMap(
            "nnoremap",
            "u",
            `:call denops#notify("${denops.name}", "startContainer", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
          new KeyMap(
            "nnoremap",
            "d",
            `:call denops#notify("${denops.name}", "stopContainer", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
          new KeyMap(
            "nnoremap",
            "f",
            `:call denops#notify("${denops.name}", "killContainer", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
          new KeyMap(
            "nnoremap",
            "a",
            `:call denops#notify("${denops.name}", "attachContainer", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
          new KeyMap(
            "nnoremap",
            "e",
            `:call denops#notify("${denops.name}", "execContainer", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
          new KeyMap(
            "nnoremap",
            "l",
            `:call denops#notify("${denops.name}", "tailContainerLogs", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
          new KeyMap(
            "nnoremap",
            "<C-d>",
            `:call denops#notify("${denops.name}", "removeContainer", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
        ],
      });

      await bm.setbufline(containerBuffer.bufnr, 1, containers);

      intervalTimerID = setInterval(() => {
        updateContainerBuffer(containerBuffer.bufnr, bm, httpClient);
      }, 5000);

      await autocmd.group(denops, "denops_docker", (helper) => {
        helper.define(
          "BufWipeout",
          "<buffer>",
          `call denops#notify("${denops.name}", "clearInterval", [])`,
        );
      });
    },

    clearInterval() {
      clearInterval(intervalTimerID);
      return Promise.resolve();
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

    async attachContainer() {
      const name = await getName(bm, containerBuffer.bufnr);
      await attachContainer(denops, name);
    },

    async execContainer() {
      const name = await getName(bm, containerBuffer.bufnr);
      const input = await denops.eval(`input("command: ")`) as string;
      if (input) {
        const parts = input.split(" ");
        const cmd = parts.shift() as string;
        const args = parts;
        await execContainer(denops, name, cmd, args);
      } else {
        console.log("canceled");
      }
    },

    async startContainer() {
      const name = await getName(bm, containerBuffer.bufnr);
      console.log(`starting ${name}`);
      if (await startContainer(httpClient, name)) {
        console.log(`started ${name}`);
        const containers = await getContainers(httpClient);
        await bm.setbufline(containerBuffer.bufnr, 1, containers);
      }
    },

    async stopContainer() {
      const name = await getName(bm, containerBuffer.bufnr);
      console.log(`stopping ${name}`);
      if (await stopContainer(httpClient, name)) {
        console.log(`stoped ${name}`);
        const containers = await getContainers(httpClient);
        await bm.setbufline(containerBuffer.bufnr, 1, containers);
      }
    },

    async killContainer() {
      const name = await getName(bm, containerBuffer.bufnr);
      console.log(`killing ${name}`);
      if (await docker.killContainer(httpClient, name)) {
        console.log(`killed ${name}`);
        const containers = await getContainers(httpClient);
        await bm.setbufline(containerBuffer.bufnr, 1, containers);
      }
    },

    async tailContainerLogs() {
      const name = await getName(bm, containerBuffer.bufnr);
      await docker.tailContainerLogs(denops, name);
    },

    async searchImage(name: unknown) {
      if (ensureString(name)) {
        console.log(`search "${name}" start`);
        const images = await docker.searchImage(httpClient, name);
        console.table(images);
      }
    },

    async quickrunImage() {
      const name = await getName(bm, imageBuffer.bufnr);
      await quickrunImage(denops, name);
    },

    async removeImage(name: unknown) {
      if (ensureString(name)) {
        await docker.removeImage(httpClient, name);
      }
    },

    async removeContainer() {
      const name = await getName(bm, containerBuffer.bufnr);
      const input = await denops.eval(
        `input("Do you want to remove ${name}?(y/n): ")`,
      ) as string;
      if (input && input === "y" || input === "Y") {
        if (await removeContainer(httpClient, name)) {
          console.log(`removed ${name}`);
          const containers = await getContainers(httpClient);
          await bm.setbufline(containerBuffer.bufnr, 1, containers);
        }
      } else {
        console.log("canceled");
      }
    },
  };
}
