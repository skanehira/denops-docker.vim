import { BufReader } from "https://deno.land/std@0.97.0/io/bufio.ts";
import { TextProtoReader } from "https://deno.land/std@0.97.0/textproto/mod.ts";
import {
  bodyReader,
  chunkedBodyReader,
} from "https://deno.land/std@0.97.0/http/_io.ts";
import {
  BodyReader,
  IncomingResponse,
} from "https://deno.land/x/servest@v1.3.1/mod.ts";
import {
  closableBodyReader,
  timeoutReader,
} from "https://deno.land/x/servest@v1.3.1/_readers.ts";
import { UnexpectedEofError } from "https://deno.land/x/servest@v1.3.1/error.ts";
import {
  promiseInterrupter,
} from "https://deno.land/x/servest@v1.3.1/_util.ts";
import { createBodyParser } from "https://deno.land/x/servest@v1.3.1/body_parser.ts";

import { connect } from "./socket.ts";

export interface Request {
  url: string;
  method?: string;
  header?: any;
  params?: any;
  data?: unknown;
}

export interface Response<T = unknown> {
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
  data?: unknown;
}

function isObject(obj: unknown): obj is Record<string, unknown> {
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

  async post(endpoint: string, opts?: Options): Promise<Response> {
    const resp = await this.request(
      <Request> {
        url: endpoint,
        method: "POST",
        header: opts?.header,
        params: opts?.params,
      },
    );
    return resp;
  }

  async delete(endpoint: string, opts?: Options): Promise<Response> {
    const resp = await this.request(
      <Request> {
        url: endpoint,
        method: "DELETE",
        header: opts?.header,
        params: opts?.params,
      },
    );

    return resp;
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
    } as Response<T>;

    if (incomResp.status == 200) {
      resp.body = await incomResp.json();
    } else if (
      incomResp.status == 304 ||
      incomResp.status == 204
    ) {
      // do nothing
    } else {
      const body = await incomResp.json();
      throw body.message;
    }
    return resp;
  }
}

/**
  * from https://deno.land/x/servest@v1.3.1/serveio.ts
  *
  * read http response from reader */
export async function readResponse(
  r: Deno.Reader,
  { timeout, cancel }: { timeout?: number; cancel?: Promise<void> } = {},
): Promise<IncomingResponse> {
  const reader = BufReader.create(r);
  const tp = new TextProtoReader(reader);
  const timeoutOrCancel = promiseInterrupter({ timeout, cancel });
  // First line: HTTP/1,1 200 OK
  const line = await timeoutOrCancel(tp.readLine());
  if (line === null) {
    throw new UnexpectedEofError();
  }
  const [proto, status, statusText] = line.split(" ", 3);
  const headers = await timeoutOrCancel(tp.readMIMEHeader());
  if (headers === null) {
    throw new UnexpectedEofError();
  }
  const contentLength = headers.get("content-length");
  const isChunked = headers.get("transfer-encoding")?.match(/^chunked/);
  let body: BodyReader;
  if (isChunked) {
    const tr = timeoutReader(chunkedBodyReader(headers, reader), {
      timeout,
      cancel,
    });
    body = closableBodyReader(tr);
  } else if (contentLength != null) {
    const tr = timeoutReader(bodyReader(parseInt(contentLength), reader), {
      timeout,
      cancel,
    });
    body = closableBodyReader(tr);
  } else if (status === "204" || status === "304") {
    body = closableBodyReader(r);
  } else {
    throw new Error("unkown conetnt-lengh or chunked");
  }
  const bodyParser = createBodyParser({
    reader: body,
    contentType: headers.get("content-type") ?? "",
  });
  return {
    proto,
    status: parseInt(status),
    statusText,
    headers,
    body,
    ...bodyParser,
  };
}
