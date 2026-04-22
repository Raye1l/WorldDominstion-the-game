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

export function useGameSocket(): GameSocket {
  const socketRef = useRef<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  if (!socketRef.current) {
    socketRef.current = io();
  }

  useEffect(() => {
    const socket = socketRef.current!;

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

    return () => {
      socket.off('gameState', handleGameState);
      socket.off('moneyReceived', handleMoneyReceived);
      socket.disconnect();
    };
  }, []);

  const onJoinSuccess: GameSocket['onJoinSuccess'] = handler => {
    const socket = socketRef.current!;
    socket.on('joinSuccess', handler);
    return () => socket.off('joinSuccess', handler);
  };

  const onServerError: GameSocket['onServerError'] = handler => {
    const socket = socketRef.current!;
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
