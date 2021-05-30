import { ImageTable } from "./table.ts";
import { Image } from "./type.ts";
import { assertEquals } from "https://deno.land/std@0.97.0/testing/asserts.ts";
import { readFile, readJSON } from "./testutil.ts";

Deno.test("image table", async () => {
  const images = await readJSON<Image[]>(
    "denops/docker/testdata/table/images.json",
  );
  const table = new ImageTable(images);
  const got = table.toString();

  const want = await readFile("denops/docker/testdata/table/images.out");
  assertEquals(got, want);
});
