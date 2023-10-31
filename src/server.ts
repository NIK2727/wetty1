/**
 * Create WeTTY server
 * @module WeTTy
 */
import express from 'express';
import gc from 'gc-stats';
import axios from 'axios';
import { httpsAgent, type ConnectorsResponse, type SSH, type SSL, type Server } from './shared/interfaces.js';
import { getCommand, generateCommand } from './server/command.js';
import { Gauge, collectDefaultMetrics } from 'prom-client';
import { getCommand } from './server/command.js';
import { gcMetrics } from './server/metrics.js';
import { server } from './server/socketServer.js';
import { spawn } from './server/spawn.js';
import {
  sshDefault,
  serverDefault,
  forceSSHDefault,
  defaultCommand,
} from './shared/defaults.js';
import { logger as getLogger } from './shared/logger.js';
import type { SSH, SSL, Server } from './shared/interfaces.js';
import type { Express } from 'express';
import type SocketIO from 'socket.io';

export * from './shared/interfaces.js';
export { logger as getLogger } from './shared/logger.js';


const wettyConnections = new Gauge({
  name: 'wetty_connections',
  help: 'number of active socket connections to wetty',
});

/**
 * Starts WeTTy Server
 * @name startServer
 * @returns Promise that resolves SocketIO server
 */
export const start = (
  ssh: SSH = sshDefault,
  serverConf: Server = serverDefault,
  command: string = defaultCommand,
  forcessh: boolean = forceSSHDefault,
  ssl: SSL | undefined = undefined,
): Promise<SocketIO.Server> =>
  decorateServerWithSsh(express(), ssh, serverConf, command, forcessh, ssl);

export async function decorateServerWithSsh(
  app: Express,
  ssh: SSH = sshDefault,
  serverConf: Server = serverDefault,
  command: string = defaultCommand,
  forcessh: boolean = forceSSHDefault,
  ssl: SSL | undefined = undefined,
): Promise<SocketIO.Server> {
  const logger = getLogger();
  if (ssh.key) {
    logger.warn(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
! Password-less auth enabled using private key from ${ssh.key}.
! This is dangerous, anything that reaches the wetty server
! will be able to run remote operations without authentication.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
  }

  collectDefaultMetrics();
  gc().on('stats', gcMetrics);

  const io = await server(app, serverConf, ssl);
  /**
   * Wetty server connected too
   * @fires WeTTy#connnection
   */
  io.on('connection', async (socket: SocketIO.Socket) => {
    /**
     * @event wetty#connection
     * @name connection
     */
    logger.info('Connection accepted.');
    if (!socket.request.headers['referer-fallback']) {
      socket.emit('error', `${403}: wetty only works in an iframe`);
      return;
    }
    let urll = new URL(`${socket.request.headers['referer-fallback']}`);
    let parts = urll.pathname.split('/');
    try {
      let engineResponse = await axios.get<ConnectorsResponse>(
        `${process.env.MDCAP_ENGINE_URL}/element/${parts[parts.length - 1]}`,
        {
          headers: {
            "Authorization": `${socket.request.headers.authorization}`
          },
          responseType: 'json',
          httpsAgent,
        },
      )
        .then(({ data }) => data);
      command = generateCommand(engineResponse, `${urll.searchParams.get('console')}`);
    } catch (error) {
      const { request, response, message } = error as any;
      if (response) {
        const { status, data } = response;
        logger.error('errEngine', { status, data });
        socket.emit('error', `${status}: ${data}`);
      } else if (request) {
        logger.error('errEngine', request);
        socket.emit('error', `${500}: No response from engine`);
      } else {
        logger.error('errEngine', message);
        socket.emit('error', `${500}: ${message}`);
      }
    }
    wettyConnections.inc();

    try {
      const args = await getCommand(socket, ssh, command, forcessh);
      logger.debug('Command Generated', { cmd: args.join(' ') });
      await spawn(socket, args);
    } catch (error) {
      logger.info('Disconnect signal sent', { err: error });
      wettyConnections.dec();
    }
  });
  return io;
}
