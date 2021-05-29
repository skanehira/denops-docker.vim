const enc = new TextEncoder();

export async function writeConn(conn: Deno.Conn, msg: unknown): Promise<void> {
  if (typeof msg === "string") {
    await conn.write(enc.encode(msg));
  } else if (typeof msg === "object") {
    await conn.write(enc.encode(JSON.stringify(msg)));
  }
}

export async function readConn(
  conn: Deno.Conn,
  cap: number,
): Promise<unknown> {
  const buf = new Uint8Array(cap);
  await conn.read(buf);
  return new TextDecoder().decode(buf);
}
