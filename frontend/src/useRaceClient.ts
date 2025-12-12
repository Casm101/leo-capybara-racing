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

const STORAGE_KEY = 'race-client';

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
  const storageRef = useRef<{ id?: string; name?: string } | null>(null);

  // Load stored identity once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        storageRef.current = JSON.parse(raw);
      }
    } catch {
      storageRef.current = null;
    }
  }, []);

  const persistIdentity = (data: { id?: string; name?: string }) => {
    storageRef.current = data;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore storage failures
    }
  };

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
      // Auto-rejoin with stored name if we have no player yet
      if (!playerIdRef.current && storageRef.current?.name && !pendingJoinRef.current) {
        const name = storageRef.current.name;
        pendingJoinRef.current = name.toLowerCase();
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
          // Restore from stored ID if present in state
          if (!playerIdRef.current && storageRef.current?.id) {
            const found = message.payload.players[storageRef.current.id];
            if (found) {
              playerIdRef.current = found.id;
              setPlayerId(found.id);
              pendingNameRef.current = null;
              pendingJoinRef.current = null;
            }
          }
          // If we have a stored name but no ID yet, try joining again
          if (
            !playerIdRef.current &&
            storageRef.current?.name &&
            !pendingJoinRef.current &&
            !pendingNameRef.current &&
            wsRef.current?.readyState === WebSocket.OPEN
          ) {
            const name = storageRef.current.name;
            pendingJoinRef.current = name.toLowerCase();
            wsRef.current.send(JSON.stringify({ type: 'join', name } satisfies ClientMessage));
          }
          return;
        }

        if (message.type === 'joined') {
          setPlayerId(message.playerId);
          playerIdRef.current = message.playerId;
          pendingNameRef.current = null;
          pendingJoinRef.current = null;
          persistIdentity({ id: message.playerId, name: message.name });
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
        persistIdentity({ name: normalized });
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

  const forceReconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    try {
      wsRef.current?.close();
    } catch {
      // ignore close errors
    }
    connect();
  }, [connect]);

  const logout = useCallback(() => {
    pendingJoinRef.current = null;
    pendingNameRef.current = null;
    playerIdRef.current = null;
    persistIdentity({});
    setPlayerId(null);
    try {
      const payload: ClientMessage = { type: 'logout' };
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
      }
    } catch {
      // ignore send errors
    }
  }, []);

  return { state, playerId, notice, connected, send, forceReconnect, logout };
}
