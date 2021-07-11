export type mode =
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

export type arg =
  | "<buffer>"
  | "<nowait>"
  | "<silent>"
  | "<expr>"
  | "<script>"
  | "<unique>";

export class KeyMap {
  mode: mode;
  lhs: string;
  rhs: string;
  args?: arg[];

  constructor(mode: mode, lhs: string, rhs: string, args?: arg[]) {
    this.mode = mode;
    this.lhs = lhs;
    this.rhs = rhs;
    this.args = args;
  }

  toString(): string {
    const strings = new Array<string>(this.mode);
    if (this.args) {
      this.args.forEach((arg) => {
        strings.push(arg);
      });
    }

    strings.push(this.lhs, this.rhs);

    return strings.join(" ");
  }
}
