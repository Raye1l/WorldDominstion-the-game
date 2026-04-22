import type { Socket } from 'socket.io-client';
import { Activity, AlertTriangle, Leaf, LogOut, Send, Shield, ShieldOff, Skull } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, Cell, CartesianGrid, LabelList, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import type { Country, GameState } from '../shared/types';
import { GameLogo } from '../components/GameLogo';
import { getCountryColor } from '../utils/countryColor';

type Props = {
  socket: Socket;
  gameState: GameState;
  myCountryId: string | null;
  isAdmin: boolean;
  isSpectatorMode: boolean;
  timeLeft: number | null;
  onLeaveCountry: () => void;
  onExitSpectator: () => void;
};

export function RoundEndScreen({
  socket,
  gameState,
  myCountryId,
  isAdmin,
  isSpectatorMode,
  timeLeft,
  onLeaveCountry,
  onExitSpectator,
}: Props) {
  const activeCountries = (Object.values(gameState.countries) as Country[]).filter(c => c.isActive !== false);

  const ecologyData = gameState.ecologyHistory.map((eco, index) => ({ round: index + 1, ecology: eco }));
  if (gameState.status !== 'round_end') {
    ecologyData.push({ round: gameState.round, ecology: gameState.ecology });
  }

  const lifeLevelData = activeCountries.map(c => {
    const avgLife = Math.round(c.regions.reduce((sum, r) => sum + Math.floor(r.lifeLevel * (gameState.ecology / 100)), 0) / c.regions.length);
    return { name: `${c.flag} ${c.name}`, lifeLevel: avgLife, fill: getCountryColor(c.color) };
  }).sort((a, b) => b.lifeLevel - a.lifeLevel);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 md:gap-6">
            {!isAdmin && (
              <button
                onClick={onLeaveCountry}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-3 rounded-xl transition-colors border border-slate-200"
                title="Выйти из страны и вернуться к выбору"
              >
                <LogOut className="w-6 h-6" />
              </button>
            )}
            <div className="flex items-center gap-4">
              <GameLogo size="md" className="text-slate-800 drop-shadow-none" />
              <div className="h-10 w-px bg-slate-200 mx-2"></div>
              <p className="text-slate-500 font-bold tracking-widest uppercase text-lg">
                {gameState.status === 'round_end' ? 'Итоги раунда' : 'Режим зрителя'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {timeLeft !== null && gameState.status === 'playing' && (
              <div className={`font-mono text-3xl font-bold px-6 py-2 rounded-xl shadow-inner ${timeLeft < 60 ? 'bg-red-500/20 text-red-600 animate-pulse border border-red-500/50' : 'bg-slate-800 text-green-400 border border-slate-700'}`}>
                {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{Math.floor(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            )}
            <div className="flex items-center gap-3 bg-slate-50 px-6 py-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-sm">Раунд</span>
              <span className="text-3xl font-black text-slate-800">
                {gameState.status === 'round_end' ? gameState.round - 1 : gameState.round}
              </span>
            </div>

            {isAdmin && !isSpectatorMode && gameState.status === 'round_end' && (
              <button
                onClick={() => socket.emit('adminNextRound')}
                className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center gap-2 shadow-sm"
              >
                СЛЕДУЮЩИЙ РАУНД <Send className="w-5 h-5" />
              </button>
            )}
            {isAdmin && isSpectatorMode && (
              <button
                onClick={onExitSpectator}
                className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center gap-2 shadow-sm"
              >
                ВЫЙТИ <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>

        <div className="flex flex-col xl:grid xl:grid-cols-12 gap-8">
          <div className="xl:col-span-5 space-y-4 max-h-[80vh] overflow-y-auto pr-4 custom-scrollbar-light">
            {activeCountries.map(c => (
              <div key={c.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 transition-transform hover:scale-[1.01]">
                <div className={`${c.color} text-center py-3 font-black uppercase tracking-widest text-lg flex items-center justify-center gap-2`}>
                  <span>{c.flag} {c.name}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 bg-white">
                  {c.regions.map(r => {
                    const bombingResults = gameState.bombingsLastRound?.filter(b => b.targetCountryId === c.id && b.regionId === r.id) || [];
                    const isCityHit = bombingResults.some(b => b.result === 'city_hit');
                    const isShieldDestroyed = bombingResults.some(b => b.result === 'shield_destroyed');
                    const canSeeShields = c.id === myCountryId || (isAdmin && !isSpectatorMode);
                    return (
                      <div key={r.id} className={`p-3 text-center relative flex flex-col items-center justify-center ${r.isDestroyed ? 'bg-slate-100 opacity-80' : isCityHit ? 'bg-red-50' : ''}`}>
                        {r.isDestroyed && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                            <Skull className="w-8 h-8 text-slate-400 opacity-80" />
                          </div>
                        )}
                        <div className="text-[10px] font-bold uppercase mb-1 truncate w-full text-slate-500 flex items-center justify-center gap-1" title={r.name}>
                          {canSeeShields && r.shield && !r.isDestroyed && (
                            <span title="Щит активен"><Shield className="w-3 h-3 text-slate-400" /></span>
                          )}
                          {canSeeShields && isShieldDestroyed && !r.isDestroyed && (
                            <span title="Щит уничтожен в этом раунде"><ShieldOff className="w-3 h-3 text-orange-500" /></span>
                          )}
                          <span className="truncate">{r.name}</span>
                        </div>
                        <div className={`text-2xl font-black ${r.isDestroyed ? 'text-slate-400 line-through' : isCityHit ? 'text-red-600' : 'text-slate-800'}`} title="Уровень жизни с учетом экологии">
                          {Math.floor(r.lifeLevel * (gameState.ecology / 100))}%
                        </div>
                        {isCityHit && !r.isDestroyed && <AlertTriangle className="w-4 h-4 text-red-500 absolute top-1 right-1 opacity-50" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="xl:col-span-7 flex flex-col gap-8">
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 flex-1 flex flex-col">
              <div className="bg-slate-50 border-b border-slate-200 text-slate-800 py-3 px-4 sm:px-6 font-bold uppercase tracking-widest flex flex-col sm:flex-row justify-between items-center gap-2 text-center sm:text-left">
                <div className="flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-emerald-600" />
                  <span>Уровень экологии в мире</span>
                </div>
                <div className="bg-white border border-slate-200 px-4 py-1 rounded-lg text-xl font-black text-emerald-600">
                  {gameState.ecology}%
                </div>
              </div>
              <div className="p-6 flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ecologyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEcology" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="round" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(val) => `Раунд ${val}`} />
                    <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                      formatter={(value: any) => typeof value === 'number' ? [`${value}%`, 'Экология'] : ['', 'Экология']}
                      labelFormatter={(label: any) => `Раунд ${label}`}
                    />
                    <Area type="monotone" dataKey="ecology" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEcology)" activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}>
                      <LabelList dataKey="ecology" position="top" fill="#0f172a" fontSize={12} fontWeight="bold" formatter={(val: any) => `${val}%`} />
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 flex-1 flex flex-col">
              <div className="bg-slate-50 border-b border-slate-200 text-slate-800 py-3 px-6 font-bold uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <span>Уровень жизни в государствах</span>
              </div>
              <div className="p-6 flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lifeLevelData} margin={{ top: 30, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} interval={0} angle={-45} textAnchor="end" height={100} />
                    <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                    <RechartsTooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value) => value !== undefined ? [`${value}%`, 'Уровень жизни'] : ['', 'Уровень жизни']}
                    />
                    <Bar dataKey="lifeLevel" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="lifeLevel" position="top" fill="#0f172a" fontSize={12} fontWeight="bold" formatter={(val: any) => `${val}%`} />
                      {lifeLevelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {isAdmin && !isSpectatorMode && gameState.lastRoundOrders && (
          <div className="mt-8 bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 text-slate-900">
            <div className="bg-slate-50 border-b border-slate-200 text-slate-800 text-center py-3 font-bold uppercase tracking-wider">
              Действия стран в раунде {gameState.round - 1} (Только для администратора)
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold">Страна</th>
                    <th className="px-4 py-3 font-bold">Развитие</th>
                    <th className="px-4 py-3 font-bold">Щиты</th>
                    <th className="px-4 py-3 font-bold">Ракеты</th>
                    <th className="px-4 py-3 font-bold">Ядерная прог.</th>
                    <th className="px-4 py-3 font-bold">Экология</th>
                    <th className="px-4 py-3 font-bold">Санкции</th>
                    <th className="px-4 py-3 font-bold">Переводы</th>
                    <th className="px-4 py-3 font-bold">Атаки</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCountries.map(c => {
                    const orders = gameState.lastRoundOrders[c.id];
                    if (!orders) return (
                      <tr key={c.id} className="border-b border-slate-100">
                        <td className="px-4 py-3 font-bold flex items-center gap-2 text-slate-700">{c.flag} {c.name}</td>
                        <td colSpan={8} className="px-4 py-3 text-slate-400 italic">Нет действий</td>
                      </tr>
                    );

                    const developed = Object.keys(orders.develop || {}).filter(k => orders.develop[k]).map(rId => c.regions.find(r => r.id === rId)?.name).join(', ') || '-';
                    const shields = Object.keys(orders.shields || {}).filter(k => orders.shields[k]).map(rId => c.regions.find(r => r.id === rId)?.name).join(', ') || '-';
                    const transfers = Object.entries(orders.transfers || {}).filter(([_, v]) => Number(v) > 0).map(([tId, v]) => `${gameState.countries[tId]?.flag} ${gameState.countries[tId]?.name}: ${v}$`).join(', ') || '-';
                    const sanction = Object.keys(orders.sanction || {}).filter(k => orders.sanction[k]).map(k => `${gameState.countries[k]?.flag} ${gameState.countries[k]?.name}`).join(', ') || '-';
                    const attacks = Object.keys(orders.bomb || {}).filter(k => orders.bomb[k]).map(k => {
                      const [tId, rId] = k.split('_');
                      return `${gameState.countries[tId]?.regions.find(r => r.id === rId)?.name} (${gameState.countries[tId]?.flag} ${gameState.countries[tId]?.name})`;
                    }).join(', ') || '-';

                    return (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-bold flex items-center gap-2 text-slate-800">{c.flag} {c.name}</td>
                        <td className="px-4 py-3 text-slate-600">{developed}</td>
                        <td className="px-4 py-3 text-slate-600">{shields}</td>
                        <td className="px-4 py-3 text-slate-600">{orders.missiles > 0 ? `+${orders.missiles}` : '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{orders.researchNuclear ? 'Да' : '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{orders.ecology ? 'Да' : '-'}</td>
                        <td className="px-4 py-3 text-red-600">{sanction}</td>
                        <td className="px-4 py-3 text-slate-600">{transfers}</td>
                        <td className="px-4 py-3 text-red-600 font-bold">{attacks}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.5); }
        .custom-scrollbar-light::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar-light::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.05); border-radius: 4px; }
        .custom-scrollbar-light::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.15); border-radius: 4px; }
        .custom-scrollbar-light::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.25); }
      `}} />
    </div>
  );
}
