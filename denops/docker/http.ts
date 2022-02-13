import {
  BodyReader,
  bodyReader,
  BufReader,
  chunkedBodyReader,
  closableBodyReader,
  createBodyParser,
  IncomingResponse,
  promiseInterrupter,
  TextProtoReader,
  timeoutReader,
  UnexpectedEofError,
} from "./deps.ts";

import { connect } from "./socket.ts";

export interface Request {
  url: string;
  method?: string;
  header?: Record<string, string>;
  // deno-lint-ignore no-explicit-any
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

export async function request<T>(req: Request): Promise<Response<T>> {
  const reqStr = newRequest(req);
  const socket = await connect();

  await socket.write(new TextEncoder().encode(reqStr));
  const incomResp = await readResponse(socket);

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
  socket.close();
  return resp;
}

export async function post(
  endpoint: string,
  opts?: Options,
): Promise<Response> {
  const resp = await request(
    <Request> {
      url: endpoint,
      method: "POST",
      header: opts?.header,
      params: opts?.params,
    },
  );
  return resp;
}

export async function del(endpoint: string, opts?: Options): Promise<Response> {
  const resp = await request(
    <Request> {
      url: endpoint,
      method: "DELETE",
      header: opts?.header,
      params: opts?.params,
    },
  );
  return resp;
}

export async function get<T>(
  endpoint: string,
  opts?: Options,
): Promise<Response<T>> {
  const resp = await request<T>(
    <Request> {
      url: endpoint,
      header: opts?.header,
      params: opts?.params,
    },
  );
  return resp;
}

export function newRequest(req: Request): string {
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

/**
 * from https://deno.land/x/servest@v1.3.4/serveio.ts
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
