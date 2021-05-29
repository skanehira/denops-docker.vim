import { Vim } from "https://deno.land/x/denops_std@v0.10/mod.ts";
export async function runTerminal(vim: Vim, cmd: string[]) {
  if (await vim.call(`has`, "nvim")) {
    await vim.cmd(`new`);
    await vim.call(`termopen`, cmd);
  } else {
    await vim.cmd(`terminal ++shell ${cmd.join(" ")}`);
    await vim.cmd(`nnoremap <buffer> <silent> <CR> :bw<CR>`);
  }
}

export function ensureString(arg: unknown): arg is string {
  const is = typeof arg === "string";
  if (!is) {
    throw new Error(`${arg} is not string`);
  }
  return is;
}

export function ensureBoolean(arg: unknown): arg is boolean {
  const is = typeof arg === "boolean";
  if (!is) {
    throw new Error(`${arg} is not boolean`);
  }
  return is;
}
