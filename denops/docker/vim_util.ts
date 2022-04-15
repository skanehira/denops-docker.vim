import { Denops } from "./deps.ts";

export async function runTerminal(denops: Denops, cmd: string[]) {
  if (denops.meta.host === "nvim") {
    await denops.cmd("new");
    await denops.call("termopen", cmd);
  } else {
    await denops.cmd(`terminal ++shell ${cmd.join(" ")}`);
  }
}
