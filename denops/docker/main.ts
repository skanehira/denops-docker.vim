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

async function getID(bm: BufferManager, bufnr: number): Promise<string> {
  const line = await bm.getbufline(bufnr, 'line(".")');
  const [id] = line[0].split(" ", 1);
  return id;
}

async function getName(bm: BufferManager, bufnr: number): Promise<string> {
  const line = await bm.getbufline(bufnr, 'line(".")');
  const [_, name] = line[0].split(" ", 2);
  return name;
}

async function inspect(denops: Denops, bm: BufferManager, id: string) {
  const result = await docker.inspectImage(denops, id);
  const buf = await bm.newBuffer({
    name: id,
    opener: "drop",
    buftype: "nofile",
    ft: "json",
    maps: [
      new KeyMap("nnoremap", "q", ":bw!<CR>", ["<buffer>", "<silent>"]),
    ],
  });
  await bm.setbufline(buf.bufnr, 1, result);
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
      if (await bm.bufexists(imageBuffer.bufnr)) {
        await bm.openBuffer(imageBuffer.bufnr);
        return;
      }
      imageBuffer = await bm.newBuffer({
        name: "images",
        opener: "drop",
        buftype: "nofile",
        maps: [
          new KeyMap("nnoremap", "q", ":bw!<CR>", ["<buffer>", "<silent>"]),
          new KeyMap(
            "nnoremap",
            "r",
            `:call denops#notify("${denops.name}", "quickrunImage", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
          new KeyMap(
            "nnoremap",
            "<CR>",
            `:call denops#notify("${denops.name}", "inspectImage", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
        ],
      });
      const images = await getImages(httpClient);
      await bm.setbufline(imageBuffer.bufnr, 1, images);

      await autocmd.group(denops, "denops_docker_images", (helper) => {
        helper.define(
          "BufWipeout",
          "<buffer>",
          `call denops#notify("${denops.name}", "beforeImagesBufferDelete", [])`,
        );
      });
    },

    async containers() {
      if (await bm.bufexists(containerBuffer.bufnr)) {
        await bm.openBuffer(containerBuffer.bufnr);
        return;
      }
      containerBuffer = await bm.newBuffer({
        name: "containers",
        opener: "drop",
        buftype: "nofile",
        wrap: "nowrap",
        maps: [
          new KeyMap("nnoremap", "q", ":bw!<CR>", ["<buffer>", "<silent>"]),
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
            "<C-k>",
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
            "t",
            `:call denops#notify("${denops.name}", "tailContainerLogs", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
          new KeyMap(
            "nnoremap",
            "<C-d>",
            `:call denops#notify("${denops.name}", "removeContainer", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
          new KeyMap(
            "nnoremap",
            "<CR>",
            `:call denops#notify("${denops.name}", "inspectContainer", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
        ],
      });

      const containers = await getContainers(httpClient);
      await bm.setbufline(containerBuffer.bufnr, 1, containers);

      intervalTimerID = setInterval(() => {
        updateContainerBuffer(containerBuffer.bufnr, bm, httpClient);
      }, 5000);

      await autocmd.group(denops, "denops_docker_containers", (helper) => {
        helper.define(
          "BufWipeout",
          "<buffer>",
          `call denops#notify("${denops.name}", "beforeContainersBufferDelete", [])`,
        );
      });
    },

    beforeContainersBufferDelete() {
      clearInterval(intervalTimerID);
      containerBuffer = { bufnr: -1 } as Buffer;
      return Promise.resolve();
    },

    beforeImagesBufferDelete() {
      imageBuffer = { bufnr: -1 } as Buffer;
      return Promise.resolve();
    },

    async pullImage(name: unknown) {
      if (ensureString(name)) {
        await docker.pullImage(denops, name);
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

    async inspectImage() {
      const id = await getID(bm, imageBuffer.bufnr);
      await inspect(denops, bm, id);
    },

    async inspectContainer() {
      const name = await getName(bm, containerBuffer.bufnr);
      await inspect(denops, bm, name);
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
