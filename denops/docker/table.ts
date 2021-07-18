import type { Container, Image, Port, SearchImage } from "./types.ts";
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

function isSearchImage(data: unknown): data is SearchImage[] {
  const images = data as SearchImage[];
  return images[0].star_count != undefined;
}

export function makeTableString(data: unknown): string[] {
  if (isImage(data)) {
    return makeImageTable(data);
  } else if (isContainer(data)) {
    return makeContainerTable(data);
  } else if (isSearchImage(data)) {
    return makeSearchImage(data);
  }
  return [];
}

function makeSearchImage(images: SearchImage[]): string[] {
  const body = new Array<Array<string | number>>();
  images.forEach((image) => {
    const line = [
      image.name,
      image.description,
      image.star_count,
      image.is_official ? "[OK]" : "",
      image.is_automated ? "[OK]" : "",
    ];
    body.push(line);
  });

  const header = ["NAME", "DESCRIPTION", "STARTS", "OFFICIAL", "AUTOMATED"];

  const table = new Table();
  table.header(header)
    .body(body);

  return table.toString().split("\n");
}

function makeImageTable(images: Image[]): string[] {
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
  const body = new Array<Array<string>>();
  containers.forEach((container) => {
    const line = [
      container.Id.substring(0, 12),
      container.Names[0].substring(1),
      container.Image.length > 20
        ? `${container.Image.substring(0, 20)}...`
        : container.Image,
      container.Status,
      new Date(container.Created * 1000).toISOString(),
      container.Ports.map((port) => {
        return portString(port);
      }).join(", "),
    ];
    body.push(line);
  });

  const header = ["ID", "NAME", "IMAGE", "STATUS", "CREATED", "PORTS"];

  const table = new Table();
  table.header(header)
    .body(body);

  return table.toString().split("\n");
}

function portString(port: Port): string {
  const exposed = `PublicPort` in port;
  return exposed
    ? `${port.IP}:${port.PublicPort}->${port.PrivatePort}/${port.Type}`
    : `${port.PrivatePort}/${port.Type}`;
}
