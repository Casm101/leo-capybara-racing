export function resolveWsUrl(): string {
  const env = import.meta.env.VITE_WS_URL;
  if (env) return env;

  if (typeof window !== 'undefined') {
    const searchParam = new URLSearchParams(window.location.search).get('ws');
    if (searchParam) return searchParam;

    const { protocol, hostname, port } = window.location;
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    const portPart = port && port !== '80' && port !== '443' ? `:${port}` : '';
    return `${wsProtocol}//${hostname}${portPart}`;
  }

  return 'ws://localhost:4000';
}
