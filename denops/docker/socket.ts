export const transport = {
  kind: "unix",
  unix: {
    path: "/var/run/docker.sock",
  },
};

export async function connect(): Promise<Deno.Conn> {
  return transport.kind === "unix"
    ? await Deno.connect({ transport: "unix", path: transport.unix.path })
    : await Deno.connect({
      transport: "tcp",
      hostname: "localhost",
      port: 9999,
    });
}
