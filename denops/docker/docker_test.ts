import { assertEquals } from "jsr:@std/assert@1.0.11";
import { parseDirectoryItems } from "./docker.ts";

Deno.test("parse directory items", () => {
  const input = `
total 36
drwx------    1 root     root          4096 May  9 13:40 .
drwxr-xr-x    1 root     root          4096 Apr 30 09:41 ..
-rw-------    1 root     root           265 May 12 06:59 .ash_history
drwxr-xr-x    3 root     root          4096 Apr 30 09:41 .vim
-rw-------    1 root     root         12195 Apr 30 09:41 .viminfo
drwxr-xr-x    2 root     root          4096 May  9 13:40 hello
-rw-r--r--    1 root     root           171 May  9 11:59 index.html
  `;
  const got = parseDirectoryItems(input, "/root");
  const want = [
    { type: "file", path: "/root/.ash_history", "name": ".ash_history" },
    { type: "dir", path: "/root/.vim/", "name": ".vim" },
    { type: "file", path: "/root/.viminfo", "name": ".viminfo" },
    { type: "dir", path: "/root/hello/", "name": "hello" },
    { type: "file", path: "/root/index.html", "name": "index.html" },
  ];
  assertEquals(want, got);
});
