import { writeConn } from "./testutil.ts";
import { HttpClient } from "./http.ts";
import { assertEquals } from "https://deno.land/std@0.97.0/testing/asserts.ts";
import { connect } from "./socket.ts";

Deno.test("http get 200", async () => {
  const filePath = await Deno.makeTempFile();
  const listener = Deno.listen({ path: filePath, transport: "unix" });
  listener.accept().then(
    async (conn): Promise<void> => {
      await writeConn(
        conn,
        "HTTP/1.1 200OK\r\nContent-Length: 2\r\n\r\n55\r\n",
      );
      conn.close();
    },
  );

  const conn = await connect({ path: filePath, transport: "unix" });
  const client = new HttpClient(conn);
  const resp = await client.get("/test", {
    header: { k: "v" },
    params: { p: "v" },
  });
  listener.close();
  conn.close();

  assertEquals(resp.body, 55);
});

Deno.test("http get with options", () => {
  const reqStr = HttpClient.newRequest({
    url: "test",
    method: "GET",
    header: {
      "h1": "v1",
      "h2": "v2",
    },
    params: {
      "json": 1,
      "sort": "desc",
      "all": true,
    },
    data: {
      name: "gorilla",
      age: 28,
    },
  });

  assertEquals(
    reqStr,
    `GET test?json=1&sort=desc&all=true HTTP/1.1\r\nHost: localhost\r\nh1: v1\r\nh2: v2\r\n\r\n{"name":"gorilla","age":28}\r\n`,
  );
});

Deno.test("http get with options", () => {
  const reqStr = HttpClient.newRequest({
    url: "test",
    method: "GET",
    header: {},
    params: {},
    data: {},
  });

  assertEquals(
    reqStr,
    `GET test HTTP/1.1\r\nHost: localhost\r\n\r\n\r\n`,
  );
});
