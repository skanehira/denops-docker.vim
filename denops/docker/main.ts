import { Denops } from "https://deno.land/x/denops_std@v1.0.0-beta.8/mod.ts";
import * as autocmd from "https://deno.land/x/denops_std@v1.0.0-beta.8/autocmd/mod.ts";
import { HttpClient } from "./http.ts";
import * as docker from "./docker.ts";
import { Buffer, BufferManager } from "./vim_buffer.ts";
import { defaultKeymap } from "./vim_map.ts";
import {
  attachContainer,
  execContainer,
  getContainers,
  getImages,
  pullImage,
  quickrunImage,
  removeContainer,
  removeImage,
  runDockerCLI,
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
      defaultKeymap.bufferClose,
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
    `command! -nargs=+ Docker :call denops#notify("${denops.name}", "runDockerCLI", [<f-args>])`,
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
    async runDockerCLI(...args: unknown[]) {
      await runDockerCLI(denops, args);
    },
    async dockerhub() {
      const term = await denops.eval(`input("term: ")`) as string;
      if (term) {
        imageBuffer = await bm.newBuffer({
          name: "docker://hub",
          opener: "drop",
          ft: "docker-hub",
          buftype: "nofile",
          modifiable: false,
          maps: [
            defaultKeymap.bufferClose,
            {
              mode: "nnoremap",
              rhs: `:call denops#notify("${denops.name}", "pullImage", [])<CR>`,
              args: ["<buffer>", "<silent>"],
              alias: {
                mode: "map",
                lhs: "<CR>",
                rhs: "<Plug>(docker-pull-image)",
              },
            },
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
        ft: "docker-images",
        buftype: "nofile",
        modifiable: false,
        maps: [
          defaultKeymap.bufferClose,
          {
            mode: "nnoremap",
            rhs:
              `:call denops#notify("${denops.name}", "quickrunImage", [])<CR>`,
            args: ["<buffer>", "<silent>"],
            alias: {
              mode: "map",
              lhs: "r",
              rhs: "<Plug>(docker-image-quickrun)",
            },
          },
          {
            mode: "nnoremap",
            rhs:
              `:call denops#notify("${denops.name}", "inspectImage", [])<CR>`,
            args: ["<buffer>", "<silent>"],
            alias: {
              mode: "map",
              lhs: "<CR>",
              rhs: "<Plug>(docker-image-inspect)",
            },
          },
          {
            mode: "nnoremap",
            rhs: `:call denops#notify("${denops.name}", "removeImage", [])<CR>`,
            args: ["<buffer>", "<silent>"],
            alias: {
              mode: "map",
              lhs: "<C-d>",
              rhs: "<Plug>(docker-image-remove)",
            },
          },
        ],
      });
      const images = await getImages(httpClient);
      await bm.setbufline(imageBuffer.bufnr, 1, images);
    },

    async containers() {
      containerBuffer = await bm.newBuffer({
        name: "docker://containers",
        opener: "drop",
        ft: "docker-containers",
        buftype: "nofile",
        wrap: "nowrap",
        modifiable: false,
        maps: [
          defaultKeymap.bufferClose,
          {
            mode: "nnoremap",
            rhs:
              `:call denops#notify("${denops.name}", "startContainer", [])<CR>`,
            args: ["<buffer>", "<silent>"],
            alias: {
              mode: "map",
              lhs: "u",
              rhs: "<Plug>(docker-container-start)",
            },
          },
          {
            mode: "nnoremap",
            rhs:
              `:call denops#notify("${denops.name}", "stopContainer", [])<CR>`,
            args: ["<buffer>", "<silent>"],
            alias: {
              mode: "map",
              lhs: "d",
              rhs: "<Plug>(docker-container-stop)",
            },
          },
          {
            mode: "nnoremap",
            rhs:
              `:call denops#notify("${denops.name}", "killContainer", [])<CR>`,
            args: ["<buffer>", "<silent>"],
            alias: {
              mode: "map",
              lhs: "<C-k>",
              rhs: "<Plug>(docker-container-kill)",
            },
          },
          {
            mode: "nnoremap",
            rhs:
              `:call denops#notify("${denops.name}", "attachContainer", [])<CR>`,
            args: ["<buffer>", "<silent>"],
            alias: {
              mode: "map",
              lhs: "a",
              rhs: "<Plug>(docker-container-attach)",
            },
          },
          {
            mode: "nnoremap",

            rhs:
              `:call denops#notify("${denops.name}", "execContainer", [])<CR>`,
            args: ["<buffer>", "<silent>"],
            alias: {
              mode: "map",
              lhs: "e",
              rhs: "<Plug>(docker-contianer-exec)",
            },
          },
          {
            mode: "nnoremap",

            rhs:
              `:call denops#notify("${denops.name}", "tailContainerLogs", [])<CR>`,
            args: ["<buffer>", "<silent>"],
            alias: {
              mode: "map",
              lhs: "t",
              rhs: "<Plug>(docker-container-log)",
            },
          },
          {
            mode: "nnoremap",

            rhs:
              `:call denops#notify("${denops.name}", "removeContainer", [])<CR>`,
            args: ["<buffer>", "<silent>"],
            alias: {
              mode: "map",
              lhs: "<C-d>",
              rhs: "<Plug>(docker-container-remove)",
            },
          },
          {
            mode: "nnoremap",
            rhs:
              `:call denops#notify("${denops.name}", "inspectContainer", [])<CR>`,
            args: ["<buffer>", "<silent>"],
            alias: {
              mode: "map",
              lhs: "<CR>",
              rhs: "<Plug>(docker-container-inspect)",
            },
          },
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
