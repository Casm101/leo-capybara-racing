import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, PublicState, ServerMessage } from './types';

const INITIAL_STATE: PublicState = {
  horses: [],
  players: {},
  bets: [],
  race: { status: 'idle', positions: {}, tick: 0 },
  config: { horseCount: 10, trackLength: 100, tickMs: 600 },
  winningBets: [],
  showQrOverlay: true,
};

export function useRaceClient(url: string) {
  const [state, setState] = useState<PublicState>(INITIAL_STATE);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingNameRef = useRef<string | null>(null);
  const playerIdRef = useRef<string | null>(null);
  const pendingJoinRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const socket = new WebSocket(url);
    wsRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      if (pendingJoinRef.current) {
        const name = pendingJoinRef.current;
        socket.send(JSON.stringify({ type: 'join', name } satisfies ClientMessage));
      }
    };

    socket.onclose = () => {
      setConnected(false);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(connect, 1200);
    };

    socket.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        if (!message?.type) return;

        if (message.type === 'state') {
          setState(message.payload);
          if (!playerIdRef.current && pendingNameRef.current) {
            const match = Object.values(message.payload.players).find(
              (p) => p.name.toLowerCase() === pendingNameRef.current,
            );
            if (match) {
              playerIdRef.current = match.id;
              setPlayerId(match.id);
              pendingNameRef.current = null;
            }
          }
          return;
        }

        if (message.type === 'joined') {
          setPlayerId(message.playerId);
          playerIdRef.current = message.playerId;
          pendingNameRef.current = null;
          pendingJoinRef.current = null;
          setNotice(null);
          return;
        }

        if (message.type === 'notice') {
          setNotice(message.message);
        }
      } catch (error) {
        console.error('Failed to parse server message', error);
      }
    };
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback(
    (payload: ClientMessage) => {
      if (payload.type === 'join') {
        const normalized = payload.name.trim();
        pendingNameRef.current = normalized.toLowerCase();
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ ...payload, name: normalized }));
          pendingJoinRef.current = null;
          return;
        }
        pendingJoinRef.current = normalized;
        return;
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
      }
    },
    [],
  );

  return { state, playerId, notice, connected, send };
}
