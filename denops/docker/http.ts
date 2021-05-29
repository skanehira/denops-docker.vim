import { readResponse } from "https://deno.land/x/servest@v1.3.1/serveio.ts";
import { connect } from "./socket.ts";

export interface Request {
  url: string;
  method?: string;
  header?: any;
  params?: any;
  data?: unknown;
}

interface Response<T = unknown> {
  status: number;
  header: Headers;
  body: T;
}

export interface Error {
  message: string;
}

interface Options {
  header?: Record<string, string>;
  params?: Record<string, unknown>;
}

function isObject(obj: unknown): obj is Object {
  return typeof obj === "object";
}

export class HttpClient {
  #socket: Deno.Conn;
  private static instance?: HttpClient;

  constructor(conn: Deno.Conn) {
    this.#socket = conn;
  }

  static async get(): Promise<HttpClient> {
    if (!HttpClient.instance) {
      HttpClient.instance = new HttpClient(await connect());
    }
    return HttpClient.instance;
  }

  async get<T>(
    endpoint: string,
    opts?: Options,
  ): Promise<Response<T>> {
    const resp = await this.request<T>(
      <Request> {
        url: endpoint,
        header: opts?.header,
        params: opts?.params,
      },
    );
    return resp;
  }

  static newRequest(req: Request): string {
    req.method = req.method ?? "GET";

    let header = `${req.method} ${req.url}`;
    if (req.params && Object.keys(req.params).length) {
      const params = new URLSearchParams(req.params);
      header += `?${params.toString()}`;
    }
    header += ` HTTP/1.1\r\nHost: localhost\r\n`;

    for (
      const [k, v] of Object.entries(req.header ?? [])
    ) {
      header += `${k}: ${v}\r\n`;
    }

    let reqStr = `${header}\r\n`;
    if ("data" in req) {
      let data = req.data;
      if (isObject(data)) {
        if (Object.entries(data).length) {
          data = JSON.stringify(data);
        } else {
          data = "";
        }
      }
      reqStr = `${header}\r\n${data}\r\n`;
    }
    return reqStr;
  }

  private async request<T>(req: Request): Promise<Response<T>> {
    const reqStr = HttpClient.newRequest(req);

    await this.#socket.write(new TextEncoder().encode(reqStr));
    const incomResp = await readResponse(this.#socket);

    const resp = {
      status: incomResp.status,
      header: incomResp.headers,
      body: await incomResp.json(),
    };

    if (incomResp.status !== 200) {
      throw resp.body.message;
    }
    return resp;
  }
}
