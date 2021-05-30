import { Vim } from "https://deno.land/x/denops_std@v0.11/mod.ts";

export async function runTerminal(vim: Vim, cmd: string[]) {
  if (await vim.call("has", "nvim")) {
    await vim.cmd("new");
    await vim.call("termopen", cmd);
  } else {
    await vim.cmd(`terminal ++shell ${cmd.join(" ")}`);
    await vim.cmd("nnoremap <buffer> <silent> <CR> :bw<CR>");
  }
}
