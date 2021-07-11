import { KeyMap } from "./vim_map.ts";
import { assertEquals } from "https://deno.land/std@0.97.0/testing/asserts.ts";

Deno.test("map full args", () => {
  const map = new KeyMap("nnoremap", ",f", ":call denops#test#func<CR>", [
    "<expr>",
    "<buffer>",
    "<unique>",
  ]);
  const got = map.toString();
  const want =
    "nnoremap <expr> <buffer> <unique> ,f :call denops#test#func<CR>";

  assertEquals(got, want);
});

Deno.test("map minimal args", () => {
  const map = new KeyMap("imap", ",f", "<C-o>:call denops#test#func<CR>");
  const got = map.toString();
  const want = "imap ,f <C-o>:call denops#test#func<CR>";

  assertEquals(got, want);
});
