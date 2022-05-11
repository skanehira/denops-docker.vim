import { makeTableString, TableKind } from "./table.ts";
import { Image } from "./types.ts";
import { assertEquals } from "./deps.ts";
import { readFile, readJSON } from "./testutil.ts";

{
  const tests = [
    {
      kind: "images",
      dataFile: "denops/docker/testdata/table/images.json",
      wantFile: "denops/docker/testdata/table/images.out",
    },
    {
      kind: "containers",
      dataFile: "denops/docker/testdata/table/containers.json",
      wantFile: "denops/docker/testdata/table/containers.out",
    },
    {
      kind: "searchImages",
      dataFile: "denops/docker/testdata/table/searchImages.json",
      wantFile: "denops/docker/testdata/table/searchImages.out",
    },
  ];

  for (const test of tests) {
    Deno.test(test.kind, async () => {
      const images = await readJSON<Image[]>(
        test.dataFile,
      );
      const table = makeTableString(images, test.kind as TableKind);
      const got = table;

      const want = await readFile(test.wantFile);

      assertEquals(got, want.split("\n"));
    });
  }
}
