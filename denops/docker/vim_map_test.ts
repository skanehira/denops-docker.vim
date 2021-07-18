import { defaultKeymap, KeyMap, toKeymaps } from "./vim_map.ts";
import { assertEquals } from "https://deno.land/std@0.97.0/testing/asserts.ts";

const tests = [
  {
    name: "keymap with alias and args",
    keymap: {
      mode: "inoremap",
      rhs: ":call denops#docker#test()<CR>",
      args: ["<buffer>", "<silent>"],
      alias: {
        mode: "imap",
        lhs: "<C-o>",
        rhs: "<Plug>(docker-test)",
      },
    },
    want: [
      "inoremap <buffer> <silent> <Plug>(docker-test) :call denops#docker#test()<CR>",
      "imap <buffer> <silent> <C-o> <Plug>(docker-test)",
    ],
  },
  {
    name: "default keymap",
    keymap: defaultKeymap.bufferClose,
    want: [
      "nnoremap <buffer> <silent> <Plug>(docker-buffer-close) :bw!<CR>",
      "map <buffer> <silent> q <Plug>(docker-buffer-close)",
    ],
  },
];

tests.forEach((test) => {
  Deno.test(test.name, () => {
    const got = toKeymaps(test.keymap as KeyMap);
    assertEquals(got, test.want);
  });
});
