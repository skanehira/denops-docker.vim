import { main } from "https://deno.land/x/denops_std@v0.10/mod.ts";
import { Docker } from "./client.ts";

main(async ({ vim }) => {
  const docker = await Docker.get();
  vim.register({
    async test(): Promise<void> {
      try {
        const images = await docker.iamges();
        const tags = images.filter((image) => image?.RepoTags).map((image) =>
          image.RepoTags
        )?.flat();
        vim.cmd("echo tags", { tags: tags });
      } catch (e) {
        vim.cmd("echo msg", { msg: e });
      }
    },
  });
});
