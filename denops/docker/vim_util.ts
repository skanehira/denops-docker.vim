import { Denops } from "jsr:@denops/std@^7.0.0";

export async function runTerminal(denops: Denops, cmd: string[]) {
  if (denops.meta.host === "nvim") {
    await denops.cmd("new");
    await denops.call("termopen", cmd);
  } else {
    await denops.cmd(`terminal ++shell ${cmd.join(" ")}`);
  }
}
