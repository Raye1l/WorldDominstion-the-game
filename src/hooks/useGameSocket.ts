import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState } from '../shared/types';

export type PlayerRole = 'president' | 'citizen';

export type JoinSuccess = { countryId: string; role: PlayerRole };

export type Notification = { id: string; message: string };

export type GameSocket = {
  socket: Socket | null;
  gameState: GameState | null;
  onJoinSuccess: (handler: (payload: JoinSuccess) => void) => () => void;
  onServerError: (handler: (msg: string) => void) => () => void;
  notifications: Notification[];
};

// Singleton socket — survives StrictMode double-invoke
let _socket: Socket | null = null;
function getSocket(): Socket {
  if (!_socket) {
    _socket = io();
  }
  return _socket;
}

export function useGameSocket(): GameSocket {
  const socketRef = useRef<Socket>(getSocket());
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const socket = socketRef.current;

    const handleGameState = (state: GameState) => setGameState(state);
    const handleMoneyReceived = ({ from, amount }: { from: string; amount: number }) => {
      const id = Math.random().toString(36).substring(7);
      setNotifications(prev => [...prev, { id, message: `Вы получили ${amount}$ от ${from}!` }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);
    };

    socket.on('gameState', handleGameState);
    socket.on('moneyReceived', handleMoneyReceived);

    // If already connected (e.g. StrictMode remount), request state again
    if (socket.connected) {
      socket.emit('requestState');
    }

    return () => {
      socket.off('gameState', handleGameState);
      socket.off('moneyReceived', handleMoneyReceived);
      // Don't disconnect — socket is a singleton
    };
  }, []);

  const onJoinSuccess: GameSocket['onJoinSuccess'] = handler => {
    const socket = socketRef.current;
    socket.on('joinSuccess', handler);
    return () => socket.off('joinSuccess', handler);
  };

  const onServerError: GameSocket['onServerError'] = handler => {
    const socket = socketRef.current;
    socket.on('error', handler);
    return () => socket.off('error', handler);
  };

  return {
    socket: socketRef.current,
    gameState,
    onJoinSuccess,
    onServerError,
    notifications,
  };
}
