import { makeTableString } from "./table.ts";
import { Image } from "./types.ts";
import { assertEquals } from "https://deno.land/std@0.97.0/testing/asserts.ts";
import { readFile, readJSON } from "./testutil.ts";

const tests = [
  {
    name: "images",
    dataFile: "denops/docker/testdata/table/images.json",
    wantFile: "denops/docker/testdata/table/images.out",
  },
  {
    name: "containers table",
    dataFile: "denops/docker/testdata/table/containers.json",
    wantFile: "denops/docker/testdata/table/containers.out",
  },
  {
    name: "search images",
    dataFile: "denops/docker/testdata/table/searchImages.json",
    wantFile: "denops/docker/testdata/table/searchImages.out",
  },
];

tests.forEach((test) => {
  Deno.test(test.name, async () => {
    const images = await readJSON<Image[]>(
      test.dataFile,
    );
    const table = makeTableString(images);
    const got = table;

    const want = await readFile(test.wantFile);

    assertEquals(got, want.split("\n"));
  });
});
