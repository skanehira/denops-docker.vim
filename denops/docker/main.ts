import { Denops } from "https://deno.land/x/denops_std@v1.0.0-beta.8/mod.ts";
import * as autocmd from "https://deno.land/x/denops_std@v1.0.0-beta.8/autocmd/mod.ts";
import { HttpClient } from "./http.ts";
import * as docker from "./docker.ts";
import { Buffer, BufferManager } from "./vim_buffer.ts";
import { newKeyMap } from "./vim_map.ts";
import {
  attachContainer,
  execContainer,
  getContainers,
  getImages,
  pullImage,
  quickrunImage,
  removeContainer,
  removeImage,
  searchImage,
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

async function getRepoTag(bm: BufferManager, bufnr: number): Promise<string> {
  const line = await bm.getbufline(bufnr, 'line(".")');
  const [_, repo, tag] = line[0].split(" ").filter((v) => v != "");
  return `${repo}:${tag}`;
}

async function inspect(denops: Denops, bm: BufferManager, id: string) {
  const result = await docker.inspectImage(denops, id);
  const buf = await bm.newBuffer({
    name: id,
    opener: "drop",
    buftype: "nofile",
    ft: "json",
    maps: [
      newKeyMap("nnoremap", "q", ":bw!<CR>", ["<buffer>", "<silent>"]),
    ],
  });
  await bm.setbufline(buf.bufnr, 1, result);
}

export async function main(denops: Denops): Promise<void> {
  const bm = BufferManager.get(denops);
  const httpClient = await HttpClient.get();

  const commands: string[] = [
    `command! DockerImages :drop docker://images`,
    `command! DockerContainers :drop docker://containers`,
    `command! DockerSearchImage :drop docker://hub`,
  ];

  commands.forEach((cmd) => {
    denops.cmd(cmd);
  });

  await autocmd.group(denops, "denops_docker", (helper) => {
    helper.define(
      "BufReadCmd",
      "docker://containers",
      `call denops#notify("${denops.name}", "containers", [])`,
    );
    helper.define(
      "BufReadCmd",
      "docker://images",
      `call denops#notify("${denops.name}", "images", [])`,
    );
    helper.define(
      "BufWipeout",
      "docker://containers",
      `call denops#notify("${denops.name}", "beforeImagesBufferDelete", [])`,
    );
    helper.define(
      "BufWipeout",
      "<buffer>",
      `call denops#notify("${denops.name}", "beforeContainersBufferDelete", [])`,
    );

    helper.define(
      "BufReadCmd",
      "docker://hub",
      `call denops#notify("${denops.name}", "dockerhub", [])`,
    );
  });

  let containerBuffer = { bufnr: -1 } as Buffer;
  let imageBuffer = { bufnr: -1 } as Buffer;

  denops.dispatcher = {
    async dockerhub() {
      const term = await denops.eval(`input("term: ")`) as string;
      if (term) {
        imageBuffer = await bm.newBuffer({
          name: "docker://hub",
          opener: "drop",
          buftype: "nofile",
          modifiable: false,
          maps: [
            newKeyMap("nnoremap", "q", ":bw!<CR>", ["<buffer>", "<silent>"]),
            newKeyMap(
              "nnoremap",
              "<CR>",
              `:call denops#notify("${denops.name}", "pullImage", [])<CR>`,
              ["<buffer>", "<silent>"],
            ),
          ],
        });

        const images = await searchImage(httpClient, term);
        await bm.setbufline(imageBuffer.bufnr, 1, images);
      } else {
        console.log("canceled");
      }
    },

    async images() {
      imageBuffer = await bm.newBuffer({
        name: "docker://images",
        opener: "drop",
        buftype: "nofile",
        modifiable: false,
        maps: [
          newKeyMap("nnoremap", "q", ":bw!<CR>", ["<buffer>", "<silent>"]),
          newKeyMap(
            "nnoremap",
            "r",
            `:call denops#notify("${denops.name}", "quickrunImage", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
          newKeyMap(
            "nnoremap",
            "<CR>",
            `:call denops#notify("${denops.name}", "inspectImage", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
          newKeyMap(
            "nnoremap",
            "<C-d>",
            `:call denops#notify("${denops.name}", "removeImage", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
        ],
      });
      const images = await getImages(httpClient);
      await bm.setbufline(imageBuffer.bufnr, 1, images);
    },

    async containers() {
      containerBuffer = await bm.newBuffer({
        name: "docker://containers",
        opener: "drop",
        buftype: "nofile",
        wrap: "nowrap",
        modifiable: false,
        maps: [
          newKeyMap("nnoremap", "q", ":bw!<CR>", ["<buffer>", "<silent>"]),
          newKeyMap(
            "nnoremap",
            "u",
            `:call denops#notify("${denops.name}", "startContainer", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
          newKeyMap(
            "nnoremap",
            "d",
            `:call denops#notify("${denops.name}", "stopContainer", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
          newKeyMap(
            "nnoremap",
            "<C-k>",
            `:call denops#notify("${denops.name}", "killContainer", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
          newKeyMap(
            "nnoremap",
            "a",
            `:call denops#notify("${denops.name}", "attachContainer", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
          newKeyMap(
            "nnoremap",
            "e",
            `:call denops#notify("${denops.name}", "execContainer", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
          newKeyMap(
            "nnoremap",
            "t",
            `:call denops#notify("${denops.name}", "tailContainerLogs", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
          newKeyMap(
            "nnoremap",
            "<C-d>",
            `:call denops#notify("${denops.name}", "removeContainer", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
          newKeyMap(
            "nnoremap",
            "<CR>",
            `:call denops#notify("${denops.name}", "inspectContainer", [])<CR>`,
            ["<buffer>", "<silent>"],
          ),
        ],
      });

      const containers = await getContainers(httpClient);
      await bm.setbufline(containerBuffer.bufnr, 1, containers);
    },

    beforeContainersBufferDelete() {
      containerBuffer = { bufnr: -1 } as Buffer;
      return Promise.resolve();
    },

    beforeImagesBufferDelete() {
      imageBuffer = { bufnr: -1 } as Buffer;
      return Promise.resolve();
    },

    async pullImage() {
      const name = await getID(bm, imageBuffer.bufnr);
      await pullImage(denops, name);
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

    async quickrunImage() {
      const name = await getRepoTag(bm, imageBuffer.bufnr);
      await quickrunImage(denops, name);
    },

    async removeImage() {
      const name = await getRepoTag(bm, imageBuffer.bufnr);
      const input = await denops.eval(
        `input("Do you want to remove ${name}?(y/n): ")`,
      ) as string;
      if (input && input === "y" || input === "Y") {
        if (await removeImage(httpClient, name)) {
          console.log(`removed ${name}`);
          const images = await getImages(httpClient);
          await bm.setbufline(imageBuffer.bufnr, 1, images);
        }
      } else {
        console.log("canceled");
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
