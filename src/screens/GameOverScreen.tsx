import type { Socket } from 'socket.io-client';
import { motion } from 'framer-motion';
import { Crown, Crosshair, DollarSign, Leaf, LogOut, History } from 'lucide-react';
import type { Country, GameState } from '../shared/types';

type Props = {
  socket: Socket;
  gameState: GameState;
  isAdmin: boolean;
  isSpectatorMode: boolean;
  onExitSpectator: () => void;
};

export function GameOverScreen({ socket, gameState, isAdmin, isSpectatorMode, onExitSpectator }: Props) {
  const activeCountries = (Object.values(gameState.countries) as Country[]).filter(c => c.isActive !== false);

  const getAvg = (c: Country) =>
    Math.round(c.regions.reduce((sum, r) => sum + Math.floor(r.lifeLevel * (gameState.ecology / 100)), 0) / c.regions.length);

  let bestLifeLevelCountry = activeCountries[0];
  let mostWarlikeCountry = activeCountries[0];
  let baronCountry = activeCountries[0];
  let greenpeaceCountry = activeCountries[0];

  activeCountries.forEach(c => {
    if (getAvg(c) > getAvg(bestLifeLevelCountry)) bestLifeLevelCountry = c;
    if ((c.stats?.missilesLaunched ?? 0) > (mostWarlikeCountry.stats?.missilesLaunched ?? 0)) mostWarlikeCountry = c;
    if ((c.stats?.totalIncome ?? 0) > (baronCountry.stats?.totalIncome ?? 0)) baronCountry = c;
    if ((c.stats?.ecologyInvestments ?? 0) > (greenpeaceCountry.stats?.ecologyInvestments ?? 0)) greenpeaceCountry = c;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden"
    >
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-500/20 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
        className="max-w-7xl w-full bg-white/5 backdrop-blur-xl border border-white/10 text-slate-100 rounded-3xl p-6 md:p-12 shadow-2xl relative z-10"
      >
        <motion.h1
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
          className="text-5xl md:text-6xl font-black text-center mb-12 uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 drop-shadow-sm"
        >
          ИГРА ОКОНЧЕНА
        </motion.h1>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring' }}
          className="bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 p-8 md:p-12 rounded-3xl shadow-[0_0_50px_rgba(251,191,36,0.3)] text-white text-center mb-16 relative overflow-hidden border border-yellow-300/50"
        >
          <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
            <Crown className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-6 text-yellow-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-[0.2em] mb-4 text-yellow-100 opacity-90">Абсолютный Победитель</h2>
          <div className="text-8xl md:text-9xl mb-6 drop-shadow-2xl">{bestLifeLevelCountry.flag}</div>
          <div className="text-5xl md:text-7xl font-black drop-shadow-lg tracking-tight mb-6">{bestLifeLevelCountry.name}</div>
          <div className="text-xl md:text-3xl font-bold mt-4 text-yellow-50 bg-black/30 backdrop-blur-md inline-block px-8 py-4 rounded-2xl border border-white/20 shadow-inner">
            Средний ур. жизни: <span className="text-white">{getAvg(bestLifeLevelCountry)}%</span>
          </div>
        </motion.div>

        <h3 className="text-3xl font-black text-center mb-8 uppercase tracking-widest text-slate-200">Особые достижения</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <motion.div whileHover={{ y: -5, scale: 1.02 }} className="bg-gradient-to-br from-red-500/10 to-red-900/20 p-8 rounded-2xl border border-red-500/30 flex flex-col items-center text-center shadow-lg backdrop-blur-sm">
            <div className="bg-red-500/20 p-4 rounded-full mb-6"><Crosshair className="w-10 h-10 text-red-400" /></div>
            <h3 className="text-lg font-bold uppercase tracking-wider text-red-300 mb-4">Самая воинственная</h3>
            <div className="text-5xl mb-3 drop-shadow-md">{mostWarlikeCountry.flag}</div>
            <div className="text-2xl font-black mt-2 text-white">{mostWarlikeCountry.name}</div>
            <div className="text-red-400 font-bold mt-3 text-lg bg-red-500/10 px-4 py-1 rounded-full">{mostWarlikeCountry.stats?.missilesLaunched ?? 0} ракет запущено</div>
          </motion.div>

          <motion.div whileHover={{ y: -5, scale: 1.02 }} className="bg-gradient-to-br from-blue-500/10 to-blue-900/20 p-8 rounded-2xl border border-blue-500/30 flex flex-col items-center text-center shadow-lg backdrop-blur-sm">
            <div className="bg-blue-500/20 p-4 rounded-full mb-6"><DollarSign className="w-10 h-10 text-blue-400" /></div>
            <h3 className="text-lg font-bold uppercase tracking-wider text-blue-300 mb-4">Страна-барон</h3>
            <div className="text-5xl mb-3 drop-shadow-md">{baronCountry.flag}</div>
            <div className="text-2xl font-black mt-2 text-white">{baronCountry.name}</div>
            <div className="text-blue-400 font-bold mt-3 text-lg bg-blue-500/10 px-4 py-1 rounded-full">{baronCountry.stats?.totalIncome ?? 0}$ заработано</div>
          </motion.div>

          <motion.div whileHover={{ y: -5, scale: 1.02 }} className="bg-gradient-to-br from-emerald-500/10 to-emerald-900/20 p-8 rounded-2xl border border-emerald-500/30 flex flex-col items-center text-center shadow-lg backdrop-blur-sm">
            <div className="bg-emerald-500/20 p-4 rounded-full mb-6"><Leaf className="w-10 h-10 text-emerald-400" /></div>
            <h3 className="text-lg font-bold uppercase tracking-wider text-emerald-300 mb-4">Инвестор Грин пис</h3>
            <div className="text-5xl mb-3 drop-shadow-md">{greenpeaceCountry.flag}</div>
            <div className="text-2xl font-black mt-2 text-white">{greenpeaceCountry.name}</div>
            <div className="text-emerald-400 font-bold mt-3 text-lg bg-emerald-500/10 px-4 py-1 rounded-full">{greenpeaceCountry.stats?.ecologyInvestments ?? 0} инвестиций</div>
          </motion.div>
        </div>

        {gameState.roundResults && Object.keys(gameState.roundResults).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mb-16">
            <h2 className="text-3xl font-black text-center mb-8 uppercase tracking-widest text-slate-200">История действий</h2>
            <div className="space-y-8">
              {Object.entries(gameState.roundResults).sort(([a], [b]) => Number(a) - Number(b)).map(([roundNum, results]) => (
                <div key={roundNum} className="bg-slate-900/50 rounded-2xl overflow-hidden shadow-xl border border-slate-700 backdrop-blur-md">
                  <div className="bg-slate-800/80 border-b border-slate-700 text-slate-200 py-4 px-6 font-black uppercase tracking-[0.2em] text-xl flex items-center gap-3">
                    <History className="w-6 h-6 text-blue-400" />
                    Раунд {roundNum}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-slate-700">
                        <tr>
                          <th className="px-6 py-4 font-bold tracking-wider">Страна</th>
                          <th className="px-6 py-4 font-bold tracking-wider">Развитие</th>
                          <th className="px-6 py-4 font-bold tracking-wider">Щиты</th>
                          <th className="px-6 py-4 font-bold tracking-wider">Ракеты</th>
                          <th className="px-6 py-4 font-bold tracking-wider">Ядерная прог.</th>
                          <th className="px-6 py-4 font-bold tracking-wider">Экология</th>
                          <th className="px-6 py-4 font-bold tracking-wider">Санкции</th>
                          <th className="px-6 py-4 font-bold tracking-wider">Переводы</th>
                          <th className="px-6 py-4 font-bold tracking-wider">Атаки</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {(results as any[]).map(r => {
                          const orders = r.orders;
                          if (!orders) return (
                            <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                              <td className="px-6 py-4 font-bold flex items-center gap-3 text-slate-200 text-base">
                                <span className="text-2xl">{r.flag}</span> {r.name}
                              </td>
                              <td colSpan={8} className="px-6 py-4 text-slate-500 italic text-center">Нет действий в этом раунде</td>
                            </tr>
                          );

                          const developed = Object.keys(orders.develop || {}).filter(k => orders.develop[k]).map((rId: string) => gameState.countries[r.id]?.regions.find(reg => reg.id === rId)?.name).join(', ') || '-';
                          const shields = Object.keys(orders.shields || {}).filter(k => orders.shields[k]).map((rId: string) => gameState.countries[r.id]?.regions.find(reg => reg.id === rId)?.name).join(', ') || '-';
                          const transfers = Object.entries(orders.transfers || {}).filter(([_, v]) => Number(v) > 0).map(([tId, v]) => `${gameState.countries[tId]?.flag} ${gameState.countries[tId]?.name}: ${v}$`).join(', ') || '-';
                          const sanction = Object.keys(orders.sanction || {}).filter(k => orders.sanction[k]).map(k => `${gameState.countries[k]?.flag} ${gameState.countries[k]?.name}`).join(', ') || '-';
                          const attacks = Object.keys(orders.bomb || {}).filter(k => orders.bomb[k]).map(k => {
                            const [tId, rId] = k.split('_');
                            return `${gameState.countries[tId]?.regions.find(reg => reg.id === rId)?.name} (${gameState.countries[tId]?.flag} ${gameState.countries[tId]?.name})`;
                          }).join(', ') || '-';

                          return (
                            <tr key={r.id} className="hover:bg-slate-800/50 transition-colors group">
                              <td className="px-6 py-4 font-bold flex items-center gap-3 text-slate-200 text-base">
                                <span className="text-2xl group-hover:scale-110 transition-transform">{r.flag}</span> {r.name}
                              </td>
                              <td className="px-6 py-4 text-blue-300 font-medium">{developed}</td>
                              <td className="px-6 py-4 text-cyan-300 font-medium">{shields}</td>
                              <td className="px-6 py-4 text-orange-300 font-medium">{orders.missiles > 0 ? `+${orders.missiles}` : '-'}</td>
                              <td className="px-6 py-4 text-purple-300 font-medium">{orders.researchNuclear ? 'Да' : '-'}</td>
                              <td className="px-6 py-4 text-emerald-300 font-medium">{orders.ecology ? 'Да' : '-'}</td>
                              <td className="px-6 py-4 text-red-400 font-medium">{sanction}</td>
                              <td className="px-6 py-4 text-yellow-300 font-medium">{transfers}</td>
                              <td className="px-6 py-4 text-red-500 font-bold">{attacks}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="text-center flex flex-col sm:flex-row items-center justify-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.reload()}
            className="bg-slate-800/80 backdrop-blur-md text-white px-8 py-4 rounded-xl font-bold text-xl hover:bg-slate-700 transition-colors shadow-lg border border-slate-600"
          >
            ВЕРНУТЬСЯ В ГЛАВНОЕ МЕНЮ
          </motion.button>
          {isAdmin && !isSpectatorMode && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => socket.emit('adminReset')}
              className="bg-red-600/80 backdrop-blur-md text-white px-8 py-4 rounded-xl font-bold text-xl hover:bg-red-500 transition-colors shadow-[0_0_20px_rgba(220,38,38,0.4)] border border-red-500/50"
            >
              СБРОСИТЬ ИГРУ
            </motion.button>
          )}
          {isAdmin && isSpectatorMode && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onExitSpectator}
              className="bg-indigo-600/80 backdrop-blur-md text-white px-8 py-4 rounded-xl font-bold text-xl hover:bg-indigo-500 transition-colors shadow-[0_0_20px_rgba(79,70,229,0.4)] border border-indigo-500/50 flex items-center gap-2"
            >
              ВЫЙТИ ИЗ РЕЖИМА ЗРИТЕЛЯ <LogOut className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
