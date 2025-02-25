import { assertEquals } from "jsr:@std/assert@1.0.11";
import { buildDockerCommand } from "./util.ts";

{
  const tests = [
    {
      name: "has parameter",
      line:
        "70586698897d sad_jemison              golang:1.14.4           Up 10 hours             2021/07/21 15:17:42 0.0.0.0:8084->80/tcp, :::8084->80/tcp               ",
      command: "docker start {1}",
      want: ["docker", "start", "sad_jemison"],
    },
    {
      name: "has no parameter",
      line:
        "70586698897d sad_jemison              golang:1.14.4           Up 10 hours             2021/07/21 15:17:42 0.0.0.0:8084->80/tcp, :::8084->80/tcp               ",
      command: "docker stop sad_jemison",
      want: ["docker", "stop", "sad_jemison"],
    },
    {
      name: "out of index",
      line: "70586698897d sad_jemison",
      command: "docker stop {2}",
      want: [],
    },
  ];

  for (const test of tests) {
    Deno.test(test.name, () => {
      const got = buildDockerCommand(test.line, test.command);
      assertEquals(got, test.want);
    });
  }
}
