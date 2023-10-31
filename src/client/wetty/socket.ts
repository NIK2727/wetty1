import io from 'socket.io-client';

export const trim = (str: string): string => str.replace(/\/*$/, '');

const socketBase = "/plgconsole1/";
let refererFallback = "";
if (window.location.protocol === "blob:") {
  refererFallback = window.parent.location.href;
}
export const socket = io(window.location.origin, {
  path: `${trim(socketBase)}/socket.io`,
  extraHeaders: {
    "Referer-Fallback": refererFallback,
    "Authorization": (window as any).parentMessages.AuthToken
  }
});
