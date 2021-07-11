import { Image } from "./type.ts";
import { Table } from "https://deno.land/x/cliffy@v0.19.0/table/mod.ts";
import { formatBytes } from "./util.ts";

export class ImageTable {
  #images: Image[];
  constructor(images: Image[]) {
    this.#images = images;
  }

  toString(): string {
    // column is
    // ID, REPOSITORY, TAG, CREATED, SIZE
    const body = new Array<Array<string | number>>();
    this.#images.forEach((image) => {
      image.RepoTags?.forEach((v) => {
        const [repo, tag] = v.split(":");
        const line = [
          image.Id.substring(7, 19),
          repo,
          tag,
          new Date(image.Created * 1000).toISOString(),
          formatBytes(image.Size),
        ];
        body.push(line);
      });
    });

    const header = ["ID", "REPOSITORY", "TAG", "CREATED", "SIZE"];

    const table = new Table()
      .header(header)
      .body(body)
      .toString();

    return table;
  }
}
