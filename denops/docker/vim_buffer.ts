import { Denops } from "https://deno.land/x/denops_std@v1.0.0-beta.8/mod.ts";

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
  modifiable?: boolean;
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
  maps?: string[];
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

  async newBuffer(opts: NewBufferOpts): Promise<Buffer> {
    const buffer = {} as Buffer;
    const cmd = [opts.opener ?? "new"];
    const ctx = {} as Record<string, string>;
    if (opts?.name) {
      cmd.push(opts.name);
      ctx["name"] = opts.name;
    }

    await this.#denops.cmd(cmd.join(" "), ctx);
    buffer.bufnr = await this.#denops.call("bufnr") as number;
    if (opts?.name) {
      buffer.name = opts.name;
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
      const swap = opts.swapfile ? "swapfile" : "noswapfile";
      await this.#denops.cmd(`setlocal ${swap}`);
    }

    buffer.wrap = opts?.wrap ?? "nowrap";
    await this.#denops.cmd(`setlocal ${buffer.wrap}`);

    if (opts?.maps) {
      opts?.maps.forEach(async (map) => {
        await this.addKeyMap(buffer.bufnr, map);
      });
    }

    if (`modifiable` in opts) {
      buffer.modifiable = opts.modifiable;
      const modify = opts.modifiable ? "modifiable" : "nomodifiable";
      await this.#denops.cmd(`setlocal ${modify}`);
    }

    await this.#denops.cmd(`setlocal bufhidden=hide nolist`);

    this.addBuffers(buffer);
    return buffer;
  }

  async bufexists(bufnr: number): Promise<boolean> {
    if (bufnr === -1) {
      return false;
    }
    return await this.#denops.call("bufexists", bufnr) as boolean;
  }

  async openBuffer(bufnr: number) {
    const buffer = this.#buffers[bufnr];
    if (buffer.name) {
      await this.#denops.cmd(`drop ${buffer.name}`);
    } else {
      // TODO
      // if buffer name is empty, use win_gotoid instead
    }
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

  async addKeyMap(buf: number, map: string) {
    const curbuf = await this.#denops.call("bufnr");
    try {
      await this.#denops.cmd(
        `noautocmd keepalt keepjumps silent buffer ${buf} | ${map}`,
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
    const modifiable = await this.#denops.eval("&modifiable");
    if (!modifiable) {
      await this.#denops.cmd("setlocal modifiable");
    }
    const cursor = await this.#denops.call("getcurpos");
    await this.#denops.cmd(
      `silent call deletebufline(${buf}, ${start}, "$")`,
    );
    await this.#denops.cmd(`call setbufline(${buf}, ${start}, text)`, {
      text: text,
    });
    await this.#denops.call("setpos", ".", cursor);
    if (!modifiable) {
      await this.#denops.cmd("setlocal nomodifiable");
    }
  }

  async deletebufline(buf: number, start: number, end?: number | string) {
    await this.#denops.cmd(`call deletebufline(${buf}, ${start}, "${end}")`);
  }
}
