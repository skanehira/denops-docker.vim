import { Vim } from "https://deno.land/x/denops_std@v0.11/mod.ts";
import { KeyMap } from "./vim_map.ts";

export type buftype =
  | "acwrite"
  | "help"
  | "nofile"
  | "quickfix"
  | "terminal"
  | "prompt";

export type bufhidden = "hide" | "unload" | "delete" | "wipe";

interface Buffer {
  name?: string;
  ft?: string;
  bufnr: number;
  buftype?: buftype;
  bufhidden?: bufhidden;
  swapfile: boolean;
  wrap: boolean;
  modifiable: boolean;
}

export interface NewBufferOpts {
  opener?: string;
  name?: string;
  ft?: string;
  buftype?: buftype;
  bufhidden?: bufhidden;
  swapfile?: boolean;
  wrap?: boolean;
  modifiable?: boolean;
  maps?: KeyMap[];
}

export class BufferManager {
  #vim: Vim;
  #buffers: Record<number, Buffer> = {};

  private static instance?: BufferManager;

  constructor(vim: Vim) {
    this.#vim = vim;
  }

  static get(vim: Vim): BufferManager {
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

    await this.#vim.cmd(cmd.join(" "), ctx);
    if (opts?.name) {
      buffer.bufnr = await this.#vim.fn.bufnr(opts.name);
      buffer.name = opts.name;
    } else {
      buffer.bufnr = await this.#vim.call("bufnr") as number;
    }

    if (opts?.ft) {
      buffer.ft = opts.ft;
      await this.#vim.cmd(`setlocal ft=${opts.ft}`);
    }

    if (opts?.buftype) {
      buffer.buftype = opts.buftype;
      await this.#vim.cmd(`setlocal buftype=${opts.buftype}`);
    }

    if (opts?.swapfile) {
      buffer.swapfile = opts.swapfile;
      await this.#vim.cmd(`setlocal v`, {
        v: opts.swapfile ? "swapfile" : "noswapfile",
      });
    }

    if (opts?.wrap) {
      buffer.wrap = opts.wrap;
      await this.#vim.cmd(`setlocal v`, {
        v: opts.wrap ? "wrap" : "nowrap",
      });
    }

    if (opts?.maps) {
      opts?.maps.forEach(async (map) => {
        await this.addKeyMap(buffer.bufnr, map);
      });
    }

    this.addBuffers(buffer);
    return buffer;
  }

  addBuffers(buffer: Buffer) {
    this.#buffers[buffer.bufnr] = buffer;
  }

  removeBuffers(bufnr: number) {
    delete this.#buffers[bufnr];
  }

  async bwipeout(buf: number) {
    await this.#vim.cmd("bw buf", { buf: buf });
    this.removeBuffers(buf);
  }

  async addKeyMap(buf: number, map: KeyMap) {
    const curbuf = this.#vim.call("bufnr");
    try {
      await this.#vim.cmd(
        `noautocmd keepalt keepjumps silent buffer ${buf} | ${map.toString()}`,
      );
    } catch (e) {
      throw e;
    } finally {
      await this.#vim.cmd(
        `noautocmd keepalt keepjumps silent buffer ${curbuf}`,
      );
    }
  }

  async getbufline(
    buf: number,
    start: number,
    end?: number,
  ): Promise<string[]> {
    return await this.#vim.call(
      "getbufline",
      buf,
      start,
      end ?? start,
    ) as string[];
  }

  async setbufline(buf: number, start: number, text: string[]) {
    await this.#vim.call("setbufline", buf, start, text);
  }
}
