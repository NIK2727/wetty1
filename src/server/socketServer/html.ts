import { isDev } from '../../shared/env.js';
import type { Request, Response, RequestHandler } from 'express';
import axios from 'axios';
import { logger } from '../../shared/logger.js';
import { ConnectorsResponse, httpsAgent } from '../../shared/interfaces.js';

const jsFiles = isDev ? ['iframe', 'dev', 'wetty'] : ['iframe', 'wetty'];
const cssFiles = ['styles', 'options', 'overlay', 'terminal'];

const render = (
  title: string,
  favicon: string,
  css: string[],
  js: string[],
  configUrl: string,
  parentOrigin: string
): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <link rel="icon" type="image/x-icon" href="${favicon}">
    <base href="${parentOrigin}"/>
    <title>${title}</title>
    ${css.map(file => `<link rel="stylesheet" href="${file}" />`).join('\n')}
  </head>
  <body>
    <div id="overlay">
      <div class="error">
        <div id="msg"></div>
        <input type="button" onclick="location.reload();" value="reconnect" />
      </div>
    </div>
    <div id="options">
      <a class="toggler"
         href="#"
         alt="Toggle options"
       ><i class="fas fa-cogs"></i></a>
      <iframe class="editor" src="${configUrl}"></iframe>
    </div>
    <div id="terminal"></div>
    ${js
    .map(file => `<script type="module" src="${file}"></script>`)
    .join('\n')}
  </body>
</html>`;

export const html = (base: string, title: string): RequestHandler => async (
  req: Request,
  res: Response,
  ): Promise<void> => {
    let urlS = req.headers['referer'] || req.headers['referer-fallback'];
    if (!urlS) {
      res.status(400).send("Bad Request: Referer was empty")
      return;
    }
    let url = new URL(`${urlS}`);
    let parts = url.pathname.split('/');
    try {
      if (parts[parts.length - 1] === 'playground') {
        logger().info('Connection Playground');
      }
      else {
      await axios.get<ConnectorsResponse>(
        `${process.env.MDCAP_ENGINE_URL}/element/${parts[parts.length - 1]}`,
        {
          headers: {
            "Authorization": `${req.headers.authorization}`
          },
          responseType: 'json',
          httpsAgent,
        },
      );
    }
    } catch (error) {
      const { request, response, message } = error as any;
      if (response) {
        const { status, data } = response;
        logger().error('errEngine', { status, data });
        res.status(status).send(data);
      } else if (request) {
        logger().error('errEngine', request);
        res.status(500).send("No response from engine");
      } else {
        logger().error('errEngine', message);
        res.status(500).send(message);
      }
      return;
    }
  res.send(
    render(
      title,
      `${base}/favicon.ico`,
      cssFiles.map(css => `${base}/assets/css/${css}.css`),
      jsFiles.map(js => `${base}/client/${js}.js`),
      `${base}/assets/xterm_config/index.html`,
      `https://${req.headers.host}`
    ),
  );
};
