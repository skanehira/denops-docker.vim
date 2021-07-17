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

export function newKeyMap(
  mode: Mode,
  lhs: string,
  rhs: string,
  args?: Arg[],
): string {
  const strings = new Array<string>(mode);
  if (args) {
    args.forEach((arg) => {
      strings.push(arg);
    });
  }

  strings.push(lhs, rhs);

  return strings.join(" ");
}
