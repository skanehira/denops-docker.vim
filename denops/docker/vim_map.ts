export type Mode =
  | "map"
  | "noremap"
  | "nmap"
  | "nnoremap"
  | "vmap"
  | "vnoremap"
  | "smap"
  | "snoremap"
  | "xmap"
  | "xnoremap"
  | "imap"
  | "inoremap";

export type Arg =
  | "<buffer>"
  | "<nowait>"
  | "<silent>"
  | "<expr>"
  | "<script>"
  | "<unique>";

export interface KeyMap {
  alias: {
    mode: Mode;
    lhs: string;
    rhs: string;
  };
  mode: Mode;
  rhs: string;
  args: Arg[];
}

export function toKeymaps(keymap: KeyMap): string[] {
  const map = new Array<string>(keymap.mode);
  keymap.args.forEach((arg) => {
    map.push(arg);
  });

  map.push(keymap.alias.rhs, keymap.rhs);
  return [
    map.join(" "),
    [
      keymap.alias.mode,
      keymap.args.join(" "),
      keymap.alias.lhs,
      keymap.alias.rhs,
    ].join(" "),
  ];
}

export const defaultKeymap = {
  bufferClose: {
    mode: "nnoremap",
    rhs: ":bw!<CR>",
    args: ["<buffer>", "<silent>"],
    alias: {
      mode: "map",
      lhs: "q",
      rhs: "<Plug>(docker-buffer-close)",
    },
  } as KeyMap,
};
