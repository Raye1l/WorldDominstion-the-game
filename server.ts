import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server, Socket } from 'socket.io';
import http from 'http';
import path from 'path';
import type { GameOrders, GameState, Negotiation, BombingResult } from './src/shared/types';
import { GAME_CONFIG } from './src/shared/constants';
import { CountryModel } from './src/domain/Country';
import { CountryFactory } from './src/domain/CountryFactory';
import { GameEngine } from './src/game/gameEngine';

type PlayerRole = 'president' | 'citizen';

type ServerState = {
    round: number;
    ecology: number;
    ecologyHistory: number[];
    status: 'waiting' | 'playing' | 'round_end' | 'finished';
    roundEndTime: number | null;
    countries: Record<string, CountryModel>;
    logs: string[];
    orders: Record<string, GameOrders>;
    lastRoundOrders: Record<string, GameOrders>;
    negotiations: Negotiation[];
    bombingsLastRound: BombingResult[];
    roundResults: Record<number, unknown[]>;
    adminCalls: string[];
};

const emptyOrders = (): GameOrders => ({
    develop: {},
    shields: {},
    missiles: 0,
    researchNuclear: false,
    ecology: false,
    transfers: {},
    bomb: {},
    sanction: {},
});

function createInitialServerState(): ServerState {
    return {
        round: 1,
        ecology: GAME_CONFIG.INITIAL_ECOLOGY,
        ecologyHistory: [GAME_CONFIG.INITIAL_ECOLOGY],
        status: 'waiting',
        roundEndTime: null,
        countries: CountryFactory.createAllCountries(),
        logs: [],
        orders: {},
        lastRoundOrders: {},
        negotiations: [],
        bombingsLastRound: [],
        roundResults: {},
        adminCalls: [],
    };
}

async function startServer() {
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server, { cors: { origin: '*' } });
    const PORT = Number(process.env.PORT) || 3000;

    app.use(express.json());

    const state = createInitialServerState();

    function addLog(msg: string): void {
        state.logs.push(`[Раунд ${state.round}] ${msg}`);
        if (state.logs.length > 50) state.logs.shift();
    }

    function serializeState(socketId: string): GameState {
        const countries: Record<string, any> = {};
        for (const [id, model] of Object.entries(state.countries)) {
            const isOwner = model.ownerId === socketId;
            countries[id] = model.toJSON(isOwner);
        }
        return {
            round: state.round,
            ecology: state.ecology,
            ecologyHistory: state.ecologyHistory,
            status: state.status,
            roundEndTime: state.roundEndTime,
            countries,
            logs: state.logs,
            orders: state.orders,
            lastRoundOrders: state.lastRoundOrders,
            negotiations: state.negotiations,
            bombingsLastRound: state.bombingsLastRound,
            roundResults: state.roundResults,
            adminCalls: state.adminCalls,
        };
    }

    function broadcastState(): void {
        for (const [socketId, socket] of io.sockets.sockets) {
            socket.emit('gameState', serializeState(socketId));
        }
    }

    function ensureOrders(countryId: string): GameOrders {
        if (!state.orders[countryId]) {
            state.orders[countryId] = emptyOrders();
        }
        const o = state.orders[countryId];
        if (!o.transfers) o.transfers = {};
        return o;
    }

    function advanceRound(): void {
        addLog(`--- Обработка приказов раунда ${state.round} ---`);

        const report = GameEngine.processRound(state.countries, state.orders, state.ecology);
        for (const line of report.logs) addLog(line);

        state.ecology = report.ecology;
        state.ecologyHistory.push(state.ecology);
        state.bombingsLastRound = report.bombings;

        state.lastRoundOrders = { ...state.orders };
        state.orders = {};
        state.negotiations = [];

        state.roundResults[state.round] = Object.values(state.countries).map(c => ({
            id: c.id,
            name: c.name,
            flag: c.flag,
            money: c.money,
            missiles: c.missiles,
            avgLifeLevel: c.getAverageLifeLevel(state.ecology),
            totalIncome: c.regions.reduce((sum, r) => sum + r.income, 0),
            orders: state.lastRoundOrders[c.id] ?? null,
        }));

        state.status = 'round_end';
        state.roundEndTime = null;
        addLog(`--- Раунд ${state.round} завершен. Ожидание продолжения... ---`);
        broadcastState();
    }

    function continueGame(): void {
        if (state.round >= GAME_CONFIG.MAX_ROUNDS) {
            state.status = 'finished';
            addLog(`Игра окончена! Прошло ${GAME_CONFIG.MAX_ROUNDS} раундов.`);
            broadcastState();
            return;
        }
        state.round += 1;
        state.status = 'playing';
        state.roundEndTime = Date.now() + GAME_CONFIG.ROUND_TIME_MS;
        addLog(`--- Начинается раунд ${state.round} ---`);
        broadcastState();
    }

    io.on('connection', (socket: Socket) => {
        console.log('User connected:', socket.id);
        socket.emit('gameState', serializeState(socket.id));

        socket.on('joinCountry', (
            countryId: string,
            password: string,
            playerToken: string,
            role: PlayerRole
        ) => {
            const country = state.countries[countryId];
            if (!country) return;

            const isReconnectingPresident =
                country.ownerId === socket.id || country.playerToken === playerToken;

            if (country.password && country.password !== password && !isReconnectingPresident) {
                socket.emit('error', 'Неверный пароль для этой страны.');
                return;
            }

            if (role === 'president') {
                if (
                    country.ownerId &&
                    country.ownerId !== socket.id &&
                    country.playerToken !== playerToken
                ) {
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
        });

        socket.on('leaveCountry', () => {
            for (const c of Object.values(state.countries)) {
                if (c.ownerId === socket.id) {
                    c.ownerId = null;
                    addLog(`Игрок покинул страну ${c.name}.`);
                }
            }
            broadcastState();
        });

        socket.on('setCountryPassword', (countryId: string, password: string) => {
            const country = state.countries[countryId];
            if (!country) return;
            country.password = password;
            broadcastState();
        });

        socket.on('toggleCountryActive', (countryId: string, isActive: boolean) => {
            const country = state.countries[countryId];
            if (!country) return;
            country.isActive = isActive;
            if (!isActive) {
                country.ownerId = null;
                country.isReady = false;
            }
            broadcastState();
        });

        socket.on('submitTurn', (payload: { countryId: string; orders: GameOrders }) => {
            const { countryId, orders } = payload;
            const country = state.countries[countryId];
            if (
                !country ||
                country.ownerId !== socket.id ||
                country.isReady ||
                state.status !== 'playing'
            ) {
                return;
            }
            const existingTransfers = state.orders[countryId]?.transfers ?? {};
            state.orders[countryId] = { ...orders, transfers: existingTransfers };
            country.isReady = true;
            addLog(`${country.name} отдал(а) приказы.`);
            broadcastState();
        });

        socket.on('transferMoney', (countryId: string, toCountryId: string, amount: number) => {
            if (state.status !== 'playing') return;
            const sender = state.countries[countryId];
            const target = state.countries[toCountryId];
            if (!sender || !target || sender.ownerId !== socket.id) return;

            if (!sender.transferMoney(target, amount)) return;

            const orders = ensureOrders(countryId);
            orders.transfers![toCountryId] = (orders.transfers![toCountryId] ?? 0) + amount;

            addLog(`${sender.name} перевел ${amount}$ стране ${target.name}.`);
            if (target.ownerId) {
                io.to(target.ownerId).emit('moneyReceived', { from: sender.name, amount });
            }
            broadcastState();
        });

        socket.on('callAdmin', (countryId: string) => {
            if (!state.adminCalls.includes(countryId)) {
                state.adminCalls.push(countryId);
                broadcastState();
            }
        });

        socket.on('dismissAdminCall', (countryId: string) => {
            state.adminCalls = state.adminCalls.filter(id => id !== countryId);
            broadcastState();
        });

        socket.on('adminStart', () => {
            state.status = 'playing';
            state.roundEndTime = Date.now() + GAME_CONFIG.ROUND_TIME_MS;
            state.ecologyHistory = [state.ecology];
            addLog('Игра началась!');
            broadcastState();
        });

        socket.on('adminNextRound', () => {
            if (state.status === 'playing') {
                advanceRound();
            } else if (state.status === 'round_end') {
                continueGame();
            }
        });

        socket.on('adminReset', () => {
            const fresh = createInitialServerState();
            Object.assign(state, fresh);
            addLog('Игра сброшена администратором.');
            broadcastState();
        });

        socket.on('adminModifyMoney', (countryId: string, amount: number) => {
            const country = state.countries[countryId];
            if (!country || typeof amount !== 'number') return;
            country.money += amount;
            const verb = amount >= 0 ? 'добавил' : 'отнял';
            addLog(`Администратор ${verb} ${Math.abs(amount)}$ у страны ${country.name}.`);
            broadcastState();
        });

        socket.on('adminModifyMissiles', (countryId: string, amount: number) => {
            const country = state.countries[countryId];
            if (!country || typeof amount !== 'number') return;
            country.missiles += amount;
            const verb = amount >= 0 ? 'добавил' : 'отнял';
            addLog(`Администратор ${verb} ${Math.abs(amount)} ракет у страны ${country.name}.`);
            broadcastState();
        });

        socket.on('requestNegotiation', (fromCountryId: string, toCountryId: string, playerName: string) => {
            const fromCountry = state.countries[fromCountryId];
            const toCountry = state.countries[toCountryId];
            if (!fromCountry || !toCountry || fromCountry.ownerId !== socket.id) return;
            if (fromCountry.negotiatedWith.includes(toCountryId)) return;
            fromCountry.negotiatedWith.push(toCountryId);
            state.negotiations.push({
                id: Math.random().toString(36).substring(2, 11),
                fromCountryId,
                toCountryId,
                playerName,
                status: 'requested',
            });
            broadcastState();
        });

        socket.on('acceptNegotiation', (negotiationId: string) => {
            const negotiation = state.negotiations.find(n => n.id === negotiationId);
            if (!negotiation) return;
            const toCountry = state.countries[negotiation.toCountryId];
            if (toCountry && toCountry.ownerId === socket.id) {
                negotiation.status = 'accepted';
                broadcastState();
            }
        });

        socket.on('cancelNegotiation', (negotiationId: string) => {
            const negotiation = state.negotiations.find(n => n.id === negotiationId);
            if (!negotiation) return;
            const fromCountry = state.countries[negotiation.fromCountryId];
            if (fromCountry && fromCountry.ownerId === socket.id) {
                state.negotiations = state.negotiations.filter(n => n.id !== negotiationId);
                broadcastState();
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            for (const c of Object.values(state.countries)) {
                if (c.ownerId === socket.id) {
                    c.ownerId = null;
                    addLog(`Игрок ${c.name} отключился.`);
                }
            }
            broadcastState();
        });
    });

    if (process.env.NODE_ENV !== 'production') {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*', (_req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer();
