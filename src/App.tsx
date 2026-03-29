import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Rocket, Zap, Globe, DollarSign, Activity, AlertTriangle, Send, TrendingUp, Ban, Crosshair, Target, Leaf, LogOut, Skull, Flame, ShieldAlert, ShieldOff, Bell, MessageSquare, Play, SkipForward, RotateCcw, Settings, Users, Terminal, History, CheckCircle2, XCircle, Key, Power, PowerOff, UserX, Monitor, Crown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell, AreaChart, Area, LabelList } from 'recharts';

type Region = {
  id: string;
  name: string;
  development: number;
  lifeLevel: number;
  income: number;
  shield: boolean;
  imageUrl: string;
  isDestroyed?: boolean;
};

type Country = {
  id: string;
  name: string;
  flag: string;
  money: number;
  missiles: number;
  hasNuclearTech: boolean;
  isReady: boolean;
  ownerId: string | null;
  regions: Region[];
  color: string;
  hasPassword?: boolean;
  isActive?: boolean;
  sanctionedBy?: string[];
  stats?: {
    missilesLaunched: number;
    totalIncome: number;
    ecologyInvestments: number;
  };
};

type Negotiation = {
  id: string;
  fromCountryId: string;
  toCountryId: string;
  playerName: string;
  status: 'requested' | 'accepted';
};

type BombingResult = {
  targetCountryId: string;
  regionId: string;
  attackerId: string;
  result: 'shield_destroyed' | 'city_hit' | 'already_destroyed';
};

type GameState = {
  round: number;
  ecology: number;
  ecologyHistory: number[];
  status: 'waiting' | 'playing' | 'round_end' | 'finished';
  roundEndTime: number | null;
  countries: Record<string, Country>;
  logs: string[];
  orders: Record<string, any>;
  lastRoundOrders: Record<string, any>;
  negotiations: Negotiation[];
  bombingsLastRound: BombingResult[];
  roundResults: Record<number, any[]>;
  adminCalls: string[];
};

let socket: Socket;

const countryImages: Record<string, string> = {
  usa: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?auto=format&fit=crop&w=800&q=80',
  russia: 'https://images.unsplash.com/photo-1513326738677-b964603b136d?auto=format&fit=crop&w=800&q=80',
  china: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=800&q=80',
  uk: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80',
  germany: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=800&q=80',
  france: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80',
  japan: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
  canada: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=800&q=80',
  iran: 'https://images.unsplash.com/photo-1580137189272-c9379f8864fd?auto=format&fit=crop&w=800&q=80',
  israel: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=800&q=80',
  north_korea: 'https://images.unsplash.com/photo-1538428494232-9c0d8a3ab403?auto=format&fit=crop&w=800&q=80',
  kazakhstan: 'https://images.unsplash.com/photo-1558588942-930faae5a389?auto=format&fit=crop&w=800&q=80',
  ukraine: 'https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?auto=format&fit=crop&w=800&q=80',
  austria: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=800&q=80'
};

const getCountryImage = (id: string) => countryImages[id] || `https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80`;

const GameLogo = ({ className = "", size = "md" }: { className?: string, size?: "sm" | "md" | "lg" | "xl" }) => {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-4xl",
    xl: "text-5xl"
  };
  
  return (
    <div className={`flex flex-col items-center justify-center font-black uppercase leading-[0.9] drop-shadow-md ${sizeClasses[size]} ${className}`}>
      <div className="flex items-center">
        <span>МИР</span>
        <Globe className="w-[0.9em] h-[0.9em] mx-[0.05em]" strokeWidth={2.5} />
        <span>ВОЕ</span>
      </div>
      <div className="mt-[0.1em]">ГОСПОДСТВО</div>
    </div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myCountryId, setMyCountryId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<'president' | 'citizen' | null>(null);
  const [myCountryPassword, setMyCountryPassword] = useState<string>('');
  const [playerToken] = useState(() => {
    let token = localStorage.getItem('playerToken');
    if (!token) {
      token = Math.random().toString(36).substring(2);
      localStorage.setItem('playerToken', token);
    }
    return token;
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSpectatorMode, setIsSpectatorMode] = useState(false);
  const [notifications, setNotifications] = useState<{id: string, message: string}[]>([]);
  
  // Modal states
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminPwd, setAdminPwd] = useState('');
  const [adminError, setAdminError] = useState('');

  const [countryModalId, setCountryModalId] = useState<string | null>(null);
  const [countryPwd, setCountryPwd] = useState('');
  const [transferInputs, setTransferInputs] = useState<Record<string, string>>({});
  
  const [negotiationTargetId, setNegotiationTargetId] = useState<string | null>(null);
  const [negotiationPlayerName, setNegotiationPlayerName] = useState('');

  const [globalError, setGlobalError] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Local turn orders state
  const [orders, setOrders] = useState({
    develop: {} as Record<string, boolean>,
    shields: {} as Record<string, boolean>,
    missiles: 0,
    researchNuclear: false,
    ecology: false,
    transfers: {} as Record<string, string>,
    bomb: {} as Record<string, boolean>,
    sanction: {} as Record<string, boolean>
  });

  useEffect(() => {
    socket = io();
    socket.on('gameState', (state: GameState) => {
      setGameState(state);
    });
    socket.on('joinSuccess', ({ countryId, role }: { countryId: string, role: 'president' | 'citizen' }) => {
      setMyCountryId(countryId);
      setMyRole(role);
      setCountryModalId(null);
    });
    
    socket.on('error', (msg: string) => {
      setGlobalError(msg);
      setMyCountryId(null);
      setMyRole(null);
    });
    socket.on('moneyReceived', ({ from, amount }: { from: string, amount: number }) => {
      const id = Math.random().toString(36).substring(7);
      setNotifications(prev => [...prev, { id, message: `Вы получили ${amount}$ от ${from}!` }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);
    });
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleConnect = () => {
      if (myCountryId && myRole) {
        socket.emit('joinCountry', myCountryId, myCountryPassword, playerToken, myRole);
      }
    };
    socket.on('connect', handleConnect);
    return () => {
      socket.off('connect', handleConnect);
    };
  }, [myCountryId, myCountryPassword]);

  useEffect(() => {
    if (gameState?.status === 'playing' && gameState.roundEndTime) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((gameState.roundEndTime! - Date.now()) / 1000));
        setTimeLeft(remaining);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
    }
  }, [gameState?.status, gameState?.roundEndTime]);

  // Reset orders on new round
  useEffect(() => {
    if (gameState?.round) {
      setOrders({
        develop: {},
        shields: {},
        missiles: 0,
        researchNuclear: false,
        ecology: false,
        transfers: {},
        bomb: {},
        sanction: {}
      });
    }
  }, [gameState?.round]);

  if (!gameState) return <div className="flex h-screen items-center justify-center bg-[#12231E] text-white">Загрузка...</div>;

  const myCountry = myCountryId ? gameState.countries[myCountryId] : null;
  const otherCountries = (Object.values(gameState.countries) as Country[]).filter(c => c.id !== myCountryId && c.isActive !== false);

  // Calculate costs
  const developCost = Object.values(orders.develop).filter(Boolean).length * 150;
  const shieldsCost = Object.values(orders.shields).filter(Boolean).length * 300;
  const missilesCost = orders.missiles * 150;
  const nuclearCost = orders.researchNuclear ? 500 : 0;
  const ecologyCost = orders.ecology ? 200 : 0;
  
  // Transfers cost is calculated from the server state since it's instant
  const sentTransfers = myCountryId && gameState?.orders[myCountryId]?.transfers 
    ? gameState.orders[myCountryId].transfers 
    : {};
  const transfersCost = Object.values(sentTransfers).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0) as number;
  
  const totalExpenses = developCost + shieldsCost + missilesCost + nuclearCost + ecologyCost;
  
  const remainingBudget = myCountry ? myCountry.money - totalExpenses : 0;
  
  let baseIncome = myCountry ? myCountry.regions.reduce((sum, r) => sum + r.income, 0) : 0;
  const sanctionsCount = myCountry?.sanctionedBy?.length || 0;
  const totalIncome = Math.floor(baseIncome * Math.max(0, 1 - 0.10 * sanctionsCount));
  
  const avgLifeLevel = myCountry ? Math.round(myCountry.regions.reduce((sum, r) => sum + Math.floor(r.lifeLevel * (gameState.ecology / 100)), 0) / 4) : 0;

  const activeBombOrdersCount = Object.values(orders.bomb || {}).filter(Boolean).length;
  const availableMissiles = myCountry?.missiles || 0;
  const canSelectMoreMissiles = activeBombOrdersCount < availableMissiles;

  const handleOrderChange = (category: keyof typeof orders, key: string, value: any) => {
    setOrders(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] as any),
        [key]: value
      }
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

  if (!myCountryId && !isAdmin) {
    return (
      <div 
        className="min-h-screen text-slate-100 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?auto=format&fit=crop&w=1920&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"></div>

        <div className="w-full max-w-6xl flex flex-col items-center py-12 relative z-10">
          <GameLogo size="xl" className="mb-12 text-white drop-shadow-2xl" />
          
          <div className="w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 px-2">
              <h2 className="text-2xl font-black tracking-widest uppercase text-white flex items-center gap-3 drop-shadow-md">
                <Globe className="w-6 h-6 text-blue-400" />
                Выберите страну
              </h2>
              <div className="text-sm font-bold text-slate-300 uppercase tracking-widest bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700/50 shadow-lg">
                Доступно: {(Object.values(gameState.countries) as Country[]).filter(c => c.isActive !== false && !c.ownerId).length}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {(Object.values(gameState.countries) as Country[]).filter(c => c.isActive !== false).map(c => (
                <button
                  key={c.id}
                  onClick={() => { 
                    setCountryModalId(c.id);
                    setCountryPwd('');
                  }}
                  className={`relative text-left transition-all duration-300 overflow-hidden group flex flex-col bg-slate-900/40 backdrop-blur-md rounded-2xl border ${
                    c.ownerId 
                      ? 'border-slate-700/50 opacity-60' 
                      : 'border-slate-600/50 hover:border-blue-400/60 hover:bg-slate-800/60 shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1'
                  }`}
                >
                  {/* Country Image */}
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

        {/* Global Error Modal */}
        {globalError && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl p-8 max-w-sm w-full shadow-xl">
              <h3 className="text-xl font-black mb-4 text-red-600 flex items-center gap-3 uppercase tracking-wider">
                <AlertTriangle className="w-6 h-6" /> Ошибка
              </h3>
              <p className="mb-8 text-slate-600 font-medium">{globalError}</p>
              <button 
                onClick={() => setGlobalError('')}
                className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors uppercase tracking-wider text-sm"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}

        {/* Admin Login Modal */}
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
                  if (e.key === 'Enter') {
                    if (adminPwd === 'WoDom2026') {
                      setIsAdmin(true);
                      setAdminModalOpen(false);
                    } else {
                      setAdminError('Неверный пароль!');
                    }
                  }
                }}
              />
              {adminError && <p className="text-red-500 text-sm mb-4 font-medium flex items-center gap-2"><XCircle className="w-4 h-4"/>{adminError}</p>}
              <div className="flex gap-3 mt-4">
                <button 
                  onClick={() => setAdminModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors uppercase tracking-wider text-sm"
                >
                  Отмена
                </button>
                <button 
                  onClick={() => {
                    if (adminPwd === 'WoDom2026') {
                      setIsAdmin(true);
                      setAdminModalOpen(false);
                    } else {
                      setAdminError('Неверный пароль!');
                    }
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors uppercase tracking-wider text-sm shadow-sm"
                >
                  Войти
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Country Login Modal */}
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
                placeholder={gameState.countries[countryModalId]?.hasPassword ? "Введите пароль страны" : "Пароль не требуется"}
                disabled={!gameState.countries[countryModalId]?.hasPassword}
                className="w-full p-4 mb-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono disabled:opacity-50 disabled:bg-slate-200"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    socket.emit('joinCountry', countryModalId, countryPwd, playerToken, 'president');
                    setMyCountryPassword(countryPwd);
                  }
                }}
              />
              <div className="flex flex-col gap-3 mt-4">
                <button 
                  onClick={() => {
                    socket.emit('joinCountry', countryModalId, countryPwd, playerToken, 'president');
                    setMyCountryPassword(countryPwd);
                  }}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors uppercase tracking-wider text-sm shadow-sm"
                >
                  Войти как Президент
                </button>
                <button 
                  onClick={() => {
                    socket.emit('joinCountry', countryModalId, countryPwd, playerToken, 'citizen');
                    setMyCountryPassword(countryPwd);
                  }}
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

  if (gameState.status === 'finished') {
    const activeCountries = (Object.values(gameState.countries) as Country[]).filter(c => c.isActive !== false);
    
    // Calculate awards
    let bestLifeLevelCountry = activeCountries[0];
    let mostWarlikeCountry = activeCountries[0];
    let baronCountry = activeCountries[0];
    let greenpeaceCountry = activeCountries[0];

    activeCountries.forEach(c => {
      const avgLifeLevel = Math.round(c.regions.reduce((sum, r) => sum + Math.floor(r.lifeLevel * (gameState.ecology / 100)), 0) / c.regions.length);
      const bestAvgLifeLevel = Math.round(bestLifeLevelCountry.regions.reduce((sum, r) => sum + Math.floor(r.lifeLevel * (gameState.ecology / 100)), 0) / bestLifeLevelCountry.regions.length);
      if (avgLifeLevel > bestAvgLifeLevel) bestLifeLevelCountry = c;

      if ((c.stats?.missilesLaunched || 0) > (mostWarlikeCountry.stats?.missilesLaunched || 0)) mostWarlikeCountry = c;
      if ((c.stats?.totalIncome || 0) > (baronCountry.stats?.totalIncome || 0)) baronCountry = c;
      if ((c.stats?.ecologyInvestments || 0) > (greenpeaceCountry.stats?.ecologyInvestments || 0)) greenpeaceCountry = c;
    });

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden"
      >
        {/* Background decorative elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-500/20 rounded-full blur-[120px] pointer-events-none"></div>

        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
          className="max-w-7xl w-full bg-white/5 backdrop-blur-xl border border-white/10 text-slate-100 rounded-3xl p-6 md:p-12 shadow-2xl relative z-10"
        >
          <motion.h1 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
            className="text-5xl md:text-6xl font-black text-center mb-12 uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 drop-shadow-sm"
          >
            ИГРА ОКОНЧЕНА
          </motion.h1>
          
          {/* Winner Banner */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
            className="bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 p-8 md:p-12 rounded-3xl shadow-[0_0_50px_rgba(251,191,36,0.3)] text-white text-center mb-16 relative overflow-hidden border border-yellow-300/50"
          >
            <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Crown className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-6 text-yellow-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
            </motion.div>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-[0.2em] mb-4 text-yellow-100 opacity-90">Абсолютный Победитель</h2>
            <div className="text-8xl md:text-9xl mb-6 drop-shadow-2xl">{bestLifeLevelCountry.flag}</div>
            <div className="text-5xl md:text-7xl font-black drop-shadow-lg tracking-tight mb-6">{bestLifeLevelCountry.name}</div>
            <div className="text-xl md:text-3xl font-bold mt-4 text-yellow-50 bg-black/30 backdrop-blur-md inline-block px-8 py-4 rounded-2xl border border-white/20 shadow-inner">
              Средний ур. жизни: <span className="text-white">{Math.round(bestLifeLevelCountry.regions.reduce((sum, r) => sum + Math.floor(r.lifeLevel * (gameState.ecology / 100)), 0) / bestLifeLevelCountry.regions.length)}%</span>
            </div>
          </motion.div>

          <h3 className="text-3xl font-black text-center mb-8 uppercase tracking-widest text-slate-200">Особые достижения</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <motion.div 
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-gradient-to-br from-red-500/10 to-red-900/20 p-8 rounded-2xl border border-red-500/30 flex flex-col items-center text-center shadow-lg backdrop-blur-sm"
            >
              <div className="bg-red-500/20 p-4 rounded-full mb-6">
                <Crosshair className="w-10 h-10 text-red-400" />
              </div>
              <h3 className="text-lg font-bold uppercase tracking-wider text-red-300 mb-4">Самая воинственная</h3>
              <div className="text-5xl mb-3 drop-shadow-md">{mostWarlikeCountry.flag}</div>
              <div className="text-2xl font-black mt-2 text-white">{mostWarlikeCountry.name}</div>
              <div className="text-red-400 font-bold mt-3 text-lg bg-red-500/10 px-4 py-1 rounded-full">{mostWarlikeCountry.stats?.missilesLaunched || 0} ракет запущено</div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-gradient-to-br from-blue-500/10 to-blue-900/20 p-8 rounded-2xl border border-blue-500/30 flex flex-col items-center text-center shadow-lg backdrop-blur-sm"
            >
              <div className="bg-blue-500/20 p-4 rounded-full mb-6">
                <DollarSign className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold uppercase tracking-wider text-blue-300 mb-4">Страна-барон</h3>
              <div className="text-5xl mb-3 drop-shadow-md">{baronCountry.flag}</div>
              <div className="text-2xl font-black mt-2 text-white">{baronCountry.name}</div>
              <div className="text-blue-400 font-bold mt-3 text-lg bg-blue-500/10 px-4 py-1 rounded-full">{baronCountry.stats?.totalIncome || 0}$ заработано</div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-gradient-to-br from-emerald-500/10 to-emerald-900/20 p-8 rounded-2xl border border-emerald-500/30 flex flex-col items-center text-center shadow-lg backdrop-blur-sm"
            >
              <div className="bg-emerald-500/20 p-4 rounded-full mb-6">
                <Leaf className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold uppercase tracking-wider text-emerald-300 mb-4">Инвестор Грин пис</h3>
              <div className="text-5xl mb-3 drop-shadow-md">{greenpeaceCountry.flag}</div>
              <div className="text-2xl font-black mt-2 text-white">{greenpeaceCountry.name}</div>
              <div className="text-emerald-400 font-bold mt-3 text-lg bg-emerald-500/10 px-4 py-1 rounded-full">{greenpeaceCountry.stats?.ecologyInvestments || 0} инвестиций</div>
            </motion.div>
          </div>

          {/* History of Actions */}
          {gameState.roundResults && Object.keys(gameState.roundResults).length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-16"
            >
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

                            const developed = Object.keys(orders.develop || {}).filter(k => orders.develop[k]).map(rId => gameState.countries[r.id]?.regions.find(reg => reg.id === rId)?.name).join(', ') || '-';
                            const shields = Object.keys(orders.shields || {}).filter(k => orders.shields[k]).map(rId => gameState.countries[r.id]?.regions.find(reg => reg.id === rId)?.name).join(', ') || '-';
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
                onClick={() => setIsSpectatorMode(false)} 
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

  if (gameState.status === 'round_end' || isSpectatorMode) {
    const activeCountries = (Object.values(gameState.countries) as Country[]).filter(c => c.isActive !== false);
    
    // Prepare data for ecology chart
    const ecologyData = gameState.ecologyHistory.map((eco, index) => ({
      round: index + 1,
      ecology: eco
    }));
    if (gameState.status !== 'round_end') {
      ecologyData.push({
        round: gameState.round,
        ecology: gameState.ecology
      });
    }

    const getCountryColor = (colorClass: string) => {
      if (colorClass.includes('bg-blue-600')) return '#3b82f6'; // USA
      if (colorClass.includes('bg-red-600')) return '#ef4444'; // Russia
      if (colorClass.includes('bg-yellow-500')) return '#eab308'; // China
      if (colorClass.includes('bg-indigo-800')) return '#4f46e5'; // UK
      if (colorClass.includes('bg-stone-800')) return '#57534e'; // Germany
      if (colorClass.includes('bg-blue-400')) return '#60a5fa'; // France
      if (colorClass.includes('bg-white')) return '#f87171'; // Japan (red text)
      if (colorClass.includes('bg-red-500')) return '#f43f5e'; // Canada
      if (colorClass.includes('bg-teal-600')) return '#14b8a6'; // Australia
      if (colorClass.includes('bg-red-800')) return '#991b1b'; // North Korea
      if (colorClass.includes('bg-cyan-700')) return '#0ea5e9'; // Kazakhstan
      if (colorClass.includes('bg-yellow-400')) return '#facc15'; // Ukraine
      if (colorClass.includes('bg-red-700')) return '#b91c1c'; // Austria
      return '#9ca3af';
    };

    // Prepare data for life level bar chart
    const lifeLevelData = activeCountries.map(c => {
      const avgLife = Math.round(c.regions.reduce((sum, r) => sum + Math.floor(r.lifeLevel * (gameState.ecology / 100)), 0) / c.regions.length);
      return {
        name: `${c.flag} ${c.name}`,
        lifeLevel: avgLife,
        fill: getCountryColor(c.color)
      };
    }).sort((a, b) => b.lifeLevel - a.lifeLevel);

    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 p-8 font-sans">
        <div className="max-w-[1600px] mx-auto">
          <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4 md:gap-6">
              {!isAdmin && (
                <button
                  onClick={() => {
                    socket.emit('leaveCountry');
                    setMyCountryId(null);
                    setMyRole(null);
                  }}
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
                  onClick={() => setIsSpectatorMode(false)} 
                  className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center gap-2 shadow-sm"
                >
                  ВЫЙТИ <LogOut className="w-5 h-5" />
                </button>
              )}
            </div>
          </header>

          <div className="flex flex-col xl:grid xl:grid-cols-12 gap-8">
            {/* Left Column: Countries */}
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
                          {canSeeShields && r.shield && !r.isDestroyed && <Shield className="w-3 h-3 text-slate-400" title="Щит активен" />}
                          {canSeeShields && isShieldDestroyed && !r.isDestroyed && <ShieldOff className="w-3 h-3 text-orange-500" title="Щит уничтожен в этом раунде" />}
                          <span className="truncate">{r.name}</span>
                        </div>
                        <div className={`text-2xl font-black ${r.isDestroyed ? 'text-slate-400 line-through' : isCityHit ? 'text-red-600' : 'text-slate-800'}`} title="Уровень жизни с учетом экологии">
                          {Math.floor(r.lifeLevel * (gameState.ecology / 100))}%
                        </div>
                        {isCityHit && !r.isDestroyed && <AlertTriangle className="w-4 h-4 text-red-500 absolute top-1 right-1 opacity-50" />}
                      </div>
                    )})}
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Charts */}
            <div className="xl:col-span-7 flex flex-col gap-8">
              {/* Ecology Chart */}
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
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="round" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(val) => `Раунд ${val}`} />
                      <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                        formatter={(value: number) => [`${value}%`, 'Экология']}
                        labelFormatter={(label) => `Раунд ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="ecology" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorEcology)"
                        activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                      >
                        <LabelList dataKey="ecology" position="top" fill="#0f172a" fontSize={12} fontWeight="bold" formatter={(val: number) => `${val}%`} />
                      </Area>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Life Level Chart */}
              <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 flex-1 flex flex-col">
                <div className="bg-slate-50 border-b border-slate-200 text-slate-800 py-3 px-6 font-bold uppercase tracking-widest flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <span>Уровень жизни в государствах</span>
                </div>
                <div className="p-6 flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lifeLevelData} margin={{ top: 30, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} 
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                      <RechartsTooltip 
                        cursor={{ fill: '#f1f5f9' }}
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [`${value}%`, 'Уровень жизни']}
                      />
                      <Bar dataKey="lifeLevel" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="lifeLevel" position="top" fill="#0f172a" fontSize={12} fontWeight="bold" formatter={(val: number) => `${val}%`} />
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

          {/* Admin Actions Table */}
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
        <style dangerouslySetInnerHTML={{__html: `
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.5);
          }
          .custom-scrollbar-light::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar-light::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.05);
            border-radius: 4px;
          }
          .custom-scrollbar-light::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.15);
            border-radius: 4px;
          }
          .custom-scrollbar-light::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.25);
          }
        `}} />
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        {/* Top Navigation Bar */}
        <div className="bg-slate-900 text-white sticky top-0 z-50 shadow-lg">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Shield className="w-8 h-8 text-blue-400" />
              <h2 className="text-2xl font-black tracking-wider uppercase text-center">Панель Администратора</h2>
              <div className="px-3 py-1 bg-slate-800 rounded-full text-sm font-bold border border-slate-700">
                Раунд {gameState.round} • {gameState.status === 'playing' ? 'Идет игра' : gameState.status === 'waiting' ? 'Ожидание' : 'Пауза'}
              </div>
            </div>
            
            {timeLeft !== null && (
              <div className={`font-mono text-3xl font-bold px-6 py-1.5 rounded-lg shadow-inner ${timeLeft < 60 ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/50' : 'bg-slate-800 text-green-400 border border-slate-700'}`}>
                {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{Math.floor(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => setIsSpectatorMode(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-md">
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
              <button onClick={() => setIsAdmin(false)} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-md">
                <PowerOff className="w-4 h-4" /> Выйти
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto p-4 md:p-6 grid grid-cols-12 gap-6">
          
          {/* Left Column: Countries */}
          <div className="col-span-12 xl:col-span-8 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Globe className="w-6 h-6 text-blue-600" /> Управление странами
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.values(gameState.countries) as Country[]).map(c => (
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
                          {c.ownerId ? <><Users className="w-4 h-4"/> В сети</> : <><UserX className="w-4 h-4"/> Нет</>}
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

            {/* Round Results Table */}
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
                            {(results as any[]).sort((a: any, b: any) => b.avgLifeLevel - a.avgLifeLevel).map((r: any, i: number) => (
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

          {/* Right Column: Alerts & Logs */}
          <div className="col-span-12 xl:col-span-4 space-y-6">
            
            {/* Admin Calls Block */}
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

            {/* Negotiations Block */}
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
                          <Users className="w-3 h-3"/> {n.playerName}
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
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{animationDelay: '150ms'}}></div>
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{animationDelay: '300ms'}}></div>
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

            {/* Event Log */}
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
                      <span className="opacity-50 mr-2 text-[10px]">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
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

  return (
    <div className="min-h-screen bg-[#12231E] text-slate-900 font-sans p-4">
      {/* Top Bar */}
      <header className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 mb-4 text-white">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => {
              socket.emit('leaveCountry');
              setMyCountryId(null);
              setMyRole(null);
            }}
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
              className={`md:ml-6 flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all shadow-lg ${
                gameState.adminCalls?.includes(myCountryId)
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
          className={`font-bold text-lg md:text-xl px-8 py-3 w-full md:w-auto rounded transition-all duration-300 ${
            myCountry?.isReady 
              ? 'bg-gray-500 text-white cursor-not-allowed' 
              : remainingBudget < 0 
                ? 'bg-red-500 text-white cursor-not-allowed opacity-50' 
                : 'bg-white text-slate-900 hover:bg-green-400 hover:text-white hover:scale-105 shadow-[0_0_15px_rgba(255,255,255,0.5)]'
          }`}
          title={remainingBudget < 0 ? "Недостаточно средств для завершения хода!" : "Подтвердить выбранные действия и завершить ход"}
        >
          {myCountry?.isReady ? 'ОЖИДАНИЕ...' : 'ПРИНЯТЬ'}
        </button>
      </header>

      <main className="max-w-[1600px] mx-auto grid grid-cols-12 gap-6 p-4 md:p-6">
        
        {/* Left Panel: My Planet */}
        <div className="col-span-12 xl:col-span-8 bg-white rounded-xl p-4 sm:p-6 shadow-2xl">
          {/* Header */}
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
                <div className="text-xs font-bold text-gray-500 uppercase leading-tight">Средний уровень<br/>жизни в Стране:</div>
                <div className="text-3xl font-bold text-teal-600">{avgLifeLevel}%</div>
              </div>
              <div title="Ваши деньги. Используются для развития, щитов, ракет и экологии.">
                <div className="text-xs font-bold text-gray-500 uppercase leading-tight">Доступный<br/>бюджет:</div>
                <div className={`text-4xl font-black transition-colors duration-300 ${remainingBudget < 0 ? 'text-red-500 animate-pulse' : 'text-blue-500'}`}>{remainingBudget}$</div>
              </div>
            </div>
          </div>

          {/* Regions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {myCountry?.regions.map(r => {
              const isDeveloping = orders.develop[r.id];
              const isShielding = orders.shields[r.id];
              const projectedDevelopment = isDeveloping ? r.development + 20 : r.development;
              const projectedLifeLevel = isDeveloping ? r.lifeLevel + 5 : r.lifeLevel;
              const effectiveLifeLevel = Math.floor(r.lifeLevel * (gameState.ecology / 100));
              const projectedEffectiveLifeLevel = Math.floor(projectedLifeLevel * (gameState.ecology / 100));
              const projectedIncome = isDeveloping ? Math.floor(300 * (projectedDevelopment / 100) * (projectedEffectiveLifeLevel / 100)) : r.income;
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
                  {(r.shield || isShielding) && !r.isDestroyed && <Shield className={`w-4 h-4 ${isShielding ? 'text-blue-400 animate-bounce' : 'text-blue-600'}`} title="Регион защищен щитом" />}
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
                    <TrendingUp size={14} /> {r.isDestroyed ? 'УНИЧТОЖЕНО' : isDeveloping ? 'ИНВЕСТИРОВАНО' : 'РАЗВИТИЕ (-150$)'}
                  </button>
                  <button 
                    onClick={() => handleOrderChange('shields', r.id, !isShielding)}
                    disabled={myCountry.isReady || r.shield || r.isDestroyed}
                    className={`w-full py-1.5 rounded flex items-center justify-center gap-1.5 font-bold transition-all ${r.isDestroyed ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : r.shield ? 'bg-blue-100 text-blue-400 cursor-not-allowed' : isShielding ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'}`}
                    title="Защищает регион от одной ядерной атаки. Щит одноразовый."
                  >
                    <Shield size={14} /> {r.isDestroyed ? 'УНИЧТОЖЕНО' : r.shield ? 'ЩИТ АКТИВЕН' : isShielding ? 'ЩИТ СТРОИТСЯ' : 'ЩИТ (-300$)'}
                  </button>
                </div>
              </div>
            )})}
          </div>

          {/* Middle Row: Nukes & Ecology */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className={`rounded-xl p-5 transition-colors duration-300 ${orders.researchNuclear || orders.missiles > 0 ? 'bg-orange-50 ring-2 ring-orange-200' : 'bg-gray-100'}`}>
              <h3 className="font-bold uppercase mb-4 text-sm flex items-center gap-2" title="Ядерное оружие позволяет уничтожать регионы противника.">
                <Rocket className="w-4 h-4 text-orange-500" />
                Ядерная программа
              </h3>
              {!myCountry?.hasNuclearTech ? (
                <div className="mb-6">
                  <button 
                    onClick={() => setOrders(p => ({...p, researchNuclear: !p.researchNuclear}))}
                    disabled={myCountry?.isReady}
                    className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all ${orders.researchNuclear ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-white border-2 border-orange-200 text-orange-600 hover:bg-orange-50'}`}
                    title="Открывает возможность строить ядерные ракеты."
                  >
                    <Zap size={18} /> {orders.researchNuclear ? 'ИССЛЕДОВАНИЕ ЗАПУЩЕНО' : 'ИССЛЕДОВАТЬ ТЕХНОЛОГИИ (-500$)'}
                  </button>
                  <div className="text-xs text-red-500 mt-2 font-medium text-center">Снижает экологию планеты на 3%</div>
                </div>
              ) : (
                <div className="mb-6" title="Построить ракеты. Они будут доступны для запуска в следующем раунде.">
                  <div className="text-xs text-gray-500 font-bold mb-2 uppercase">Производство ракет:</div>
                  <div className="flex bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                    {[0, 1, 2, 3].map(num => (
                      <button 
                        key={num}
                        onClick={() => setOrders(p => ({...p, missiles: num}))}
                        disabled={myCountry?.isReady}
                        className={`flex-1 py-2 text-sm font-bold transition-colors ${orders.missiles === num ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-orange-50'} disabled:opacity-50 disabled:cursor-not-allowed border-r last:border-r-0 border-gray-200`}
                      >
                        {num} шт.
                      </button>
                    ))}
                  </div>
                  {orders.missiles > 0 && <div className="text-xs text-red-500 mt-2 font-bold text-center">Стоимость: -{orders.missiles * 150}$</div>}
                </div>
              )}
              <div className="bg-slate-800 text-white rounded p-3 flex justify-between items-center font-bold text-sm shadow-inner" title="Количество ракет, готовых к запуску.">
                <span className="flex items-center gap-2"><Rocket className="w-4 h-4 text-orange-400" /> АРСЕНАЛ:</span>
                <span className="text-orange-400 text-lg">{availableMissiles - activeBombOrdersCount} ШТ.</span>
              </div>
              {myCountry?.hasNuclearTech && (
                <div className="text-xs text-red-500 mt-2 font-medium text-center">Каждая запущенная ракета снижает экологию на 3%</div>
              )}
            </div>

            <div className={`rounded-xl p-5 flex flex-col justify-between transition-colors duration-300 ${orders.ecology ? 'bg-green-50 ring-2 ring-green-200' : 'bg-gray-100'}`}>
              <h3 className="font-bold uppercase mb-4 text-sm flex items-center gap-2" title="Общий уровень экологии на планете.">
                <Globe className="w-4 h-4 text-green-600" />
                Экология планеты
              </h3>
              <button 
                onClick={() => setOrders(p => ({...p, ecology: !p.ecology}))}
                disabled={myCountry?.isReady}
                className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all mb-6 ${orders.ecology ? 'bg-green-600 text-white shadow-lg shadow-green-600/30' : 'bg-white border-2 border-green-200 text-green-700 hover:bg-green-50'}`}
                title="Повышает мировую экологию на 10%."
              >
                <Leaf size={18} /> {orders.ecology ? 'ПРОГРАММА ЗАПУЩЕНА' : 'УЛУЧШИТЬ ЭКОЛОГИЮ (-200$)'}
              </button>
              <div className="bg-green-700 text-white rounded p-3 flex justify-between items-center font-bold text-sm shadow-inner" title="Текущий уровень экологии.">
                <span className="text-2xl flex items-center gap-2">
                  {gameState.ecology}% 
                  {orders.ecology && <span className="text-sm text-green-300 animate-pulse">+10%</span>}
                </span>
                <span className="text-xs uppercase opacity-80">Уровень экологии</span>
              </div>
            </div>
          </div>

          {/* Bottom Row: Sanctions, Transfers, Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-gray-100 rounded-xl p-5">
              <h3 className="font-bold uppercase mb-4 text-sm text-center">Санкции</h3>
              <div className="text-xs text-gray-500 mb-4">Снижает доход выбранной страны на 10% в следующем раунде. Можно выбрать несколько стран.</div>
              <div className="text-xs font-bold mb-2">На кого наложить:</div>
              <div className="grid grid-cols-2 gap-2">
                {otherCountries.map(c => (
                  <button 
                    key={c.id}
                    onClick={() => setOrders(p => ({...p, sanction: {...p.sanction, [c.id]: !p.sanction[c.id]}}))}
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
                  const sentAmount = Number(gameState.orders[myCountryId || '']?.transfers?.[c.id] || 0);
                  
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
                )})}
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

        {/* Right Panel: Other Countries */}
        <div className="col-span-12 xl:col-span-4 space-y-4">
          {otherCountries.map(c => {
            const avgLife = Math.round(c.regions.reduce((sum, r) => sum + Math.floor(r.lifeLevel * (gameState.ecology / 100)), 0) / 4);
            
            const myNegotiation = gameState.negotiations?.find(n => 
              (n.fromCountryId === myCountryId && n.toCountryId === c.id) || 
              (n.fromCountryId === c.id && n.toCountryId === myCountryId)
            );
            
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
                          (!myNegotiation && (myCountry as any)?.negotiatedWith?.includes(c.id))
                        }
                        className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                          myNegotiation?.status === 'accepted' ? (myNegotiation.toCountryId === myCountryId ? 'bg-red-500 text-white border-red-500 hover:bg-red-600' : 'bg-green-500 text-white border-green-500 font-bold') :
                          myNegotiation?.status === 'requested' ? (myNegotiation.fromCountryId === myCountryId ? 'bg-yellow-500 text-white border-yellow-500 hover:bg-red-500 hover:border-red-500' : 'bg-blue-500 text-white border-blue-500 hover:bg-green-500 hover:border-green-500') :
                          (!myNegotiation && (myCountry as any)?.negotiatedWith?.includes(c.id)) ? 'bg-gray-400 text-white border-gray-400 cursor-not-allowed' :
                          'border-white/50 hover:bg-white/20'
                        }`}
                        title={
                          myNegotiation?.status === 'requested' ? (myNegotiation.fromCountryId === myCountryId ? 'Нажмите, чтобы отменить запрос' : 'Нажмите, чтобы принять запрос') : 
                          myNegotiation?.status === 'accepted' && myNegotiation.toCountryId === myCountryId ? 'Нажмите, чтобы завершить переговоры' :
                          (!myNegotiation && (myCountry as any)?.negotiatedWith?.includes(c.id)) ? 'Вы уже отправляли запрос в эту страну в этом раунде' : ''
                        }
                      >
                        {myNegotiation?.status === 'accepted' ? (myNegotiation.toCountryId === myCountryId ? 'Завершить переговоры ✕' : 'Ведутся переговоры') :
                         myNegotiation?.status === 'requested' ? (myNegotiation.fromCountryId === myCountryId ? 'Запрос отправлен ✕' : 'Принять запрос ✓') :
                         (!myNegotiation && (myCountry as any)?.negotiatedWith?.includes(c.id)) ? 'Запрос уже отправлялся' :
                         'Провести переговоры'}
                      </button>
                    )}
                  </div>
                  <span className="font-bold" title="Средний уровень жизни">{avgLife}%</span>
                </div>
                <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
                  {c.regions.map(r => {
                    const isBombing = orders.bomb[`${c.id}_${r.id}`];
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
                        onClick={() => handleOrderChange('bomb', `${c.id}_${r.id}`, !isBombing)}
                        disabled={myCountry?.isReady || r.isDestroyed || (!isBombing && !canSelectMoreMissiles)}
                        className={`mt-auto w-full py-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${r.isDestroyed ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : isBombing ? 'bg-red-600 text-white shadow-[0_0_8px_rgba(220,38,38,0.6)]' : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="Атаковать регион ядерной ракетой."
                      >
                        {isBombing ? <Target size={12} /> : <Crosshair size={12} />}
                        {r.isDestroyed ? 'УНИЧТОЖЕНО' : isBombing ? 'ЦЕЛЬ' : 'УДАР'}
                      </button>
                    </div>
                  )})}
                </div>
              </div>
            );
          })}
        </div>

      </main>

      {/* Negotiation Modal */}
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
      
      {/* Notifications */}
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

