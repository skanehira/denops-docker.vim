import { Denops } from "https://deno.land/x/denops_std@v1.0.0-beta.0/mod.ts";
import * as fn from "https://deno.land/x/denops_std/function/mod.ts";
import { KeyMap } from "./vim_map.ts";

export type buftype =
  | "acwrite"
  | "help"
  | "nofile"
  | "quickfix"
  | "terminal"
  | "prompt";

export type bufhidden = "hide" | "unload" | "delete" | "wipe";

export interface Buffer {
  name?: string;
  ft?: string;
  bufnr: number;
  buftype?: buftype;
  bufhidden?: bufhidden;
  swapfile: boolean;
  wrap: "wrap" | "nowrap";
  modifiable: boolean;
}

export interface NewBufferOpts {
  opener?: string;
  name?: string;
  ft?: string;
  buftype?: buftype;
  bufhidden?: bufhidden;
  swapfile?: boolean;
  wrap?: "wrap" | "nowrap";
  modifiable?: boolean;
  maps?: KeyMap[];
}

export class BufferManager {
  #denops: Denops;
  #buffers: Record<number, Buffer> = {};

  private static instance?: BufferManager;

  constructor(vim: Denops) {
    this.#denops = vim;
  }

  static get(vim: Denops): BufferManager {
    if (!BufferManager.instance) {
      BufferManager.instance = new BufferManager(vim);
    }
    return BufferManager.instance;
  }

  async newBuffer(opts?: NewBufferOpts): Promise<Buffer> {
    const buffer = {} as Buffer;
    const cmd = [opts?.opener ?? "new"];
    const ctx = {} as Record<string, string>;
    if (opts?.name) {
      cmd.push(opts.name);
      ctx["name"] = opts.name;
    }

    await this.#denops.cmd(cmd.join(" "), ctx);
    if (opts?.name) {
      buffer.bufnr = await fn.bufnr(this.#denops, opts.name);
      buffer.name = opts.name;
    } else {
      buffer.bufnr = await this.#denops.call("bufnr") as number;
    }

    if (opts?.ft) {
      buffer.ft = opts.ft;
      await this.#denops.cmd(`setlocal ft=${opts.ft}`);
    }

    if (opts?.buftype) {
      buffer.buftype = opts.buftype;
      await this.#denops.cmd(`setlocal buftype=${opts.buftype}`);
    }

    if (opts?.swapfile) {
      await this.#denops.cmd(`setlocal v`, {
        v: opts.swapfile ? "swapfile" : "noswapfile",
      });
    }

    buffer.wrap = opts?.wrap ?? "nowrap";
    await this.#denops.cmd(`setlocal ${buffer.wrap}`);

    if (opts?.maps) {
      opts?.maps.forEach(async (map) => {
        await this.addKeyMap(buffer.bufnr, map);
      });
    }

    this.addBuffers(buffer);
    return buffer;
  }

  async bufexists(bufnr: number): Promise<boolean> {
    if (bufnr === -1) {
      return false;
    }
    return await this.#denops.call("bufexists", bufnr) as boolean;
  }

  openBuffer(bufnr: number) {
    this.#denops.cmd(`sb ${bufnr}`);
  }

  addBuffers(buffer: Buffer) {
    this.#buffers[buffer.bufnr] = buffer;
  }

  removeBuffers(bufnr: number) {
    delete this.#buffers[bufnr];
  }

  async bwipeout(buf: number) {
    await this.#denops.cmd("bw buf", { buf: buf });
    this.removeBuffers(buf);
  }

  async addKeyMap(buf: number, map: KeyMap) {
    const curbuf = await this.#denops.call("bufnr");
    try {
      await this.#denops.cmd(
        `noautocmd keepalt keepjumps silent buffer ${buf} | ${map.toString()}`,
      );
    } catch (e) {
      throw e;
    } finally {
      await this.#denops.cmd(
        `noautocmd keepalt keepjumps silent buffer ${curbuf}`,
      );
    }
  }

  async getbufline(
    buf: number,
    start: number | string,
    end?: number | string,
  ): Promise<string[]> {
    const args = [buf, start, end].filter((v) => v !== undefined).join(", ");
    return await this.#denops.eval(`getbufline(${args})`) as string[];
  }

  async setbufline(buf: number, start: number | string, text: string[]) {
    const cursor = await this.#denops.call("getcurpos");
    await this.#denops.cmd(
      `silent call deletebufline(${buf}, ${start}, "$")`,
    );
    await this.#denops.eval(`setbufline(${buf}, ${start}, text)`, {
      text: text,
    });
    await this.#denops.call("setpos", ".", cursor);
  }

  async deletebufline(buf: number, start: number, end?: number | string) {
    await this.#denops.cmd(`call deletebufline(${buf}, ${start}, "${end}")`);
  }
}
