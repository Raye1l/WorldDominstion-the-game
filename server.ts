import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import http from 'http';
import path from 'path';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' }
  });
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Simple in-memory game state
  const initialRegions = (regions: [string, number, string][]) => regions.map(([name, lifeLevel, imageSeed], i) => {
    const keywords = imageSeed.replace(/_/g, ',');
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const devLevels = [80, 60, 60, 40];
    const development = devLevels[i] || 60;
    return {
      id: `r${i}`,
      name,
      development,
      lifeLevel,
      income: Math.floor(300 * (development / 100) * (Math.floor(lifeLevel * 90 / 100) / 100)),
      shield: false,
      isDestroyed: false,
      imageUrl: `https://loremflickr.com/400/300/${keywords},city/all?lock=${hash}`
    };
  });

  const createInitialCountries = () => {
    const countries = {
      usa: { id: 'usa', name: 'США', flag: '🇺🇸', money: 1000, missiles: 0, hasNuclearTech: false, isReady: false, ownerId: null, regions: initialRegions([['ВАШИНГТОН', 86, 'washington_dc'], ['НЬЮ-ЙОРК', 77, 'new_york_city'], ['ТЕХАС', 68, 'texas_landscape'], ['КАЛИФОРНИЯ', 59, 'california_city']]), color: 'bg-blue-600 text-white' },
      russia: { id: 'russia', name: 'РОССИЯ', flag: '🇷🇺', money: 1000, missiles: 0, hasNuclearTech: false, isReady: false, ownerId: null, regions: initialRegions([['МОСКВА', 95, 'moscow_city'], ['САНКТ-ПЕТЕРБУРГ', 80, 'saint_petersburg'], ['НОВОСИБИРСК', 63, 'novosibirsk_city'], ['КРАСНОДАР', 53, 'krasnodar_city']]), color: 'bg-red-600 text-white' },
      china: { id: 'china', name: 'КИТАЙ', flag: '🇨🇳', money: 1000, missiles: 0, hasNuclearTech: false, isReady: false, ownerId: null, regions: initialRegions([['ПЕКИН', 90, 'beijing_city'], ['ШАНХАЙ', 80, 'shanghai_skyline'], ['СЫЧУАНЬ', 68, 'sichuan_landscape'], ['ГУАНДУН', 52, 'guangdong_city']]), color: 'bg-yellow-500 text-slate-900' },
      uk: { id: 'uk', name: 'ВЕЛИКОБРИТАНИЯ', flag: '🇬🇧', money: 1000, missiles: 0, hasNuclearTech: false, isReady: false, ownerId: null, regions: initialRegions([['ЛОНДОН', 80, 'london_city'], ['БИРМИНГЕМ', 73, 'birmingham_city'], ['МАНЧЕСТЕР', 69, 'manchester_city'], ['ЭДИНБУРГ', 68, 'edinburgh_city']]), color: 'bg-indigo-800 text-white' },
      germany: { id: 'germany', name: 'ГЕРМАНИЯ', flag: '🇩🇪', money: 1000, missiles: 0, hasNuclearTech: false, isReady: false, ownerId: null, regions: initialRegions([['БЕРЛИН', 73, 'berlin_city'], ['МЮНХЕН', 73, 'munich_city'], ['ГАМБУРГ', 73, 'hamburg_city'], ['ФРАНКФУРТ', 73, 'frankfurt_city']]), color: 'bg-stone-800 text-white' },
      france: { id: 'france', name: 'ФРАНЦИЯ', flag: '🇫🇷', money: 1000, missiles: 0, hasNuclearTech: false, isReady: false, ownerId: null, regions: initialRegions([['ПАРИЖ', 83, 'paris_city'], ['НОРМАНДИЯ', 77, 'normandy_landscape'], ['ПРОВАНС', 69, 'provence_landscape'], ['БРЕТАНЬ', 62, 'brittany_coast']]), color: 'bg-blue-400 text-white' },
      japan: { id: 'japan', name: 'ЯПОНИЯ', flag: '🇯🇵', money: 1000, missiles: 0, hasNuclearTech: false, isReady: false, ownerId: null, regions: initialRegions([['ТОКИО', 86, 'tokyo_city'], ['ОСАКА', 74, 'osaka_city'], ['ХОККАЙДО', 68, 'hokkaido_landscape'], ['КИОТО', 63, 'kyoto_city']]), color: 'bg-white text-red-600' },
      canada: { id: 'canada', name: 'КАНАДА', flag: '🇨🇦', money: 1000, missiles: 0, hasNuclearTech: false, isReady: false, ownerId: null, regions: initialRegions([['ОТТАВА', 87, 'ottawa_city'], ['ТОРОНТО', 76, 'toronto_city'], ['КВЕБЕК', 67, 'quebec_city'], ['АЛЬБЕРТА', 60, 'alberta_landscape']]), color: 'bg-red-500 text-white' },
      iran: { id: 'iran', name: 'ИРАН', flag: '🇮🇷', money: 1000, missiles: 0, hasNuclearTech: false, isReady: false, ownerId: null, regions: initialRegions([['ТЕГЕРАН', 80, 'tehran_city'], ['ИСФАХАН', 75, 'isfahan_city'], ['ШИРАЗ', 69, 'shiraz_city'], ['МЕШХЕД', 66, 'mashhad_city']]), color: 'bg-emerald-700 text-white' },
      israel: { id: 'israel', name: 'ИЗРАИЛЬ', flag: '🇮🇱', money: 1000, missiles: 0, hasNuclearTech: false, isReady: false, ownerId: null, regions: initialRegions([['ИЕРУСАЛИМ', 89, 'jerusalem_city'], ['ТЕЛЬ-АВИВ', 78, 'telaviv_city'], ['ХАЙФА', 67, 'haifa_city'], ['ЭЙЛАТ', 56, 'eilat_city']]), color: 'bg-blue-600 text-white' },
      north_korea: { id: 'north_korea', name: 'КНДР', flag: '🇰🇵', money: 1000, missiles: 0, hasNuclearTech: false, isReady: false, ownerId: null, regions: initialRegions([['ПХЕНЬЯН', 100, 'pyongyang_city'], ['ХАМХЫН', 69, 'hamhung_city'], ['ЧХОНДЖИН', 63, 'chongjin_city'], ['НАМПХО', 58, 'nampo_city']]), color: 'bg-red-800 text-white' },
      kazakhstan: { id: 'kazakhstan', name: 'КАЗАХСТАН', flag: '🇰🇿', money: 1000, missiles: 0, hasNuclearTech: false, isReady: false, ownerId: null, regions: initialRegions([['АСТАНА', 84, 'astana_city'], ['АЛМАТЫ', 76, 'almaty_city'], ['ШЫМКЕНТ', 68, 'shymkent_city'], ['КАРАГАНДА', 63, 'karaganda_city']]), color: 'bg-cyan-700 text-white' },
      ukraine: { id: 'ukraine', name: 'УКРАИНА', flag: '🇺🇦', money: 1000, missiles: 0, hasNuclearTech: false, isReady: false, ownerId: null, regions: initialRegions([['КИЕВ', 82, 'kyiv_city'], ['ХАРЬКОВ', 78, 'kharkiv_city'], ['ОДЕССА', 70, 'odesa_city'], ['ДНЕПР', 61, 'dnipro_city']]), color: 'bg-yellow-400 text-blue-900' },
      austria: { id: 'austria', name: 'АВСТРИЯ', flag: '🇦🇹', money: 1000, missiles: 0, hasNuclearTech: false, isReady: false, ownerId: null, regions: initialRegions([['ВЕНА', 79, 'vienna_city'], ['ЗАЛЬЦБУРГ', 74, 'salzburg_city'], ['ТИРОЛЬ', 71, 'tyrol_landscape'], ['ГРАЦ', 67, 'graz_city']]), color: 'bg-red-700 text-white' }
    };
    for (const key in countries) {
      (countries as any)[key].isActive = true;
      (countries as any)[key].sanctionedBy = [];
      (countries as any)[key].negotiatedWith = [];
      (countries as any)[key].stats = {
        totalIncome: 0,
        ecologyInvestments: 0,
        missilesLaunched: 0
      };
    }
    return countries;
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

  const gameState = {
    round: 1,
    ecology: 90,
    ecologyHistory: [90],
    status: 'waiting' as 'waiting' | 'playing' | 'round_end' | 'finished',
    roundEndTime: null as number | null,
    countries: createInitialCountries(),
    logs: [] as string[],
    orders: {} as Record<string, any>,
    lastRoundOrders: {} as Record<string, any>,
    negotiations: [] as Negotiation[],
    bombingsLastRound: [] as BombingResult[],
    roundResults: {} as Record<number, any[]>,
    adminCalls: [] as string[]
  };

  function broadcastState() {
    io.sockets.sockets.forEach((socket) => {
      const safeState = {
        ...gameState,
        countries: Object.fromEntries(
          Object.entries(gameState.countries).map(([id, c]) => {
            const isOwner = (c as any).ownerId === socket.id;
            return [
              id,
              { 
                ...c, 
                password: undefined, 
                hasPassword: !!(c as any).password,
                regions: (c as any).regions.map((r: any) => ({
                  ...r,
                  shield: isOwner ? r.shield : false
                }))
              }
            ];
          })
        )
      };
      socket.emit('gameState', safeState);
    });
  }

  function addLog(msg: string) {
    gameState.logs.push(`[Раунд ${gameState.round}] ${msg}`);
    if (gameState.logs.length > 50) gameState.logs.shift();
  }

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    const safeState = {
      ...gameState,
      countries: Object.fromEntries(
        Object.entries(gameState.countries).map(([id, c]) => [
          id,
          { 
            ...c, 
            password: undefined, 
            hasPassword: !!(c as any).password,
            regions: (c as any).regions.map((r: any) => ({
              ...r,
              shield: false
            }))
          }
        ])
      )
    };
    socket.emit('gameState', safeState);

    socket.on('joinCountry', (countryId, password, playerToken, role) => {
      const country = gameState.countries[countryId as keyof typeof gameState.countries] as any;
      if (country) {
        // Password check applies to EVERYONE (president and citizen)
        // Exception: if the player is already the president and reconnecting with the same token
        const isReconnectingPresident = country.ownerId === socket.id || country.playerToken === playerToken;
        
        if (country.password && country.password !== password && !isReconnectingPresident) {
          socket.emit('error', 'Неверный пароль для этой страны.');
          return;
        }

        if (role === 'president') {
          if (country.ownerId && country.ownerId !== socket.id && country.playerToken !== playerToken) {
            socket.emit('error', 'Должность президента уже занята.');
            return;
          }
          country.ownerId = socket.id;
          country.playerToken = playerToken;
          addLog(`Президент присоединился к ${country.name}`);
        } else {
          addLog(`Гражданин присоединился к ${country.name}`);
        }
        
        socket.emit('joinSuccess', { countryId, role });
        broadcastState();
      }
    });

    socket.on('leaveCountry', () => {
      Object.values(gameState.countries).forEach(c => {
        if (c.ownerId === socket.id) {
          c.ownerId = null;
          addLog(`Игрок покинул страну ${c.name}.`);
        }
      });
      broadcastState();
    });

    socket.on('setCountryPassword', (countryId, password) => {
      const country = gameState.countries[countryId as keyof typeof gameState.countries] as any;
      if (country) {
        country.password = password;
        broadcastState();
      }
    });

    socket.on('toggleCountryActive', (countryId, isActive) => {
      const country = gameState.countries[countryId as keyof typeof gameState.countries] as any;
      if (country) {
        country.isActive = isActive;
        if (!isActive) {
          country.ownerId = null;
          country.isReady = false;
        }
        broadcastState();
      }
    });

    socket.on('submitTurn', ({ countryId, orders }) => {
      const country = gameState.countries[countryId as keyof typeof gameState.countries];
      if (!country || country.ownerId !== socket.id || country.isReady || gameState.status !== 'playing') return;

      const existingTransfers = gameState.orders[countryId]?.transfers || {};
      gameState.orders[countryId] = { ...orders, transfers: existingTransfers };
      country.isReady = true;
      addLog(`${country.name} отдал(а) приказы.`);
      
      const claimed = Object.values(gameState.countries).filter(c => c.ownerId);
      broadcastState();
    });

    socket.on('transferMoney', (countryId: string, toCountryId: string, amount: number) => {
      if (gameState.status !== 'playing') return;
      
      const sender = gameState.countries[countryId as keyof typeof gameState.countries];
      const target = gameState.countries[toCountryId as keyof typeof gameState.countries];
      
      if (sender && target && sender.ownerId === socket.id && amount > 0 && sender.money >= amount) {
        sender.money -= amount;
        target.money += amount;
        
        if (!gameState.orders[countryId]) {
          gameState.orders[countryId] = { transfers: {} };
        }
        if (!gameState.orders[countryId].transfers) {
          gameState.orders[countryId].transfers = {};
        }
        
        gameState.orders[countryId].transfers[toCountryId] = 
          (gameState.orders[countryId].transfers[toCountryId] || 0) + amount;
          
        addLog(`${sender.name} перевел ${amount}$ стране ${target.name}.`);
        if (target.ownerId) {
          io.to(target.ownerId).emit('moneyReceived', { from: sender.name, amount });
        }
        broadcastState();
      }
    });

    socket.on('callAdmin', (countryId: string) => {
      if (!gameState.adminCalls.includes(countryId)) {
        gameState.adminCalls.push(countryId);
        broadcastState();
      }
    });

    socket.on('dismissAdminCall', (countryId: string) => {
      gameState.adminCalls = gameState.adminCalls.filter(id => id !== countryId);
      broadcastState();
    });

    socket.on('adminStart', () => {
      gameState.status = 'playing';
      gameState.roundEndTime = Date.now() + 14 * 60 * 1000; // 14 minutes
      gameState.ecologyHistory = [gameState.ecology];
      addLog('Игра началась!');
      broadcastState();
    });

    socket.on('adminNextRound', () => {
      if (gameState.status === 'playing') {
        advanceRound();
      } else if (gameState.status === 'round_end') {
        continueGame();
      }
    });

    socket.on('adminReset', () => {
      gameState.round = 1;
      gameState.ecology = 90;
      gameState.ecologyHistory = [90];
      gameState.status = 'waiting';
      gameState.roundEndTime = null;
      gameState.logs = [];
      gameState.orders = {};
      gameState.lastRoundOrders = {};
      gameState.negotiations = [];
      gameState.bombingsLastRound = [];
      gameState.roundResults = {};
      gameState.countries = createInitialCountries();
      addLog('Игра сброшена администратором.');
      broadcastState();
    });

    socket.on('adminModifyMoney', (countryId: string, amount: number) => {
      if (gameState.countries[countryId as keyof typeof gameState.countries] && typeof amount === 'number') {
        gameState.countries[countryId as keyof typeof gameState.countries].money += amount;
        addLog(`Администратор ${amount >= 0 ? 'добавил' : 'отнял'} ${Math.abs(amount)}$ у страны ${gameState.countries[countryId as keyof typeof gameState.countries].name}.`);
        broadcastState();
      }
    });

    socket.on('adminModifyMissiles', (countryId: string, amount: number) => {
      if (gameState.countries[countryId as keyof typeof gameState.countries] && typeof amount === 'number') {
        gameState.countries[countryId as keyof typeof gameState.countries].missiles += amount;
        addLog(`Администратор ${amount >= 0 ? 'добавил' : 'отнял'} ${Math.abs(amount)} ракет у страны ${gameState.countries[countryId as keyof typeof gameState.countries].name}.`);
        broadcastState();
      }
    });

    socket.on('requestNegotiation', (fromCountryId: string, toCountryId: string, playerName: string) => {
      const fromCountry = gameState.countries[fromCountryId as keyof typeof gameState.countries] as any;
      const toCountry = gameState.countries[toCountryId as keyof typeof gameState.countries];
      
      if (fromCountry && toCountry && fromCountry.ownerId === socket.id) {
        if (!fromCountry.negotiatedWith) fromCountry.negotiatedWith = [];
        if (fromCountry.negotiatedWith.includes(toCountryId)) return; // Already negotiated this round
        
        fromCountry.negotiatedWith.push(toCountryId);
        
        gameState.negotiations.push({
          id: Math.random().toString(36).substr(2, 9),
          fromCountryId,
          toCountryId,
          playerName,
          status: 'requested'
        });
        broadcastState();
      }
    });

    socket.on('acceptNegotiation', (negotiationId: string) => {
      const negotiation = gameState.negotiations.find(n => n.id === negotiationId);
      if (negotiation) {
        const toCountry = gameState.countries[negotiation.toCountryId as keyof typeof gameState.countries] as any;
        if (toCountry && toCountry.ownerId === socket.id) {
          negotiation.status = 'accepted';
          broadcastState();
        }
      }
    });

    socket.on('cancelNegotiation', (negotiationId: string) => {
      const negotiation = gameState.negotiations.find(n => n.id === negotiationId);
      if (negotiation) {
        const fromCountry = gameState.countries[negotiation.fromCountryId as keyof typeof gameState.countries] as any;
        if (fromCountry && fromCountry.ownerId === socket.id) {
          gameState.negotiations = gameState.negotiations.filter(n => n.id !== negotiationId);
          broadcastState();
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      Object.values(gameState.countries).forEach(c => {
        if (c.ownerId === socket.id) {
          c.ownerId = null;
          addLog(`Игрок ${c.name} отключился.`);
        }
      });
      broadcastState();
    });
  });

  function advanceRound() {
    addLog(`--- Обработка приказов раунда ${gameState.round} ---`);
    
    // Process all orders simultaneously
    const allOrders = gameState.orders;
    
    // 1. Process development & shields
    Object.entries(allOrders).forEach(([countryId, orders]) => {
      const country = gameState.countries[countryId as keyof typeof gameState.countries];
      
      // Develop
      if (orders.develop) {
        Object.entries(orders.develop).forEach(([rId, isDeveloping]) => {
          const region = country.regions.find(r => r.id === rId);
          if (isDeveloping && country.money >= 150 && region && !region.isDestroyed) {
            country.money -= 150;
            region.development = region.development + 20;
            region.lifeLevel = region.lifeLevel + 5;
          }
        });
      }

      // Shields
      if (orders.shields) {
        Object.entries(orders.shields).forEach(([rId, isBuilding]) => {
          const region = country.regions.find(r => r.id === rId);
          if (isBuilding && country.money >= 300 && region && !region.isDestroyed) {
            country.money -= 300;
            region.shield = true;
          }
        });
      }

      // Nuclear Research
      if (orders.researchNuclear && !country.hasNuclearTech && country.money >= 500) {
        country.money -= 500;
        country.hasNuclearTech = true;
        gameState.ecology = Math.max(0, gameState.ecology - 3);
        addLog(`${country.name} завершил(а) ядерные исследования! Экология планеты ухудшилась на 3%.`);
      }

      // Missiles
      if (orders.missiles > 0 && country.hasNuclearTech) {
        const cost = orders.missiles * 150;
        if (country.money >= cost) {
          country.money -= cost;
          (country as any)._pendingMissiles = orders.missiles;
        }
      }

      // Ecology
      if (orders.ecology && country.money >= 200) {
        country.money -= 200;
        gameState.ecology = Math.min(100, gameState.ecology + 10);
        (country as any).stats.ecologyInvestments += 1;
        addLog(`${country.name} инвестировал(а) в экологию.`);
      }
    });

    // 3. Process bombings
    gameState.bombingsLastRound = [];
    Object.entries(allOrders).forEach(([attackerId, orders]) => {
      const attacker = gameState.countries[attackerId as keyof typeof gameState.countries];
      if (orders.bomb) {
        Object.entries(orders.bomb).forEach(([targetKey, isBombing]) => {
          if (isBombing && attacker.missiles > 0) {
            const [targetCountryId, regionId] = targetKey.split('_');
            const targetCountry = gameState.countries[targetCountryId as keyof typeof gameState.countries];
            if (targetCountry) {
              const region = targetCountry.regions.find(r => r.id === regionId);
              if (region) {
                attacker.missiles -= 1;
                (attacker as any).stats.missilesLaunched += 1;
                gameState.ecology = Math.max(0, gameState.ecology - 3);
                
                if (!region.isDestroyed) {
                  if (region.shield) {
                    region.shield = false;
                    region.lifeLevel = Math.max(0, region.lifeLevel - 5);
                    gameState.bombingsLastRound.push({
                      targetCountryId,
                      regionId,
                      attackerId,
                      result: 'shield_destroyed'
                    });
                    addLog(`${attacker.name} атаковал ${region.name} (${targetCountry.name}), но щит отразил удар! Уровень жизни упал на 5.`);
                  } else {
                    region.lifeLevel = 0;
                    region.development = 0;
                    region.income = 0;
                    region.isDestroyed = true;
                    gameState.bombingsLastRound.push({
                      targetCountryId,
                      regionId,
                      attackerId,
                      result: 'city_hit'
                    });
                    addLog(`ВНИМАНИЕ: ${attacker.name} нанес ядерный удар по ${region.name} (${targetCountry.name})! Город уничтожен!`);
                  }
                } else {
                  gameState.bombingsLastRound.push({
                    targetCountryId,
                    regionId,
                    attackerId,
                    result: 'already_destroyed'
                  });
                  addLog(`${attacker.name} нанес удар по руинам ${region.name} (${targetCountry.name}). Ракеты потрачены впустую.`);
                }
              }
            }
          } else if (isBombing && attacker.missiles <= 0) {
            addLog(`${attacker.name} попытался атаковать, но у него нет ракет!`);
          }
        });
      }
    });

    // 4. Income and Reset
    gameState.ecology = Math.max(0, gameState.ecology - 2); // Ecology naturally degrades slightly
    gameState.ecologyHistory.push(gameState.ecology);
    
    Object.values(gameState.countries).forEach(c => {
      c.isReady = false;
      if ((c as any)._pendingMissiles) {
        c.missiles += (c as any)._pendingMissiles;
        delete (c as any)._pendingMissiles;
      }
      if ((c as any).isActive !== false) {
        // Calculate income based on regions
        let totalIncome = 0;
        c.regions.forEach(r => {
          const effectiveLifeLevel = Math.floor(r.lifeLevel * (gameState.ecology / 100));
          r.income = Math.floor(300 * (r.development / 100) * (effectiveLifeLevel / 100));
          totalIncome += r.income;
        });
        
        // Apply sanctions penalty
        if ((c as any).sanctionedBy && (c as any).sanctionedBy.length > 0) {
          totalIncome = totalIncome * Math.max(0, 1 - 0.10 * (c as any).sanctionedBy.length);
        }
        
        c.money += Math.floor(totalIncome);
        (c as any).stats.totalIncome += Math.floor(totalIncome);
      }
      // Reset sanctions and negotiations for the next round
      (c as any).sanctionedBy = [];
      (c as any).negotiatedWith = [];
    });

    // 5. Process new sanctions
    Object.entries(allOrders).forEach(([countryId, orders]) => {
      if (orders.sanction) {
        Object.entries(orders.sanction).forEach(([targetId, isSanctioned]) => {
          if (isSanctioned) {
            const target = gameState.countries[targetId as keyof typeof gameState.countries] as any;
            if (target) {
              if (!target.sanctionedBy) target.sanctionedBy = [];
              if (!target.sanctionedBy.includes(countryId)) {
                target.sanctionedBy.push(countryId);
                addLog(`${(gameState.countries[countryId as keyof typeof gameState.countries] as any).name} наложил(а) санкции на ${target.name}!`);
              }
            }
          }
        });
      }
    });

    gameState.lastRoundOrders = { ...gameState.orders };
    gameState.orders = {};
    gameState.negotiations = [];
    
    // Save round results
    gameState.roundResults[gameState.round] = Object.values(gameState.countries).map(c => ({
      id: c.id,
      name: c.name,
      flag: (c as any).flag,
      money: c.money,
      missiles: c.missiles,
      avgLifeLevel: Math.round(c.regions.reduce((sum, r) => sum + r.lifeLevel, 0) / c.regions.length),
      totalIncome: c.regions.reduce((sum, r) => sum + r.income, 0),
      orders: gameState.lastRoundOrders[c.id] || null
    }));

    gameState.status = 'round_end';
    gameState.roundEndTime = null;
    addLog(`--- Раунд ${gameState.round} завершен. Ожидание продолжения... ---`);
    broadcastState();
  }

  function continueGame() {
    if (gameState.round >= 6) {
      gameState.status = 'finished';
      addLog('Игра окончена! Прошло 6 раундов.');
      broadcastState();
      return;
    }
    gameState.round += 1;
    gameState.status = 'playing';
    gameState.roundEndTime = Date.now() + 14 * 60 * 1000; // 14 minutes
    addLog(`--- Начинается раунд ${gameState.round} ---`);
    broadcastState();
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
