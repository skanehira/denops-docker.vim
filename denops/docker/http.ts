import { Buffer } from "jsr:@std/io@0.225.2/buffer";
import { connect } from "./socket.ts";
import { TextProtoReader } from "https://deno.land/std@0.155.0/textproto/mod.ts";
import { BufReader } from "https://deno.land/std@0.155.0/io/buffer.ts";

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
  const socket = await connect();
  try {
    const reqStr = newRequest(req);
    await socket.write(new TextEncoder().encode(reqStr));
    const resp = await readResponse<T>(socket);
    return resp;
  } finally {
    socket.close();
  }
}

export async function post(
  endpoint: string,
  opts?: Options,
): Promise<Response> {
  const resp = await request(
    {
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
    {
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
    {
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

  for (const [k, v] of Object.entries(req.header ?? [])) {
    header += `${k}: ${v}\r\n`;
  }

  // NOTE(skanehira): docker will be slow without user agent header
  // ref: https://github.com/moby/moby/issues/47439
  header += `User-Agent: Docker-Client/25.0.3\r\n`;

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

const decoder = new TextDecoder();

async function read(
  r: BufReader,
  headers: Headers,
): Promise<string> {
  const contentLength = headers.get("content-length");
  const isChunked = headers.get("transfer-encoding")! === "chunked";

  if (!contentLength && !isChunked) {
    throw new Error("unkown conetnt-length or chunked");
  }

  let body = "";

  if (isChunked) {
    const chunks = new Buffer();
    while (true) {
      const result = await r.readLine();
      if (!result) {
        throw new Error(
          `unexpected chunked body: cannot find chunked data length`,
        );
      }
      const chunkLength = parseInt(decoder.decode(result.line), 16);
      if (isNaN(chunkLength)) {
        throw new Error(`chunk length is not a number: ${result.line}`);
      }
      if (chunkLength === 0) {
        r.readLine();
        break;
      }
      const chunk = new Uint8Array(chunkLength);
      const readed = await r.readFull(chunk);
      if (!readed) {
        break;
      }
      chunks.write(chunk);
      // consume \r\n;
      if (await r.readLine() == null) {
        throw new Deno.errors.UnexpectedEof();
      }
    }
    body = decoder.decode(chunks.bytes());
  } else if (contentLength != null) {
    const buf = new Uint8Array(parseInt(contentLength));
    await r.readFull(buf);
    body = decoder.decode(buf);
  }
  return body;
}

export async function readResponse<T>(r: Deno.Conn): Promise<Response<T>> {
  const reader = BufReader.create(r);
  const tp = new TextProtoReader(reader);
  const line = await tp.readLine();
  if (line === null) {
    throw new Deno.errors.UnexpectedEof();
  }
  const status = line.split(" ", 3)[1];
  const header = await tp.readMimeHeader();
  if (!header) {
    throw new Deno.errors.UnexpectedEof();
  }

  const body = status == "204" || status == "304"
    ? ""
    : JSON.parse(await read(reader, header));

  return {
    status: parseInt(status),
    header,
    body,
  };
}
