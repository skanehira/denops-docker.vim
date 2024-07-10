import {
  autocmd,
  Denops,
  fs,
  isString,
  mapping,
  mapType,
  open,
  path,
  vars,
} from "./deps.ts";
import { runTerminal } from "./vim_util.ts";
import {
  buildDockerCommand,
  getContainer,
  getImageName,
  getSearchImage,
} from "./util.ts";
import * as docker from "./docker.ts";
import * as action from "./action.ts";
import { makeTableString } from "./table.ts";
import { SearchImage } from "./types.ts";

export async function main(denops: Denops): Promise<void> {
  const commands: string[] = [
    `command! DockerImages :e docker://images`,
    `command! DockerContainers :e docker://containers`,
    `command! DockerSearchImage :e docker://hub`,
    `command! -nargs=+ Docker :call denops#notify("${denops.name}", "runDockerCLI", [<f-args>])`,
    `command! -nargs=1 -complete=customlist,docker#listContainer DockerAttachContainer :call docker#attachContainer(<f-args>)`,
    `command! -nargs=1 -complete=customlist,docker#listContainer DockerExecContainer :call docker#execContainer(<f-args>)`,
    `command! -nargs=1 -complete=customlist,docker#listContainer DockerEditFile :call docker#editContainerFile(<f-args>)`,
    `command! -nargs=1 -complete=customlist,docker#listContainer DockerShowContainerLog :call docker#showContainerLog(<f-args>)`,
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
      "BufReadCmd",
      "docker://hub",
      `call denops#notify("${denops.name}", "dockerhub", [])`,
    );
  });

  denops.dispatcher = {
    async listContainer() {
      const containers = await docker.containers();
      return containers.filter((c) => {
        if (c.State === "running") {
          return c;
        }
      }).map((c) => {
        return c.Names[0].substring(1);
      });
    },

    async containerFiles(...args: unknown[]) {
      const [name, fpath] = args as string[];
      const directories = await docker.containerFiles(
        name,
        fpath.at(-1) === "/" ? fpath : path.dirname(fpath),
      );
      return directories;
    },

    async openContainerFile(...arg: unknown[]) {
      const [id, container_filepath] = arg as string[];
      if (container_filepath.at(-1) === "/") {
        console.error(`cannot edit directory: ${container_filepath}`);
        return;
      }
      const tmpdir = await Deno.makeTempDir();
      const host_filepath = path.join(
        tmpdir,
        path.basename(container_filepath),
      );
      fs.ensureFile(host_filepath);
      await action.copyFileFromContainer(id, container_filepath, host_filepath);
      await denops.cmd(`new ${host_filepath}`);

      await autocmd.group(denops, "denops_docker_edit_file", (helper) => {
        helper.define(
          "BufWritePost",
          "<buffer>",
          `call denops#notify("${denops.name}", "updateContainerFile", ["${id}", "${host_filepath}", "${container_filepath}"])`,
        );
      });
    },

    async editContainerFile() {
      const container = await getContainer(denops);
      const name = container.Names[0].substring(1);
      await denops.call("docker#editContainerFile", name);
    },

    async updateContainerFile(
      id: unknown,
      host_filepath: unknown,
      container_filepath: unknown,
    ) {
      await action.copyFileToContainer(
        id as string,
        host_filepath as string,
        container_filepath as string,
      );
      console.log(`updated ${container_filepath}`);
    },

    async containerAttach(arg: unknown) {
      const name = arg as string;
      await action.attachContainer(denops, name);
    },

    async containerExec(arg: unknown) {
      const name = arg as string;
      await action.execContainer(denops, name);
    },

    async customCommand(command: unknown) {
      if (isString(command)) {
        const lnum = await denops.call("line", ".") as number;
        if (lnum > 1) {
          const line = await denops.call(
            "getline",
            lnum,
          ) as string;

          if (!line.length) {
            return;
          }
          const cmd = buildDockerCommand(line, command);
          if (cmd.length) {
            runTerminal(denops, cmd);
          }
        }
      }

      return Promise.resolve();
    },

    async runDockerCLI(...args: unknown[]) {
      await action.runDockerCLI(denops, args);
    },

    async dockerhub() {
      const term = await denops.eval(`input("term: ")`) as string;
      if (term) {
        const images = await docker.searchImage(term);
        await vars.b.set(denops, "docker_images", images);
        await denops.call(
          "setline",
          1,
          makeTableString(images, "searchImages"),
        );
        await denops.cmd("setlocal modifiable");
        const ft = "docker-hub";
        await denops.cmd(
          `setlocal ft=${ft} buftype=nofile nowrap nomodifiable bufhidden=hide nolist nomodified`,
        );

        const keymaps = [
          {
            mode: ["n"],
            lhs: "<Plug>(docker-buffer-close)",
            rhs: `:bw<CR>`,
            default: "q",
          },
          {
            mode: ["n"],
            lhs: "<Plug>(docker-pull-image)",
            rhs: `:call denops#notify("${denops.name}", "pullImage", [])<CR>`,
            default: "<CR>",
          },
          {
            mode: ["n"],
            lhs: "<Plug>(docker-open-dockerhub)",
            rhs:
              `:call denops#notify("${denops.name}", "openDockerHub", [])<CR>`,
            default: "<C-o>",
          },
        ];

        for (const m of keymaps) {
          mapping.map(denops, m.lhs, m.rhs, {
            mode: m.mode as mapType.Mode[],
            buffer: true,
            silent: true,
            noremap: true,
          });

          // defualt mapping
          mapping.map(denops, m.default, m.lhs, {
            mode: "n",
            buffer: true,
            silent: true,
          });
        }
        await denops.cmd("redraw!");
      } else {
        console.log("canceled");
      }
    },

    async openDockerHub(): Promise<void> {
      const images = await vars.b.get(
        denops,
        "docker_images",
        {},
      ) as SearchImage[];
      if (Object.keys(images).length === 0) {
        console.error("invalid image");
        return;
      }
      const line = await denops.call("line", ".") as number;
      const image = images.at(line - 2);
      if (!image) {
        console.error("not found image");
        return;
      }
      const url = `https://hub.docker.com/${
        image?.is_official ? "_/" : "r/"
      }${image?.name}`;
      await open(url);
    },

    async images() {
      await action.updateImagesBuffer(denops);

      const ft = "docker-images";
      await denops.cmd(
        `setlocal ft=${ft} buftype=nofile nowrap nomodifiable bufhidden=hide nolist nomodified`,
      );

      const keymaps = [
        {
          mode: ["n"],
          lhs: "<Plug>(docker-buffer-close)",
          rhs: `:bw<CR>`,
          default: "q",
        },
        {
          mode: ["n"],
          lhs: "<Plug>(docker-image-quickrun)",
          rhs: `:call denops#notify("${denops.name}", "quickrunImage", [])<CR>`,
          default: "r",
        },
        {
          mode: ["n"],
          lhs: "<Plug>(docker-image-remove)",
          rhs: `:call denops#notify("${denops.name}", "removeImage", [])<CR>`,
          default: "<C-d>",
        },
        {
          mode: ["n"],
          lhs: "<Plug>(docker-image-inspect)",
          rhs: `:call denops#notify("${denops.name}", "inspectImage", [])<CR>`,
          default: "<CR>",
        },
      ];

      for (const m of keymaps) {
        mapping.map(denops, m.lhs, m.rhs, {
          mode: m.mode as mapType.Mode[],
          buffer: true,
          silent: true,
          noremap: true,
        });

        // defualt mapping
        mapping.map(denops, m.default, m.lhs, {
          mode: "n",
          buffer: true,
          silent: true,
        });
      }
      await denops.cmd("redraw!");
    },

    async containerOpenBrowser() {
      const container = await getContainer(denops);
      await action.openBrowser(denops, container.Id);
    },

    async containers() {
      await action.updateContainersBuffer(denops);

      const ft = "docker-containers";
      await denops.cmd(
        `setlocal ft=${ft} buftype=nofile nowrap nomodifiable bufhidden=hide nolist nomodified`,
      );

      const keymaps = [
        {
          mode: ["n"],
          lhs: "<Plug>(docker-buffer-close)",
          rhs: `:bw<CR>`,
          default: "q",
        },
        {
          mode: ["n"],
          lhs: "<Plug>(docker-container-start)",
          rhs:
            `:call denops#notify("${denops.name}", "startContainer", [])<CR>`,
          default: "u",
        },
        {
          mode: ["n"],
          lhs: "<Plug>(docker-container-stop)",
          rhs: `:call denops#notify("${denops.name}", "stopContainer", [])<CR>`,
          default: "d",
        },
        {
          mode: ["n"],
          lhs: "<Plug>(docker-container-kill)",
          rhs: `:call denops#notify("${denops.name}", "killContainer", [])<CR>`,
          default: "<C-k>",
        },
        {
          mode: ["n"],
          lhs: "<Plug>(docker-container-attach)",
          rhs:
            `:call denops#notify("${denops.name}", "attachContainer", [])<CR>`,
          default: "a",
        },
        {
          mode: ["n"],
          lhs: "<Plug>(docker-contianer-exec)",
          rhs: `:call denops#notify("${denops.name}", "execContainer", [])<CR>`,
          default: "e",
        },
        {
          mode: ["n"],
          lhs: "<Plug>(docker-container-log)",
          rhs:
            `:call denops#notify("${denops.name}", "tailContainerLogs", [])<CR>`,
          default: "t",
        },
        {
          mode: ["n"],
          lhs: "<Plug>(docker-container-remove)",
          rhs:
            `:call denops#notify("${denops.name}", "removeContainer", [])<CR>`,
          default: "<C-d>",
        },
        {
          mode: ["n"],
          lhs: "<Plug>(docker-container-inspect)",
          rhs:
            `:call denops#notify("${denops.name}", "inspectContainer", [])<CR>`,
          default: "<CR>",
        },
        {
          mode: ["n"],
          lhs: "<Plug>(docker-container-restart)",
          rhs:
            `:call denops#notify("${denops.name}", "restartContainer", [])<CR>`,
          default: "r",
        },
        {
          mode: ["n"],
          lhs: "<Plug>(docker-container-copy-to)",
          rhs:
            `:call denops#notify("${denops.name}", "copyFileToContainer", [])<CR>`,
          default: "ct",
        },
        {
          mode: ["n"],
          lhs: "<Plug>(docker-container-copy-from)",
          rhs:
            `:call denops#notify("${denops.name}", "copyFileFromContainer", [])<CR>`,
          default: "cf",
        },
        {
          mode: ["n"],
          lhs: "<Plug>(docker-container-edit-file)",
          rhs:
            `:call denops#notify("${denops.name}", "editContainerFile", [])<CR>`,
          default: "E",
        },
        {
          mode: ["n"],
          lhs: "<Plug>(docker-container-open-browser)",
          rhs:
            `:call denops#notify("${denops.name}", "containerOpenBrowser", [])<CR>`,
          default: "<C-o>",
        },
      ];

      for (const m of keymaps) {
        mapping.map(denops, m.lhs, m.rhs, {
          mode: m.mode as mapType.Mode[],
          buffer: true,
          silent: true,
          noremap: true,
        });

        // defualt mapping
        mapping.map(denops, m.default, m.lhs, {
          mode: "n",
          buffer: true,
          silent: true,
        });
      }

      await denops.cmd("redraw!");
    },

    async copyFileToContainer(): Promise<void> {
      const from = await denops.call("input", "from: ", "", "file") as string;
      const to = await denops.call("input", "to: ") as string;
      const container = await getContainer(denops);
      const name = container.Names[0].substring(1);
      await action.copyFileToContainer(name, from, to);
      console.log(`success to copy ${from} to ${name}:${to}`);
    },

    async copyFileFromContainer(): Promise<void> {
      const from = await denops.call("input", "from: ") as string;
      const to = await denops.call("input", "to: ", "", "file") as string;
      const container = await getContainer(denops);
      const name = container.Names[0].substring(1);
      await action.copyFileFromContainer(name, from, to);
      console.log(`success to copy ${name}:${from} to ${to}`);
    },

    async pullImage() {
      const image = await getSearchImage(denops);
      await action.pullImage(denops, image.name);
    },

    async attachContainer() {
      const container = await getContainer(denops);
      const name = container.Names[0].substring(1);
      await action.attachContainer(denops, name);
    },

    async execContainer() {
      const container = await getContainer(denops);
      const name = container.Names[0].substring(1);
      await action.execContainer(denops, name);
    },

    async startContainer() {
      const container = await getContainer(denops);
      const name = container.Names[0].substring(1);
      console.log(`starting ${name}`);
      if (await action.startContainer(name)) {
        console.log(`started ${name}`);
        await action.updateContainersBuffer(denops);
      }
    },

    async stopContainer() {
      const container = await getContainer(denops);
      const name = container.Names[0].substring(1);
      console.log(`stopping ${name}`);
      if (await action.stopContainer(name)) {
        console.log(`stoped ${name}`);
        await action.updateContainersBuffer(denops);
      }
    },

    async restartContainer() {
      const container = await getContainer(denops);
      const name = container.Names[0].substring(1);
      console.log(`restarting ${name}`);
      if (await action.restartContainer(name)) {
        console.log(`restarted ${name}`);
        await action.updateContainersBuffer(denops);
      }
    },

    async killContainer() {
      const container = await getContainer(denops);
      const name = container.Names[0].substring(1);
      console.log(`killing ${name}`);
      if (await action.killContainer(container.Id)) {
        console.log(`killed ${name}`);
        await action.updateContainersBuffer(denops);
      }
    },

    async tailContainerLogs(name?: unknown) {
      let cname = name as string;
      if (!name) {
        cname = (await getContainer(denops)).Names[0];
      }
      await docker.tailContainerLogs(denops, cname);
    },

    async inspectImage() {
      const name = await getImageName(denops);
      await action.inspect(denops, name);
    },

    async inspectContainer() {
      const container = await getContainer(denops);
      const name = container.Names[0].substring(1);
      await action.inspect(denops, name);
    },

    async quickrunImage() {
      const name = await getImageName(denops);
      await action.quickrunImage(denops, name);
    },

    async removeImage() {
      const name = await getImageName(denops);
      const input = await denops.eval(
        `input("Do you want to remove ${name}?(y/n): ")`,
      ) as string;
      if (input && input === "y" || input === "Y") {
        if (await action.removeImage(name)) {
          console.log(`removed ${name}`);
          await action.updateImagesBuffer(denops);
          await denops.cmd("setlocal nomodifiable");
        }
      } else {
        console.log("canceled");
      }
    },

    async removeContainer() {
      const container = await getContainer(denops);
      const name = container.Names[0].substring(1);
      const input = await denops.eval(
        `input("Do you want to remove ${name}?(y/n): ")`,
      ) as string;
      if (input && input === "y" || input === "Y") {
        if (await action.removeContainer(name)) {
          console.log(`removed ${name}`);
          await action.updateContainersBuffer(denops);
          await denops.cmd("setlocal nomodifiable");
        }
      } else {
        console.log("canceled");
      }
    },
  };
}
