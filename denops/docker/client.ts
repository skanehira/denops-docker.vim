import { HttpClient } from "./http.ts";

export class Docker {
  #http: HttpClient;
  private static instance?: Docker;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  static async get(): Promise<Docker> {
    if (!Docker.instance) {
      Docker.instance = new Docker(await HttpClient.get());
    }
    return Docker.instance;
  }

  async iamges(): Promise<Image[]> {
    const resp = await this.#http.get<Image[]>("/images/json");
    return resp.body;
  }
}

export interface Image {
  Id: string;
  ParentId: string;
  RepoTags: string[];
  RepoDigests: string[];
  Created: number;
  Size: number;
  VirtualSize: number;
  SharedSize: number;
  Labels: Record<string, unknown>;
  Containers: number;
}
