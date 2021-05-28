const defaultOptions = <Deno.UnixConnectOptions> {
  transport: "unix",
  path: "/var/run/docker.sock",
};

export async function connect(
  options?: Deno.UnixConnectOptions | Deno.ConnectOptions,
): Promise<Deno.Conn> {
  const conn = await Deno.connect(options ?? defaultOptions);
  return conn;
}
