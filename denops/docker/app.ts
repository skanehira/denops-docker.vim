import { main } from "https://deno.land/x/denops_std@v0.11/mod.ts";
import { Docker } from "./client.ts";
import { ensureString } from "./util.ts";

main(async ({ vim }) => {
  const docker = await Docker.get(vim);

  vim.register({
    async images() {
      const images = await docker.iamges();
      const tags = images.filter((image) => image?.RepoTags).map((image) =>
        image.RepoTags
      )?.flat();
      vim.cmd("echo tags", { tags: tags });
    },

    async containers() {
      const containers = await docker.containers();
      console.log(containers);
    },

    async pullImage(name: unknown) {
      if (ensureString(name)) {
        await docker.pullImage(name);
      }
    },

    async inspectImage(name: unknown) {
      if (ensureString(name)) {
        const resp = await docker.inspectImage(name);
        console.log(resp);
      }
    },

    async attachContainer(name: unknown) {
      if (ensureString(name)) {
        await docker.attachContainer(name);
      }
    },

    async upContainer(name: unknown) {
      if (ensureString(name)) {
        console.log(`starting ${name}`);
        await docker.upContainer(name);
        console.log(`started ${name}`);
      }
    },

    async stopContainer(name: unknown) {
      if (ensureString(name)) {
        console.log(`stopping ${name}`);
        await docker.stopContainer(name);
        console.log(`stopped ${name}`);
      }
    },

    async killContainer(name: unknown) {
      if (ensureString(name)) {
        console.log(`kill ${name}`);
        await docker.killContainer(name);
        console.log(`killed ${name}`);
      }
    },

    async searchImage(name: unknown) {
      if (ensureString(name)) {
        console.log(`search "${name}" start`);
        const images = await docker.searchImage(name);
        console.table(images);
      }
    },

    async quickrunImage(name: unknown) {
      if (ensureString(name)) {
        await docker.quickrunImage(name);
      }
    },

    async removeImage(name: unknown) {
      if (ensureString(name)) {
        await docker.removeImage(name);
      }
    },

    async removeContainer(name: unknown) {
      if (ensureString(name)) {
        await docker.removeContainer(name);
      }
    },
  });
});
