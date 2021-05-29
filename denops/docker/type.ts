export interface Image {
  Id: string;
  ParentId: string;
  RepoTags: string[];
  RepoDigests: string[];
  Created: number;
  Size: number;
  VirtualSize: number;
  SharedSize: number;
  Labels: Record<string, unknown>;
  Containers: number;
}

export interface Container {
  Id: string;
  Names: string[];
  Image: string;
  ImageID: string;
  Command: string;
  Created: number;
  State: string;
  Status: string;
  Ports: Port[];
  Labels: Labels;
  SizeRw: number;
  SizeRootFs: number;
  HostConfig: HostConfig;
  NetworkSettings: NetworkSettings;
  Mounts: Mount[];
}

export interface Port {
  PrivatePort: number;
  PublicPort: number;
  Type: string;
}

export interface Labels {
  "com.example.vendor"?: string;
  "com.example.license"?: string;
  "com.example.version"?: string;
}

export interface HostConfig {
  NetworkMode: string;
}

export interface NetworkSettings {
  Networks: Networks;
}

export interface Networks {
  bridge: Bridge;
}

export interface Bridge {
  NetworkID: string;
  EndpointID: string;
  Gateway: string;
  IPAddress: string;
  IPPrefixLen: number;
  IPv6Gateway: string;
  GlobalIPv6Address: string;
  GlobalIPv6PrefixLen: number;
  MacAddress: string;
}

export interface Mount {
  Name: string;
  Source: string;
  Destination: string;
  Driver: string;
  Mode: string;
  RW: boolean;
  Propagation: string;
}

export interface SearchImage {
  description: string;
  is_official: boolean;
  is_automated: boolean;
  name: string;
  star_count: number;
}

export interface removeContainerOpts {
  v: boolean;
  force: boolean;
  link: boolean;
}

export interface removeImageOpts {
  force: boolean;
  noprune: boolean;
}
