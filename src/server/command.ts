import process from 'node:process';
import url from 'url';
import _ from 'lodash';
import { address } from './command/address.js';
import { loginOptions } from './command/login.js';
import { sshOptions } from './command/ssh.js';
import type { ConnectorsResponse, SSH } from '../shared/interfaces';
import type { Socket } from 'socket.io';

const localhost = (host: string): boolean =>
  !_.isUndefined(process.getuid) &&
  process.getuid() === 0 &&
  (host === 'localhost' || host === '0.0.0.0' || host === '127.0.0.1');

const urlArgs = (
  referer: string | undefined,
  {
    allowRemoteCommand,
    allowRemoteHosts,
  }: {
    allowRemoteCommand: boolean;
    allowRemoteHosts: boolean;
  },
): { [s: string]: string } =>
  _.pick(
    _.pickBy(url.parse(referer || '', true).query, _.isString),
    ['pass'],
    allowRemoteCommand ? ['command', 'path'] : [],
    allowRemoteHosts ? ['port', 'host'] : [],
  );

export async function getCommand(
  socket: Socket,
  {
    user,
    host,
    port,
    auth,
    pass,
    key,
    knownHosts,
    config,
    allowRemoteHosts,
    allowRemoteCommand,
  }: SSH,
  command: string,
  forcessh: boolean
): Promise<string[]> {
  const {
    request: { headers: { referer } },
    client: { conn: { remoteAddress } },
  } = socket;

  if (!forcessh && localhost(host)) {
    return loginOptions(command, remoteAddress);
  }

  const sshAddress = await address(socket, user, host);
  const args = urlArgs(headers.referer || `${headers['referer-fallback']}` = {
    host: sshAddress,
    port: `${port}`,
    pass: pass || '',
    command,
    auth,
    knownHosts,
    config: config || '',
    ...urlArgs(referer, { allowRemoteHosts, allowRemoteCommand }),
  };
  return sshOptions(args, key);
}

export const generateCommand = (data: ConnectorsResponse, consoleType: string): string => {
  let command = ''
  switch (consoleType) {
    case 'sshconsole':
      command = `sshpass -p ${data.spec.connectors.ssh.password} ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${data.spec.connectors.ssh.username}@${data.spec.connectors.ssh.sshhost}`;
      break;
    case 'ipmiact':
      command = `ipmitool -I lanplus -H ${data.spec.connectors.bmc.bmchost} -U ${data.spec.connectors.bmc.username} -P ${data.spec.connectors.bmc.password} -e=. sol activate`;
      break;
    case 'ipmideact':
      command = `ipmitool -I lanplus -H ${data.spec.connectors.bmc.bmchost} -U ${data.spec.connectors.bmc.username} -P ${data.spec.connectors.bmc.password} -e=. sol deactivate`;
      break;
    case 'ipmi_warm_reset':
      command = `ipmitool -I lanplus -H ${data.spec.connectors.bmc.bmchost} -U ${data.spec.connectors.bmc.username} -P ${data.spec.connectors.bmc.password} chassis power reset warm`;
      break;
    case 'ipmi_cold_reset':
      command = `ipmitool -I lanplus -H ${data.spec.connectors.bmc.bmchost} -U ${data.spec.connectors.bmc.username} -P ${data.spec.connectors.bmc.password} chassis power reset cold`;
      break;
    case 'ipmi_factory_reset':
      command = `ipmitool -I lanplus -H ${data.spec.connectors.bmc.bmchost} -U ${data.spec.connectors.bmc.username} -P ${data.spec.connectors.bmc.password} chassis power reset`;
      break;
    case 'bmcconsole':
      command = `sshpass -p ${data.spec.connectors.bmc.password} ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${data.spec.connectors.bmc.username}@${data.spec.connectors.bmc.bmchost}`;
      break;
    default:
      return '';
  }
  return command;
}
