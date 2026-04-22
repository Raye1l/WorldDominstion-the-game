import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, Ban, Bell, Crosshair, DollarSign, Flame, Globe, Leaf,
  LogOut, MessageSquare, Rocket, Send, Shield, ShieldOff, Skull, Target, TrendingUp, Zap,
} from 'lucide-react';
import type { Country, GameState } from '../shared/types';
import { GAME_CONFIG } from '../shared/constants';
import { GameLogo } from '../components/GameLogo';

type OrdersState = {
  develop: Record<string, boolean>;
  shields: Record<string, boolean>;
  missiles: number;
  researchNuclear: boolean;
  ecology: boolean;
  transfers: Record<string, string>;
  bomb: Record<string, boolean>;
  sanction: Record<string, boolean>;
};

const emptyOrders = (): OrdersState => ({
  develop: {},
  shields: {},
  missiles: 0,
  researchNuclear: false,
  ecology: false,
  transfers: {},
  bomb: {},
  sanction: {},
});

type Notification = { id: string; message: string };

type Props = {
  socket: Socket;
  gameState: GameState;
  myCountryId: string;
  timeLeft: number | null;
  notifications: Notification[];
  onLeaveCountry: () => void;
};

export function DashboardScreen({
  socket,
  gameState,
  myCountryId,
  timeLeft,
  notifications,
  onLeaveCountry,
}: Props) {
  const [orders, setOrders] = useState<OrdersState>(emptyOrders);
  const [transferInputs, setTransferInputs] = useState<Record<string, string>>({});
  const [negotiationTargetId, setNegotiationTargetId] = useState<string | null>(null);
  const [negotiationPlayerName, setNegotiationPlayerName] = useState('');

  useEffect(() => {
    if (gameState.round) setOrders(emptyOrders());
  }, [gameState.round]);

  const myCountry = gameState.countries[myCountryId];
  const otherCountries = (Object.values(gameState.countries) as Country[])
    .filter(c => c.id !== myCountryId && c.isActive !== false);

  const developCost = Object.values(orders.develop).filter(Boolean).length * GAME_CONFIG.DEVELOP_COST;
  const shieldsCost = Object.values(orders.shields).filter(Boolean).length * GAME_CONFIG.SHIELD_COST;
  const missilesCost = orders.missiles * GAME_CONFIG.MISSILE_COST;
  const nuclearCost = orders.researchNuclear ? GAME_CONFIG.NUCLEAR_RESEARCH_COST : 0;
  const ecologyCost = orders.ecology ? GAME_CONFIG.ECOLOGY_COST : 0;

  const sentTransfers = gameState.orders[myCountryId]?.transfers ?? {};
  const transfersCost = Object.values(sentTransfers).reduce<number>(
    (sum, val) => sum + (Number(val) || 0),
    0
  );

  const totalExpenses = developCost + shieldsCost + missilesCost + nuclearCost + ecologyCost;
  const remainingBudget = myCountry ? myCountry.money - totalExpenses : 0;

  const baseIncome = myCountry ? myCountry.regions.reduce((sum, r) => sum + r.income, 0) : 0;
  const sanctionsCount = myCountry?.sanctionedBy?.length ?? 0;
  const totalIncome = Math.floor(baseIncome * Math.max(0, 1 - GAME_CONFIG.SANCTION_PENALTY * sanctionsCount));

  const avgLifeLevel = myCountry
    ? Math.round(myCountry.regions.reduce((sum, r) => sum + Math.floor(r.lifeLevel * (gameState.ecology / 100)), 0) / 4)
    : 0;

  const activeBombOrdersCount = Object.values(orders.bomb ?? {}).filter(Boolean).length;
  const availableMissiles = myCountry?.missiles ?? 0;
  const canSelectMoreMissiles = activeBombOrdersCount < availableMissiles;

  const handleOrderChange = (category: keyof OrdersState, key: string, value: boolean) => {
    setOrders(prev => ({
      ...prev,
      [category]: { ...(prev[category] as Record<string, boolean>), [key]: value },
    }));
  };

  const handleTransferChange = (targetId: string, value: string) => {
    setTransferInputs(prev => ({ ...prev, [targetId]: value }));
  };

  const handleTransferSubmit = (targetId: string) => {
    const amount = Math.floor(Number(transferInputs[targetId]));
    if (amount > 0 && myCountry && remainingBudget >= amount) {
      socket.emit('transferMoney', myCountry.id, targetId, amount);
      setTransferInputs(prev => ({ ...prev, [targetId]: '' }));
    }
  };

  const submitTurn = () => {
    if (!myCountryId || remainingBudget < 0) return;
    socket.emit('submitTurn', { countryId: myCountryId, orders });
  };

  // transfersCost is computed above but only shown in the "sent transfers" list rows.
  // Keeping the variable avoids TS "unused" but we still use its components via sentTransfers.
  void transfersCost;

  return (
    <div className="min-h-screen bg-[#12231E] text-slate-900 font-sans p-4">
      <header className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 mb-4 text-white">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onLeaveCountry}
            className="bg-slate-800 hover:bg-red-600 text-white p-3 rounded-xl transition-colors md:mr-2 shadow-lg"
            title="Выйти из страны и вернуться к выбору"
          >
            <LogOut className="w-6 h-6" />
          </button>
          <GameLogo size="md" />
          <div className="bg-white text-slate-900 font-bold text-xl md:text-2xl px-4 py-1 rounded flex items-center gap-2 md:ml-8" title="Текущий раунд игры. В конце каждого раунда начисляются доходы и применяются действия.">
            <span className="bg-slate-900 text-white px-2 py-0.5 rounded">{gameState.round}</span> РАУНД
          </div>
          {timeLeft !== null && (
            <div className={`font-mono text-2xl md:text-3xl font-bold md:ml-4 px-4 py-1 rounded shadow-lg transition-colors ${timeLeft < 60 ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-green-400'}`}>
              {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{Math.floor(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          )}

          {myCountryId && (
            <button
              onClick={() => socket.emit('callAdmin', myCountryId)}
              disabled={gameState.adminCalls?.includes(myCountryId)}
              className={`md:ml-6 flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all shadow-lg ${gameState.adminCalls?.includes(myCountryId)
                  ? 'bg-yellow-500 text-white cursor-not-allowed animate-pulse'
                  : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              title="Позвать судью ООН"
            >
              <Bell className="w-5 h-5" />
              <span className="hidden sm:inline">{gameState.adminCalls?.includes(myCountryId) ? 'ОЖИДАНИЕ СУДЬИ...' : 'ПОЗВАТЬ СУДЬЮ ООН'}</span>
            </button>
          )}
        </div>
        <button
          onClick={submitTurn}
          disabled={myCountry?.isReady || remainingBudget < 0 || gameState.status !== 'playing'}
          className={`font-bold text-lg md:text-xl px-8 py-3 w-full md:w-auto rounded transition-all duration-300 ${myCountry?.isReady
              ? 'bg-gray-500 text-white cursor-not-allowed'
              : remainingBudget < 0
                ? 'bg-red-500 text-white cursor-not-allowed opacity-50'
                : 'bg-white text-slate-900 hover:bg-green-400 hover:text-white hover:scale-105 shadow-[0_0_15px_rgba(255,255,255,0.5)]'
            }`}
          title={remainingBudget < 0 ? 'Недостаточно средств для завершения хода!' : 'Подтвердить выбранные действия и завершить ход'}
        >
          {myCountry?.isReady ? 'ОЖИДАНИЕ...' : 'ПРИНЯТЬ'}
        </button>
      </header>

      <main className="max-w-[1600px] mx-auto grid grid-cols-12 gap-6 p-4 md:p-6">
        <div className="col-span-12 xl:col-span-8 bg-white rounded-xl p-4 sm:p-6 shadow-2xl">
          {myCountry?.sanctionedBy && myCountry.sanctionedBy.length > 0 && (
            <div className="bg-red-600 text-white p-4 rounded-xl mb-6 shadow-lg flex items-center gap-4 animate-pulse">
              <AlertTriangle className="w-8 h-8" />
              <div>
                <h3 className="font-bold text-lg">ВНИМАНИЕ: САНКЦИИ!</h3>
                <p>На вашу страну наложены санкции от: {myCountry.sanctionedBy.map(id => `${gameState.countries[id]?.flag} ${gameState.countries[id]?.name}`).join(', ')}. Ваш доход в этом раунде снижен на {myCountry.sanctionedBy.length * 10}%.</p>
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 border-b-2 border-gray-100 pb-4 gap-4">
            <h2 className="text-3xl sm:text-4xl font-black tracking-wider uppercase flex items-center gap-3">{myCountry?.flag} {myCountry?.name}</h2>
            <div className="flex gap-6 sm:gap-12 text-right">
              <div title="Средний уровень жизни по всем вашим регионам. Чем выше, тем больше доход.">
                <div className="text-xs font-bold text-gray-500 uppercase leading-tight">Средний уровень<br />жизни в Стране:</div>
                <div className="text-3xl font-bold text-teal-600">{avgLifeLevel}%</div>
              </div>
              <div title="Ваши деньги. Используются для развития, щитов, ракет и экологии.">
                <div className="text-xs font-bold text-gray-500 uppercase leading-tight">Доступный<br />бюджет:</div>
                <div className={`text-4xl font-black transition-colors duration-300 ${remainingBudget < 0 ? 'text-red-500 animate-pulse' : 'text-blue-500'}`}>{remainingBudget}$</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {myCountry?.regions.map(r => {
              const isDeveloping = orders.develop[r.id];
              const isShielding = orders.shields[r.id];
              const projectedDevelopment = isDeveloping ? r.development + 20 : r.development;
              const projectedLifeLevel = isDeveloping ? r.lifeLevel + 5 : r.lifeLevel;
              const effectiveLifeLevel = Math.floor(r.lifeLevel * (gameState.ecology / 100));
              const projectedEffectiveLifeLevel = Math.floor(projectedLifeLevel * (gameState.ecology / 100));
              const projectedIncome = isDeveloping
                ? Math.floor(GAME_CONFIG.REGION_INCOME_BASE * (projectedDevelopment / 100) * (projectedEffectiveLifeLevel / 100))
                : r.income;
              const bombingResults = gameState.bombingsLastRound?.filter(b => b.targetCountryId === myCountry?.id && b.regionId === r.id) || [];
              const isCityHit = bombingResults.some(b => b.result === 'city_hit');
              const isShieldDestroyed = bombingResults.some(b => b.result === 'shield_destroyed');

              return (
                <div key={r.id} className={`flex flex-col transition-all duration-300 rounded-lg p-2 ${r.isDestroyed ? 'bg-red-50 opacity-80 grayscale' : isDeveloping || isShielding ? 'bg-blue-50 ring-2 ring-blue-200' : ''}`}>
                  <div className="h-24 rounded-t-lg mb-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${r.imageUrl}')` }}></div>
                    {r.isDestroyed && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/70 pointer-events-none z-10 backdrop-blur-[1px]">
                        <Skull className="w-10 h-10 text-red-500 mb-1 drop-shadow-lg" />
                        <span className="text-red-500 font-black text-xs tracking-widest drop-shadow-md uppercase">Уничтожен</span>
                      </div>
                    )}
                    {isShielding && !r.isDestroyed && <div className="absolute inset-0 bg-blue-500/20 animate-pulse"></div>}
                    {isCityHit && !r.isDestroyed && (
                      <div className="absolute inset-0 bg-red-600/50 animate-pulse flex flex-col items-center justify-center z-10">
                        <Flame className="w-8 h-8 text-orange-400 drop-shadow-lg" />
                        <span className="text-white font-bold text-xs mt-1 drop-shadow-md">ПОПАДАНИЕ</span>
                      </div>
                    )}
                    {isShieldDestroyed && !isCityHit && !r.isDestroyed && (
                      <div className="absolute inset-0 bg-orange-500/40 flex flex-col items-center justify-center z-10">
                        <ShieldOff className="w-8 h-8 text-orange-200 drop-shadow-lg" />
                        <span className="text-white font-bold text-xs mt-1 drop-shadow-md">ЩИТ ПРОБИТ</span>
                      </div>
                    )}
                  </div>
                  <h3 className={`text-center font-bold uppercase mb-3 text-sm flex items-center justify-center gap-1 ${r.isDestroyed ? 'text-red-700 line-through' : isCityHit ? 'text-red-600' : ''}`}>
                    {(r.shield || isShielding) && !r.isDestroyed && (
                      <span title="Регион защищен щитом" className="inline-flex">
                        <Shield className={`w-4 h-4 ${isShielding ? 'text-blue-400 animate-bounce' : 'text-blue-600'}`} />
                      </span>
                    )}
                    {r.name}
                  </h3>

                  <div className="space-y-1 text-xs mb-4 border-b border-gray-200 pb-3">
                    <div className="flex justify-between" title="Уровень развития региона. Влияет на максимальный уровень жизни.">
                      <span className="text-gray-500">Развитие</span>
                      <span className="font-bold">
                        {r.isDestroyed ? <span className="text-red-600">0%</span> : isDeveloping ? <span className="text-green-600">{r.development}% → {projectedDevelopment}%</span> : `${r.development}%`}
                      </span>
                    </div>
                    <div className="flex justify-between" title="Уровень жизни с учетом экологии. Определяет процент получаемого дохода.">
                      <span className="text-gray-500">Ур. жизни</span>
                      <span className="font-bold">
                        {r.isDestroyed ? <span className="text-red-600">0%</span> : isDeveloping ? <span className="text-green-600">{effectiveLifeLevel}% → {projectedEffectiveLifeLevel}%</span> : `${effectiveLifeLevel}%`}
                      </span>
                    </div>
                    <div className="flex justify-between" title="Доход региона за раунд (до санкций).">
                      <span className="text-gray-500">Доход</span>
                      <span className="font-bold">
                        {r.isDestroyed ? <span className="text-red-600">0$</span> : isDeveloping ? <span className="text-green-600">{r.income}$ → {projectedIncome}$</span> : `${r.income}$`}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <button
                      onClick={() => handleOrderChange('develop', r.id, !isDeveloping)}
                      disabled={myCountry.isReady || r.isDestroyed}
                      className={`w-full py-1.5 rounded flex items-center justify-center gap-1.5 font-bold transition-all ${r.isDestroyed ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : isDeveloping ? 'bg-teal-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-teal-50 hover:text-teal-600'}`}
                      title="Повышает развитие на 20%, уровень жизни на 5% и увеличивает базовый доход."
                    >
                      <TrendingUp size={14} /> {r.isDestroyed ? 'УНИЧТОЖЕНО' : isDeveloping ? 'ИНВЕСТИРОВАНО' : `РАЗВИТИЕ (-${GAME_CONFIG.DEVELOP_COST}$)`}
                    </button>
                    <button
                      onClick={() => handleOrderChange('shields', r.id, !isShielding)}
                      disabled={myCountry.isReady || r.shield || r.isDestroyed}
                      className={`w-full py-1.5 rounded flex items-center justify-center gap-1.5 font-bold transition-all ${r.isDestroyed ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : r.shield ? 'bg-blue-100 text-blue-400 cursor-not-allowed' : isShielding ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'}`}
                      title="Защищает регион от одной ядерной атаки. Щит одноразовый."
                    >
                      <Shield size={14} /> {r.isDestroyed ? 'УНИЧТОЖЕНО' : r.shield ? 'ЩИТ АКТИВЕН' : isShielding ? 'ЩИТ СТРОИТСЯ' : `ЩИТ (-${GAME_CONFIG.SHIELD_COST}$)`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className={`rounded-xl p-5 transition-colors duration-300 ${orders.researchNuclear || orders.missiles > 0 ? 'bg-orange-50 ring-2 ring-orange-200' : 'bg-gray-100'}`}>
              <h3 className="font-bold uppercase mb-4 text-sm flex items-center gap-2" title="Ядерное оружие позволяет уничтожать регионы противника.">
                <Rocket className="w-4 h-4 text-orange-500" />
                Ядерная программа
              </h3>
              {!myCountry?.hasNuclearTech ? (
                <div className="mb-6">
                  <button
                    onClick={() => setOrders(p => ({ ...p, researchNuclear: !p.researchNuclear }))}
                    disabled={myCountry?.isReady}
                    className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all ${orders.researchNuclear ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-white border-2 border-orange-200 text-orange-600 hover:bg-orange-50'}`}
                    title="Открывает возможность строить ядерные ракеты."
                  >
                    <Zap size={18} /> {orders.researchNuclear ? 'ИССЛЕДОВАНИЕ ЗАПУЩЕНО' : `ИССЛЕДОВАТЬ ТЕХНОЛОГИИ (-${GAME_CONFIG.NUCLEAR_RESEARCH_COST}$)`}
                  </button>
                  <div className="text-xs text-red-500 mt-2 font-medium text-center">Снижает экологию планеты на {GAME_CONFIG.ECOLOGY_DAMAGE_PER_RESEARCH}%</div>
                </div>
              ) : (
                <div className="mb-6" title="Построить ракеты. Они будут доступны для запуска в следующем раунде.">
                  <div className="text-xs text-gray-500 font-bold mb-2 uppercase">Производство ракет:</div>
                  <div className="flex bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                    {[0, 1, 2, 3].map(num => (
                      <button
                        key={num}
                        onClick={() => setOrders(p => ({ ...p, missiles: num }))}
                        disabled={myCountry?.isReady}
                        className={`flex-1 py-2 text-sm font-bold transition-colors ${orders.missiles === num ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-orange-50'} disabled:opacity-50 disabled:cursor-not-allowed border-r last:border-r-0 border-gray-200`}
                      >
                        {num} шт.
                      </button>
                    ))}
                  </div>
                  {orders.missiles > 0 && <div className="text-xs text-red-500 mt-2 font-bold text-center">Стоимость: -{orders.missiles * GAME_CONFIG.MISSILE_COST}$</div>}
                </div>
              )}
              <div className="bg-slate-800 text-white rounded p-3 flex justify-between items-center font-bold text-sm shadow-inner" title="Количество ракет, готовых к запуску.">
                <span className="flex items-center gap-2"><Rocket className="w-4 h-4 text-orange-400" /> АРСЕНАЛ:</span>
                <span className="text-orange-400 text-lg">{availableMissiles - activeBombOrdersCount} ШТ.</span>
              </div>
              {myCountry?.hasNuclearTech && (
                <div className="text-xs text-red-500 mt-2 font-medium text-center">Каждая запущенная ракета снижает экологию на {GAME_CONFIG.ECOLOGY_DAMAGE_PER_BOMB}%</div>
              )}
            </div>

            <div className={`rounded-xl p-5 flex flex-col justify-between transition-colors duration-300 ${orders.ecology ? 'bg-green-50 ring-2 ring-green-200' : 'bg-gray-100'}`}>
              <h3 className="font-bold uppercase mb-4 text-sm flex items-center gap-2" title="Общий уровень экологии на планете.">
                <Globe className="w-4 h-4 text-green-600" />
                Экология планеты
              </h3>
              <button
                onClick={() => setOrders(p => ({ ...p, ecology: !p.ecology }))}
                disabled={myCountry?.isReady}
                className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all mb-6 ${orders.ecology ? 'bg-green-600 text-white shadow-lg shadow-green-600/30' : 'bg-white border-2 border-green-200 text-green-700 hover:bg-green-50'}`}
                title="Повышает мировую экологию на 10%."
              >
                <Leaf size={18} /> {orders.ecology ? 'ПРОГРАММА ЗАПУЩЕНА' : `УЛУЧШИТЬ ЭКОЛОГИЮ (-${GAME_CONFIG.ECOLOGY_COST}$)`}
              </button>
              <div className="bg-green-700 text-white rounded p-3 flex justify-between items-center font-bold text-sm shadow-inner" title="Текущий уровень экологии.">
                <span className="text-2xl flex items-center gap-2">
                  {gameState.ecology}%
                  {orders.ecology && <span className="text-sm text-green-300 animate-pulse">+{GAME_CONFIG.ECOLOGY_BONUS_INVESTMENT}%</span>}
                </span>
                <span className="text-xs uppercase opacity-80">Уровень экологии</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-gray-100 rounded-xl p-5">
              <h3 className="font-bold uppercase mb-4 text-sm text-center">Санкции</h3>
              <div className="text-xs text-gray-500 mb-4">Снижает доход выбранной страны на 10% в следующем раунде. Можно выбрать несколько стран.</div>
              <div className="text-xs font-bold mb-2">На кого наложить:</div>
              <div className="grid grid-cols-2 gap-2">
                {otherCountries.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setOrders(p => ({ ...p, sanction: { ...p.sanction, [c.id]: !p.sanction[c.id] } }))}
                    disabled={myCountry?.isReady}
                    className={`p-2 rounded flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${orders.sanction[c.id] ? 'bg-red-100 text-red-700 border border-red-300 shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                  >
                    <Ban size={14} className={orders.sanction[c.id] ? 'text-red-600' : 'text-gray-400'} /> {c.flag} {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-100 rounded-xl p-5" title="Перевод денег другим странам.">
              <h3 className="font-bold uppercase mb-4 text-sm text-center flex items-center justify-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                Денежный перевод
              </h3>
              <div className="space-y-2">
                {otherCountries.map(c => {
                  const inputAmount = Number(transferInputs[c.id] || 0);
                  const sentAmount = Number(gameState.orders[myCountryId]?.transfers?.[c.id] || 0);

                  return (
                    <div key={c.id} className={`flex justify-between items-center text-xs p-1 rounded transition-colors ${inputAmount > 0 ? 'bg-green-100' : ''}`}>
                      <div className="flex flex-col">
                        <span className={inputAmount > 0 ? 'font-bold text-green-800' : ''}>{c.flag} {c.name}</span>
                        {sentAmount > 0 && <span className="text-[10px] text-gray-500">Отправлено: {sentAmount}$</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        {inputAmount > 0 && <span className="text-red-500 font-bold">-{inputAmount}$</span>}
                        <input
                          type="number"
                          min="0"
                          value={transferInputs[c.id] || ''}
                          onChange={e => handleTransferChange(c.id, e.target.value)}
                          disabled={myCountry?.isReady}
                          className="w-16 p-1 text-center border rounded focus:ring-2 focus:ring-green-500 outline-none"
                          placeholder="0"
                        />
                        <button
                          onClick={() => handleTransferSubmit(c.id)}
                          disabled={myCountry?.isReady || inputAmount <= 0 || remainingBudget < inputAmount}
                          className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          title="Отправить перевод"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-100 rounded-xl p-5">
              <h3 className="font-bold uppercase mb-4 text-sm text-center">Отданные приказы</h3>

              <div className="text-xs space-y-1 mb-4">
                <div className="font-bold text-red-600 mb-1">ВАШИ РАСХОДЫ</div>
                {developCost > 0 && <div className="flex justify-between text-gray-600"><span>Развитие</span><span>{developCost} $</span></div>}
                {shieldsCost > 0 && <div className="flex justify-between text-gray-600"><span>Щиты</span><span>{shieldsCost} $</span></div>}
                {missilesCost > 0 && <div className="flex justify-between text-gray-600"><span>Постройка ракет</span><span>{missilesCost} $</span></div>}
                {nuclearCost > 0 && <div className="flex justify-between text-gray-600"><span>Ядерные исследования</span><span>{nuclearCost} $</span></div>}
                {ecologyCost > 0 && <div className="flex justify-between text-gray-600"><span>Улучшение экологии</span><span>{ecologyCost} $</span></div>}
                {Object.entries(sentTransfers).map(([targetId, amount]) => {
                  if (Number(amount) <= 0) return null;
                  const targetCountry = gameState.countries[targetId];
                  const targetName = targetCountry ? `${targetCountry.flag} ${targetCountry.name}` : 'Неизвестно';
                  return (
                    <div key={targetId} className="flex justify-between text-gray-600">
                      <span>Перевод: {targetName}</span>
                      <span>{Number(amount)} $</span>
                    </div>
                  );
                })}
                <div className="flex justify-between font-bold text-red-600 pt-1 border-t border-gray-300 mt-1">
                  <span>Остаток средств</span><span>{remainingBudget} $</span>
                </div>
              </div>

              <div className="text-xs space-y-1">
                <div className="font-bold text-green-600 mb-1">ВАШИ ДОХОДЫ</div>
                <div className="flex justify-between text-gray-600"><span>Метрополии</span><span>{totalIncome} $</span></div>
                <div className="flex justify-between font-bold text-green-600 pt-1 border-t border-gray-300 mt-1">
                  <span>Итого</span><span>{totalIncome} $</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-4 space-y-4">
          {otherCountries.map(c => {
            const avgLife = Math.round(c.regions.reduce((sum, r) => sum + Math.floor(r.lifeLevel * (gameState.ecology / 100)), 0) / 4);
            const myNegotiation = gameState.negotiations?.find(n =>
              (n.fromCountryId === myCountryId && n.toCountryId === c.id) ||
              (n.fromCountryId === c.id && n.toCountryId === myCountryId)
            );

            const alreadyNegotiatedThisRound = !myNegotiation && myCountry?.negotiatedWith?.includes(c.id);

            return (
              <div key={c.id} className="bg-white rounded-xl overflow-hidden shadow-lg transition-all duration-300">
                <div className={`${c.color} px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <span className="font-bold uppercase tracking-wider flex items-center gap-2">{c.flag} {c.name}</span>
                    {myCountryId && (
                      <button
                        onClick={() => {
                          if (!myNegotiation) {
                            setNegotiationTargetId(c.id);
                            setNegotiationPlayerName('');
                          } else if (myNegotiation.status === 'requested') {
                            if (myNegotiation.fromCountryId === myCountryId) {
                              socket.emit('cancelNegotiation', myNegotiation.id);
                            } else {
                              socket.emit('acceptNegotiation', myNegotiation.id);
                            }
                          } else if (myNegotiation.status === 'accepted') {
                            if (myNegotiation.toCountryId === myCountryId) {
                              socket.emit('cancelNegotiation', myNegotiation.id);
                            }
                          }
                        }}
                        disabled={
                          myCountry?.isReady ||
                          (myNegotiation?.status === 'accepted' && myNegotiation.fromCountryId === myCountryId) ||
                          alreadyNegotiatedThisRound
                        }
                        className={`text-[10px] px-2 py-1 rounded border transition-colors ${myNegotiation?.status === 'accepted' ? (myNegotiation.toCountryId === myCountryId ? 'bg-red-500 text-white border-red-500 hover:bg-red-600' : 'bg-green-500 text-white border-green-500 font-bold') :
                            myNegotiation?.status === 'requested' ? (myNegotiation.fromCountryId === myCountryId ? 'bg-yellow-500 text-white border-yellow-500 hover:bg-red-500 hover:border-red-500' : 'bg-blue-500 text-white border-blue-500 hover:bg-green-500 hover:border-green-500') :
                              alreadyNegotiatedThisRound ? 'bg-gray-400 text-white border-gray-400 cursor-not-allowed' :
                                'border-white/50 hover:bg-white/20'
                          }`}
                        title={
                          myNegotiation?.status === 'requested' ? (myNegotiation.fromCountryId === myCountryId ? 'Нажмите, чтобы отменить запрос' : 'Нажмите, чтобы принять запрос') :
                            myNegotiation?.status === 'accepted' && myNegotiation.toCountryId === myCountryId ? 'Нажмите, чтобы завершить переговоры' :
                              alreadyNegotiatedThisRound ? 'Вы уже отправляли запрос в эту страну в этом раунде' : ''
                        }
                      >
                        {myNegotiation?.status === 'accepted' ? (myNegotiation.toCountryId === myCountryId ? 'Завершить переговоры ✕' : 'Ведутся переговоры') :
                          myNegotiation?.status === 'requested' ? (myNegotiation.fromCountryId === myCountryId ? 'Запрос отправлен ✕' : 'Принять запрос ✓') :
                            alreadyNegotiatedThisRound ? 'Запрос уже отправлялся' :
                              'Провести переговоры'}
                      </button>
                    )}
                  </div>
                  <span className="font-bold" title="Средний уровень жизни">{avgLife}%</span>
                </div>
                <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
                  {c.regions.map(r => {
                    const bombKey = `${c.id}_${r.id}`;
                    const isBombing = orders.bomb[bombKey];
                    const bombingResults = gameState.bombingsLastRound?.filter(b => b.targetCountryId === c.id && b.regionId === r.id) || [];
                    const isCityHit = bombingResults.some(b => b.result === 'city_hit');
                    return (
                      <div key={r.id} className={`flex flex-col items-center p-1 rounded transition-colors ${r.isDestroyed ? 'opacity-50 grayscale' : isBombing ? 'bg-red-50' : ''} ${isCityHit ? 'bg-red-100 text-red-900' : ''}`}>
                        <div className={`font-bold uppercase mb-1 truncate w-full flex items-center justify-center gap-1 ${r.isDestroyed ? 'line-through text-red-700' : ''}`} title={r.name}>
                          {r.isDestroyed && <Skull className="w-3 h-3 text-red-600" />}
                          {r.name}
                        </div>
                        <div className="text-gray-400 mb-2">Ур. жизни {r.isDestroyed ? '0' : Math.floor(r.lifeLevel * (gameState.ecology / 100))}%</div>
                        <button
                          onClick={() => handleOrderChange('bomb', bombKey, !isBombing)}
                          disabled={myCountry?.isReady || r.isDestroyed || (!isBombing && !canSelectMoreMissiles)}
                          className={`mt-auto w-full py-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${r.isDestroyed ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : isBombing ? 'bg-red-600 text-white shadow-[0_0_8px_rgba(220,38,38,0.6)]' : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
                          title="Атаковать регион ядерной ракетой."
                        >
                          {isBombing ? <Target size={12} /> : <Crosshair size={12} />}
                          {r.isDestroyed ? 'УНИЧТОЖЕНО' : isBombing ? 'ЦЕЛЬ' : 'УДАР'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {negotiationTargetId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <MessageSquare size={20} className="text-blue-400" />
                Запрос на переговоры
              </h3>
              <button
                onClick={() => setNegotiationTargetId(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-4">
                Вы собираетесь отправить запрос на переговоры стране <span className="font-bold text-slate-800">{gameState.countries[negotiationTargetId]?.name}</span>.
              </p>
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Ваше имя (будет видно только администрации):
                </label>
                <input
                  type="text"
                  value={negotiationPlayerName}
                  onChange={(e) => setNegotiationPlayerName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  placeholder="Введите ваше имя..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && negotiationPlayerName.trim()) {
                      socket.emit('requestNegotiation', myCountryId, negotiationTargetId, negotiationPlayerName.trim());
                      setNegotiationTargetId(null);
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setNegotiationTargetId(null)}
                  className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    if (negotiationPlayerName.trim()) {
                      socket.emit('requestNegotiation', myCountryId, negotiationTargetId, negotiationPlayerName.trim());
                      setNegotiationTargetId(null);
                    }
                  }}
                  disabled={!negotiationPlayerName.trim()}
                  className="px-5 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-blue-600/20"
                >
                  Отправить запрос
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="bg-green-600 text-white px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 border border-green-500/50"
            >
              <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <span className="font-bold text-lg tracking-wide">{n.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
