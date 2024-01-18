import type winston from 'winston';
import https from 'https';

export const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});
export interface SSH {
  [s: string]: string | number | boolean | undefined;
  user: string;
  host: string;
  auth: string;
  port: number;
  knownHosts: string;
  allowRemoteHosts: boolean;
  allowRemoteCommand: boolean;
  pass?: string;
  key?: string;
  config?: string;
}

export interface SSL {
  key: string;
  cert: string;
}

export interface SSLBuffer {
  key?: Buffer;
  cert?: Buffer;
}

export interface Server {
  [s: string]: string | number | boolean;
  port: number;
  host: string;
  title: string;
  base: string;
  allowIframe: boolean;
}

export interface Config {
  ssh: SSH;
  server: Server;
  forceSSH: boolean;
  command: string;
  logLevel: typeof winston.level;
  ssl?: SSL;
}

export interface ConnectorsResponse {
  spec:Spec
}


export interface Connectors {
  bmc: Bmc
  ssh: Ssh
}

export interface Bmc {
  bmchost: string
  password: string
  username: string
}

export interface Ssh {
  sshhost: string
  password: string
  username: string
}

export interface Spec {
  connectors: Connectors
}