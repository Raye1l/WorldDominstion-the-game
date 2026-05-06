import { useEffect, useState } from 'react';
import { useGameSocket, type PlayerRole } from './hooks/useGameSocket';
import { useRoundTimer } from './hooks/useRoundTimer';
import { LobbyScreen } from './screens/LobbyScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import { RoundEndScreen } from './screens/RoundEndScreen';
import { AdminScreen } from './screens/AdminScreen';
import { DashboardScreen } from './screens/DashboardScreen';

function usePlayerToken(): string {
  const [token] = useState(() => {
    let existing = localStorage.getItem('playerToken');
    if (!existing) {
      existing = Math.random().toString(36).substring(2);
      localStorage.setItem('playerToken', existing);
    }
    return existing;
  });
  return token;
}

export default function App() {
  const { socket, gameState, onJoinSuccess, onServerError, notifications } = useGameSocket();
  const timeLeft = useRoundTimer(gameState);
  const playerToken = usePlayerToken();

  const [myCountryId, setMyCountryId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<PlayerRole | null>(null);
  const [myCountryPassword, setMyCountryPassword] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSpectatorMode, setIsSpectatorMode] = useState(false);
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    return onJoinSuccess(({ countryId, role }) => {
      setMyCountryId(countryId);
      setMyRole(role);
    });
  }, [onJoinSuccess]);

  useEffect(() => {
    return onServerError((msg) => {
      setGlobalError(msg);
      setMyCountryId(null);
      setMyRole(null);
    });
  }, [onServerError]);

  useEffect(() => {
    if (!socket) return;
    const handleConnect = () => {
      if (myCountryId && myRole) {
        socket.emit('joinCountry', myCountryId, myCountryPassword, playerToken, myRole);
      }
    };
    socket.on('connect', handleConnect);
    return () => { socket.off('connect', handleConnect); };
  }, [socket, myCountryId, myRole, myCountryPassword, playerToken]);

  if (!socket || !gameState) {
    return <div className="flex h-screen items-center justify-center bg-[#12231E] text-white">Загрузка...</div>;
  }

  const leaveCountry = () => {
    socket.emit('leaveCountry');
    setMyCountryId(null);
    setMyRole(null);
  };

  if (!myCountryId && !isAdmin) {
    return (
      <LobbyScreen
        socket={socket}
        gameState={gameState}
        playerToken={playerToken}
        onJoinedPassword={setMyCountryPassword}
        onEnterAdmin={() => setIsAdmin(true)}
        globalError={globalError}
        onClearError={() => setGlobalError('')}
      />
    );
  }

  if (gameState.status === 'finished') {
    return (
      <GameOverScreen
        socket={socket}
        gameState={gameState}
        isAdmin={isAdmin}
        isSpectatorMode={isSpectatorMode}
        onExitSpectator={() => setIsSpectatorMode(false)}
      />
    );
  }

  if (gameState.status === 'round_end' || isSpectatorMode) {
    return (
      <RoundEndScreen
        socket={socket}
        gameState={gameState}
        myCountryId={myCountryId}
        isAdmin={isAdmin}
        isSpectatorMode={isSpectatorMode}
        timeLeft={timeLeft}
        onLeaveCountry={leaveCountry}
        onExitSpectator={() => setIsSpectatorMode(false)}
      />
    );
  }

  if (isAdmin) {
    return (
      <AdminScreen
        socket={socket}
        gameState={gameState}
        timeLeft={timeLeft}
        onEnterSpectator={() => setIsSpectatorMode(true)}
        onExitAdmin={() => setIsAdmin(false)}
      />
    );
  }

  return (
    <DashboardScreen
      socket={socket}
      gameState={gameState}
      myCountryId={myCountryId!}
      timeLeft={timeLeft}
      notifications={notifications}
      onLeaveCountry={leaveCountry}
    />
  );
}
