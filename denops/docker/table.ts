import { Container, Image } from "./type.ts";
import { Table } from "https://deno.land/x/cliffy@v0.19.0/table/mod.ts";
import { formatBytes } from "./util.ts";

function isImage(data: unknown): data is Image[] {
  const images = data as Image[];
  return images[0].RepoTags !== undefined;
}

function isContainer(data: unknown): data is Container[] {
  const cons = data as Container[];
  return cons[0].State !== undefined;
}

export function makeTableString(data: unknown): string[] {
  if (isImage(data)) {
    return makeImageTable(data);
  } else if (isContainer(data)) {
    return makeContainerTable(data);
  }
  return [];
}

function makeImageTable(images: Image[]): string[] {
  // column is
  // ID, REPOSITORY, TAG, CREATED, SIZE
  const body = new Array<Array<string | number>>();
  images.forEach((image) => {
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

  const table = new Table();
  table.header(header)
    .body(body);

  return table.toString().split("\n");
}

function makeContainerTable(containers: Container[]): string[] {
  // column is
  // ID, NAME, IMAGE, STATUS, CREATED, PORT
  const body = new Array<Array<string>>();
  containers.forEach((container) => {
    const line = [
      container.Id.substring(7, 19),
      container.Names[0],
      container.Image,
      container.Status,
      new Date(container.Created * 1000).toISOString(),
      container.Ports.join(" ").toString(),
    ];
    body.push(line);
  });

  const header = ["ID", "NAME", "IMAGE", "STATUS", "CREATED", "PORT"];

  const table = new Table();
  table.header(header)
    .body(body);

  return table.toString().split("\n");
}
