import type { Socket } from 'socket.io-client';
import {
  Activity, Bell, CheckCircle2, DollarSign, Globe, History, Key,
  MessageSquare, Monitor, Play, PowerOff, Rocket, RotateCcw, Send,
  Shield, SkipForward, Terminal, Users, UserX,
} from 'lucide-react';
import type { Country, GameState } from '../shared/types';

type Props = {
  socket: Socket;
  gameState: GameState;
  timeLeft: number | null;
  onEnterSpectator: () => void;
  onExitAdmin: () => void;
};

export function AdminScreen({ socket, gameState, timeLeft, onEnterSpectator, onExitAdmin }: Props) {
  const countries = Object.values(gameState.countries) as Country[];

  const statusLabel =
    gameState.status === 'playing' ? 'Идет игра' :
    gameState.status === 'waiting' ? 'Ожидание' :
    'Пауза';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="bg-slate-900 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Shield className="w-8 h-8 text-blue-400" />
            <h2 className="text-2xl font-black tracking-wider uppercase text-center">Панель Администратора</h2>
            <div className="px-3 py-1 bg-slate-800 rounded-full text-sm font-bold border border-slate-700">
              Раунд {gameState.round} • {statusLabel}
            </div>
          </div>

          {timeLeft !== null && (
            <div className={`font-mono text-3xl font-bold px-6 py-1.5 rounded-lg shadow-inner ${timeLeft < 60 ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/50' : 'bg-slate-800 text-green-400 border border-slate-700'}`}>
              {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{Math.floor(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={onEnterSpectator} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-md">
              <Monitor className="w-4 h-4" /> Режим зрителя
            </button>
            <div className="w-px h-8 bg-slate-700 mx-1 hidden sm:block"></div>
            <button onClick={() => socket.emit('adminStart')} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-md">
              <Play className="w-4 h-4" /> Начать
            </button>
            <button onClick={() => socket.emit('adminNextRound')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-md">
              <SkipForward className="w-4 h-4" /> След. раунд
            </button>
            <button onClick={() => socket.emit('adminReset')} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-md">
              <RotateCcw className="w-4 h-4" /> Сброс
            </button>
            <div className="w-px h-8 bg-slate-700 mx-2"></div>
            <button onClick={onExitAdmin} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-md">
              <PowerOff className="w-4 h-4" /> Выйти
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-4 md:p-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Globe className="w-6 h-6 text-blue-600" /> Управление странами
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {countries.map(c => (
              <div key={c.id} className={`bg-white rounded-xl shadow-sm border transition-all ${c.isActive === false ? 'opacity-60 border-gray-200 bg-gray-50' : 'border-slate-200 hover:shadow-md'}`}>
                <div className="p-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2 bg-slate-50/50 rounded-t-xl">
                  <div className="font-bold text-lg flex items-center gap-2">
                    <span className="text-2xl drop-shadow-sm">{c.flag}</span>
                    {c.name}
                  </div>
                  <div className="flex items-center gap-3">
                    {c.isActive !== false && c.ownerId && (
                      <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${c.isReady ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                        {c.isReady ? <CheckCircle2 className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                        {c.isReady ? 'Готов' : 'Думает'}
                      </div>
                    )}
                    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={c.isActive !== false}
                        onChange={(e) => socket.emit('toggleCountryActive', c.id, e.target.checked)}
                        disabled={gameState.status !== 'waiting'}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      В игре
                    </label>
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col items-center justify-center">
                      <span className="text-xs text-slate-500 font-medium uppercase mb-1">Бюджет</span>
                      <span className="font-mono font-bold text-blue-600 text-lg">{c.money}$</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col items-center justify-center">
                      <span className="text-xs text-slate-500 font-medium uppercase mb-1">Игрок</span>
                      <span className={`font-bold text-sm flex items-center gap-1 ${c.ownerId ? 'text-green-600' : 'text-slate-400'}`}>
                        {c.ownerId ? <><Users className="w-4 h-4" /> В сети</> : <><UserX className="w-4 h-4" /> Нет</>}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <DollarSign className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          placeholder="Сумма"
                          className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                          id={`money-${c.id}`}
                        />
                      </div>
                      <button
                        onClick={() => {
                          const input = document.getElementById(`money-${c.id}`) as HTMLInputElement;
                          const amount = parseInt(input.value);
                          if (!isNaN(amount) && amount !== 0) {
                            socket.emit('adminModifyMoney', c.id, amount);
                            input.value = '';
                          }
                        }}
                        className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors whitespace-nowrap"
                      >
                        Изменить
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Rocket className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          placeholder="Ракеты"
                          className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                          id={`missiles-${c.id}`}
                        />
                      </div>
                      <button
                        onClick={() => {
                          const input = document.getElementById(`missiles-${c.id}`) as HTMLInputElement;
                          const amount = parseInt(input.value);
                          if (!isNaN(amount) && amount !== 0) {
                            socket.emit('adminModifyMissiles', c.id, amount);
                            input.value = '';
                          }
                        }}
                        className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors whitespace-nowrap"
                      >
                        Изменить
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Key className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder={c.hasPassword ? 'Пароль установлен' : 'Без пароля'}
                          className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                          id={`pwd-${c.id}`}
                        />
                      </div>
                      <button
                        onClick={() => {
                          const input = document.getElementById(`pwd-${c.id}`) as HTMLInputElement;
                          socket.emit('setCountryPassword', c.id, input.value);
                          input.value = '';
                        }}
                        className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors whitespace-nowrap"
                      >
                        Пароль
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {gameState.roundResults && Object.keys(gameState.roundResults).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 mt-8 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <History className="w-5 h-5 text-slate-500" />
                <h3 className="font-bold uppercase text-slate-800">Итоги раундов</h3>
              </div>
              <div className="p-4 space-y-6">
                {Object.entries(gameState.roundResults).sort(([a], [b]) => Number(b) - Number(a)).map(([roundNum, results]) => (
                  <div key={roundNum} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-bold text-slate-700 flex justify-between items-center">
                      <span>Раунд {roundNum}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-white text-slate-500 uppercase text-xs border-b border-slate-100">
                          <tr>
                            <th className="px-4 py-3 font-medium">Страна</th>
                            <th className="px-4 py-3 font-medium text-right">Бюджет</th>
                            <th className="px-4 py-3 font-medium text-right">Ракеты</th>
                            <th className="px-4 py-3 font-medium text-right">Ср. Ур. Жизни</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(results as any[]).sort((a: any, b: any) => b.avgLifeLevel - a.avgLifeLevel).map((r: any) => (
                            <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-2.5 font-medium flex items-center gap-2 text-slate-800">{r.flag} {r.name}</td>
                              <td className="px-4 py-2.5 text-right font-mono text-blue-600 font-medium">{r.money}$</td>
                              <td className="px-4 py-2.5 text-right font-mono text-red-600 font-medium">{r.missiles}</td>
                              <td className="px-4 py-2.5 text-right font-mono text-green-600 font-medium">{r.avgLifeLevel}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="col-span-12 xl:col-span-4 space-y-6">
          <div className={`rounded-xl p-5 border shadow-sm transition-all ${gameState.adminCalls && gameState.adminCalls.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
            <h3 className={`font-bold uppercase mb-4 text-sm flex items-center gap-2 ${gameState.adminCalls && gameState.adminCalls.length > 0 ? 'text-red-800' : 'text-slate-500'}`}>
              <Bell className="w-5 h-5" /> Вызовы судьи ООН
              {gameState.adminCalls && gameState.adminCalls.length > 0 && (
                <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full ml-auto">{gameState.adminCalls.length}</span>
              )}
            </h3>
            {gameState.adminCalls && gameState.adminCalls.length > 0 ? (
              <div className="space-y-3">
                {gameState.adminCalls.map(countryId => {
                  const country = gameState.countries[countryId];
                  return (
                    <div key={countryId} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-red-100">
                      <div className="text-sm font-bold flex items-center gap-2 text-slate-800">
                        <span className="text-2xl drop-shadow-sm">{country?.flag}</span>
                        <span>{country?.name}</span>
                      </div>
                      <button
                        onClick={() => socket.emit('dismissAdminCall', countryId)}
                        className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-md text-xs font-bold transition-colors"
                      >
                        Отменить
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-slate-400 italic flex items-center justify-center py-4 bg-slate-50 rounded-lg border border-slate-100 dashed">
                Нет активных вызовов
              </div>
            )}
          </div>

          <div className={`rounded-xl p-5 border shadow-sm transition-all ${gameState.negotiations && gameState.negotiations.length > 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
            <h3 className={`font-bold uppercase mb-4 text-sm flex items-center gap-2 ${gameState.negotiations && gameState.negotiations.length > 0 ? 'text-indigo-800' : 'text-slate-500'}`}>
              <MessageSquare className="w-5 h-5" /> Переговоры
              {gameState.negotiations && gameState.negotiations.length > 0 && (
                <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full ml-auto">{gameState.negotiations.length}</span>
              )}
            </h3>
            {gameState.negotiations && gameState.negotiations.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {gameState.negotiations.map(n => (
                  <div key={n.id} className={`p-4 rounded-xl shadow-sm border transition-all ${n.status === 'accepted' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-indigo-100'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide ${n.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {n.status === 'accepted' ? 'Идут переговоры' : 'Ожидание ответа'}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 bg-white/60 px-2 py-1 rounded-md border border-slate-100">
                        <Users className="w-3 h-3" /> {n.playerName}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-4 bg-white/50 p-2 rounded-lg border border-slate-100">
                      <div className="flex flex-col items-center flex-1">
                        <span className="text-2xl mb-1 drop-shadow-sm">{gameState.countries[n.fromCountryId]?.flag}</span>
                        <span className="text-[10px] font-bold text-slate-700 text-center uppercase tracking-wider">{gameState.countries[n.fromCountryId]?.name}</span>
                      </div>

                      <div className="flex flex-col items-center justify-center px-2">
                        {n.status === 'accepted' ? (
                          <div className="flex items-center gap-1 text-emerald-500">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        ) : (
                          <div className="text-indigo-300 animate-pulse">
                            <Send className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-center flex-1">
                        <span className="text-2xl mb-1 drop-shadow-sm">{gameState.countries[n.toCountryId]?.flag}</span>
                        <span className="text-[10px] font-bold text-slate-700 text-center uppercase tracking-wider">{gameState.countries[n.toCountryId]?.name}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {n.status === 'requested' ? (
                        <>
                          <button
                            onClick={() => socket.emit('acceptNegotiation', n.id)}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
                          >
                            Одобрить
                          </button>
                          <button
                            onClick={() => socket.emit('cancelNegotiation', n.id)}
                            className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-lg text-xs font-bold transition-colors border border-red-100"
                          >
                            Отклонить
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => socket.emit('cancelNegotiation', n.id)}
                          className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
                        >
                          Завершить переговоры
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400 italic flex items-center justify-center py-8 bg-white/50 rounded-xl border border-slate-200 border-dashed">
                Нет активных переговоров
              </div>
            )}
          </div>

          <div className="bg-slate-900 rounded-xl flex flex-col shadow-lg border border-slate-800 overflow-hidden" style={{ height: '500px' }}>
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-green-400" />
              <h3 className="text-sm font-bold uppercase text-slate-300 tracking-wider">Журнал событий</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5 text-xs font-mono custom-scrollbar">
              {gameState.logs.length === 0 ? (
                <div className="text-slate-600 italic flex items-center justify-center h-full">Событий пока нет...</div>
              ) : (
                gameState.logs.map((log, i) => (
                  <div key={i} className={`p-2 rounded-md ${log.includes('ВНИМАНИЕ') ? 'bg-red-950/50 text-red-400 border-l-2 border-red-500' : log.includes('---') ? 'text-blue-400 font-bold mt-4 mb-2' : 'text-slate-300 hover:bg-slate-800/50'}`}>
                    <span className="opacity-50 mr-2 text-[10px]">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
