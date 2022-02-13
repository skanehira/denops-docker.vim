export const transport = {
  kind: "unix",
  unixOpt: {
    transport: "unix",
    path: "/var/run/docker.sock",
  } as Deno.UnixConnectOptions,
  tcpOpt: {
    transport: "tcp",
    hostname: "localhost",
    port: 9999,
  } as Deno.ConnectOptions,
};

export const defaultOptions = ():
  | Deno.UnixConnectOptions
  | Deno.ConnectOptions => {
  return transport.kind === "unix" ? transport.unixOpt : transport.tcpOpt;
};

export async function connect(
  options?: Deno.UnixConnectOptions | Deno.ConnectOptions,
): Promise<Deno.Conn> {
  const conn = await Deno.connect(
    options ??
      defaultOptions(),
  );
  return conn;
}
