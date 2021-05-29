import { Vim } from "https://deno.land/x/denops_std@v0.10/mod.ts";
import { HttpClient, Response } from "./http.ts";
import { runTerminal } from "./vim_util.ts";
import {
  Container,
  Image,
  removeContainerOpts,
  removeImageOpts,
  SearchImage,
} from "./type.ts";

export class Docker {
  #http: HttpClient;
  #vim: Vim;
  private static instance?: Docker;

  constructor(http: HttpClient, vim: Vim) {
    this.#vim = vim;
    this.#http = http;
  }

  static async get(vim: Vim): Promise<Docker> {
    if (!Docker.instance) {
      Docker.instance = new Docker(await HttpClient.get(), vim);
    }
    return Docker.instance;
  }

  async iamges(): Promise<Image[]> {
    const resp = await this.#http.get<Image[]>("/images/json");
    return resp.body;
  }

  async removeImage(
    name: string,
    opts: removeImageOpts = { force: false, noprune: false },
  ): Promise<Response> {
    const resp = await this.#http.delete(`/images/${name}`, {
      params: {
        force: opts.force,
        noprune: opts.noprune,
      },
    });
    return resp;
  }

  async removeContainer(
    name: string,
    opts: removeContainerOpts = { v: false, force: false, link: false },
  ) {
    await this.#http.delete(`/containers/${name}`, {
      params: {
        v: opts.v,
        force: opts.force,
        link: opts.link,
      },
    });
  }

  async containers(): Promise<Container[]> {
    const resp = await this.#http.get<Container[]>("/containers/json");
    return resp.body;
  }

  async pullImage(name: string) {
    const [image, tag] = name.split(":");
    const fromImage = [image, ":", (tag || "latest")].join("");
    await runTerminal(this.#vim, ["docker", "pull", fromImage]);
  }

  async searchImage(name: string): Promise<SearchImage[]> {
    const resp = await this.#http.get<SearchImage[]>("/images/search", {
      params: {
        term: name,
        limit: 100,
      },
    });
    return resp.body;
  }

  async quickrunImage(name: string) {
    const cmd = <string[]> [
      "docker",
      "run",
      "-it",
      "--entrypoint",
      "sh",
      name,
      "-c",
      `"[ -e /bin/bash ] && /bin/bash || sh"`,
    ];
    if (await this.#vim.call("has", "nvim")) {
      cmd[cmd.length - 1] = `[ -e /bin/bash ] && /bin/bash || sh`;
    }
    await runTerminal(this.#vim, cmd);
  }

  async attachContainer(name: string) {
    const cmd = <string[]> [
      "docker",
      "exec",
      "-it",
      name,
      "sh",
      "-c",
      `"[ -e /bin/bash ] && /bin/bash || sh"`,
    ];
    if (await this.#vim.call("has", "nvim")) {
      cmd[cmd.length - 1] = `[ -e /bin/bash ] && /bin/bash || sh`;
    }
    await runTerminal(this.#vim, cmd);
  }

  async upContainer(name: string): Promise<Response> {
    return await this.#http.post(`/containers/${name}/start`);
  }

  async stopContainer(name: string) {
    await this.#http.post(`/containers/${name}/stop`);
  }

  async killContainer(name: string): Promise<Response> {
    return await this.#http.post(`/containers/${name}/kill`);
  }
}
