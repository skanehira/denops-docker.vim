import { writeConn } from "./testutil.ts";
import * as http from "./http.ts";
import { assertEquals } from "./deps.ts";
import * as socket from "./socket.ts";

Deno.test("http get 200", async () => {
  const filePath = await Deno.makeTempDir() + "/docker.sock";
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

  socket.transport.kind = "unix";
  socket.transport.unix.path = filePath;

  const resp = await http.get("/test", {
    header: { k: "v" },
    params: { p: "v" },
  });
  listener.close();

  assertEquals(resp.body, 55);
});

Deno.test("http get with options", () => {
  const reqStr = http.newRequest({
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
    `GET test?json=1&sort=desc&all=true HTTP/1.1\r\nHost: localhost\r\nh1: v1\r\nh2: v2\r\nUser-Agent: Docker-Client/25.0.3\r\n\r\n{"name":"gorilla","age":28}\r\n`,
  );
});

Deno.test("http get without options", () => {
  const reqStr = http.newRequest({
    url: "test",
    method: "GET",
  });

  assertEquals(
    reqStr,
    `GET test HTTP/1.1\r\nHost: localhost\r\nUser-Agent: Docker-Client/25.0.3\r\n\r\n`,
  );
});
