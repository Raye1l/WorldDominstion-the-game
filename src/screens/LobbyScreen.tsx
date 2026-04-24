import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import { AlertTriangle, Globe, Key, Shield, UserX, XCircle } from 'lucide-react';
import type { Country, GameState } from '../shared/types';
import { GAME_CONFIG } from '../shared/constants';
import { GameLogo } from '../components/GameLogo';
import { getCountryImage } from '../utils/countryImages';

type Props = {
  socket: Socket;
  gameState: GameState;
  playerToken: string;
  onJoinedPassword: (pwd: string) => void;
  onEnterAdmin: () => void;
  globalError: string;
  onClearError: () => void;
};

export function LobbyScreen({
  socket,
  gameState,
  playerToken,
  onJoinedPassword,
  onEnterAdmin,
  globalError,
  onClearError,
}: Props) {
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminPwd, setAdminPwd] = useState('');
  const [adminError, setAdminError] = useState('');

  const [countryModalId, setCountryModalId] = useState<string | null>(null);
  const [countryPwd, setCountryPwd] = useState('');

  const tryAdminLogin = () => {
    if (adminPwd === GAME_CONFIG.ADMIN_PASSWORD) {
      onEnterAdmin();
      setAdminModalOpen(false);
    } else {
      setAdminError('Неверный пароль!');
    }
  };

  const joinCountry = (role: 'president' | 'citizen') => {
    if (!countryModalId) return;
    socket.emit('joinCountry', countryModalId, countryPwd, playerToken, role);
    onJoinedPassword(countryPwd);
  };

  const activeCountries = (Object.values(gameState.countries) as Country[]).filter(
    c => c.isActive !== false
  );
  const freeCountCount = activeCountries.filter(c => !c.ownerId).length;

  return (
    <div
      className="min-h-screen text-slate-100 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?auto=format&fit=crop&w=1920&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />

      <div className="w-full max-w-6xl flex flex-col items-center py-12 relative z-10">
        <GameLogo size="xl" className="mb-12 text-white drop-shadow-2xl" />

        <div className="w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 px-2">
            <h2 className="text-2xl font-black tracking-widest uppercase text-white flex items-center gap-3 drop-shadow-md">
              <Globe className="w-6 h-6 text-blue-400" />
              Выберите страну
            </h2>
            <div className="text-sm font-bold text-slate-300 uppercase tracking-widest bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700/50 shadow-lg">
              Доступно: {freeCountCount}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeCountries.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  setCountryModalId(c.id);
                  setCountryPwd('');
                }}
                className={`relative text-left transition-all duration-300 overflow-hidden group flex flex-col bg-slate-900/40 backdrop-blur-md rounded-2xl border ${c.ownerId
                    ? 'border-slate-700/50 opacity-60'
                    : 'border-slate-600/50 hover:border-blue-400/60 hover:bg-slate-800/60 shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1'
                  }`}
              >
                <div className="h-32 w-full relative overflow-hidden bg-slate-800">
                  <img
                    src={getCountryImage(c.id)}
                    alt={c.name}
                    className={`w-full h-full object-cover transition-transform duration-700 ${!c.ownerId ? 'group-hover:scale-110' : ''} ${c.ownerId ? 'grayscale opacity-50' : 'opacity-90 group-hover:opacity-100'}`}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent" />
                  <div className="absolute bottom-3 left-4 flex items-center gap-2">
                    <span className="text-3xl drop-shadow-lg">{c.flag}</span>
                    <h3 className="font-black text-lg uppercase tracking-wider text-white drop-shadow-lg">{c.name}</h3>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between bg-slate-900/60 border-t border-slate-700/50 w-full">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${c.ownerId ? 'bg-slate-500' : 'bg-green-400 shadow-green-400/50'}`} />
                    <p className={`text-xs font-bold uppercase tracking-widest ${c.ownerId ? 'text-slate-500' : 'text-slate-300'}`}>
                      {c.ownerId ? 'Занято' : 'Свободно'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {!c.ownerId && c.hasPassword && (
                      <div className="text-slate-400" title="Требуется пароль">
                        <Key className="w-4 h-4" />
                      </div>
                    )}
                    {c.ownerId && (
                      <div className="text-slate-500" title="Игрок в сети">
                        <UserX className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            setAdminModalOpen(true);
            setAdminPwd('');
            setAdminError('');
          }}
          className="mt-12 flex items-center justify-center gap-2 py-3 px-6 text-slate-300 hover:text-white font-bold rounded-full transition-all uppercase tracking-widest text-sm hover:bg-slate-800/50"
        >
          <Shield className="w-4 h-4" />
          Вход для администратора
        </button>
      </div>

      {globalError && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl p-8 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-black mb-4 text-red-600 flex items-center gap-3 uppercase tracking-wider">
              <AlertTriangle className="w-6 h-6" /> Ошибка
            </h3>
            <p className="mb-8 text-slate-600 font-medium">{globalError}</p>
            <button
              onClick={onClearError}
              className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors uppercase tracking-wider text-sm"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {adminModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl p-8 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-6 text-blue-600">
              <Shield className="w-6 h-6" />
              <h3 className="text-xl font-black uppercase tracking-wider">Панель админа</h3>
            </div>
            <input
              type="password"
              value={adminPwd}
              onChange={e => setAdminPwd(e.target.value)}
              placeholder="Введите пароль"
              className="w-full p-4 mb-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') tryAdminLogin();
              }}
            />
            {adminError && <p className="text-red-500 text-sm mb-4 font-medium flex items-center gap-2"><XCircle className="w-4 h-4" />{adminError}</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setAdminModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors uppercase tracking-wider text-sm"
              >
                Отмена
              </button>
              <button
                onClick={tryAdminLogin}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors uppercase tracking-wider text-sm shadow-sm"
              >
                Войти
              </button>
            </div>
          </div>
        </div>
      )}

      {countryModalId && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl p-8 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-6 text-emerald-600">
              <Key className="w-6 h-6" />
              <h3 className="text-xl font-black uppercase tracking-wider">Вход в страну</h3>
            </div>
            <p className="mb-6 text-slate-500 text-sm font-medium flex items-center gap-2">
              <span className="text-2xl">{gameState.countries[countryModalId]?.flag}</span>
              {gameState.countries[countryModalId]?.name}
            </p>
            <input
              type="password"
              value={countryPwd}
              onChange={e => setCountryPwd(e.target.value)}
              placeholder={gameState.countries[countryModalId]?.hasPassword ? 'Введите пароль страны' : 'Пароль не требуется'}
              disabled={!gameState.countries[countryModalId]?.hasPassword}
              className="w-full p-4 mb-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono disabled:opacity-50 disabled:bg-slate-200"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') joinCountry('president');
              }}
            />
            <div className="flex flex-col gap-3 mt-4">
              <button
                onClick={() => joinCountry('president')}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors uppercase tracking-wider text-sm shadow-sm"
              >
                Войти как Президент
              </button>
              <button
                onClick={() => joinCountry('citizen')}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors uppercase tracking-wider text-sm shadow-sm"
              >
                Войти как Гражданин
              </button>
              <button
                onClick={() => setCountryModalId(null)}
                className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors uppercase tracking-wider text-sm mt-2"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
