/**
 * Shared types для сервера и клиента
 * Находится на уровне проекта, доступна обоим
 */

export type Region = {
    id: string;
    name: string;
    development: number;
    lifeLevel: number;
    income: number;
    shield: boolean;
    imageUrl: string;
    isDestroyed?: boolean;
};

export type Country = {
    id: string;
    name: string;
    flag: string;
    money: number;
    missiles: number;
    hasNuclearTech: boolean;
    isReady: boolean;
    ownerId: string | null;
    playerToken?: string;
    password?: string;
    regions: Region[];
    color: string;
    hasPassword?: boolean;
    isActive?: boolean;
    sanctionedBy?: string[];
    negotiatedWith?: string[];
    stats?: {
        totalIncome: number;
        ecologyInvestments: number;
        missilesLaunched: number;
    };
};

export type Negotiation = {
    id: string;
    fromCountryId: string;
    toCountryId: string;
    playerName: string;
    status: 'requested' | 'accepted';
};

export type BombingResult = {
    targetCountryId: string;
    regionId: string;
    attackerId: string;
    result: 'shield_destroyed' | 'city_hit' | 'already_destroyed';
};

export type GameOrders = {
    develop: Record<string, boolean>;
    shields: Record<string, boolean>;
    missiles: number;
    researchNuclear: boolean;
    ecology: boolean;
    transfers?: Record<string, number>;
    bomb: Record<string, boolean>;
    sanction: Record<string, boolean>;
};

export type GameState = {
    round: number;
    ecology: number;
    ecologyHistory: number[];
    status: 'waiting' | 'playing' | 'round_end' | 'finished';
    roundEndTime: number | null;
    countries: Record<string, Country>;
    logs: string[];
    orders: Record<string, GameOrders>;
    lastRoundOrders: Record<string, GameOrders>;
    negotiations: Negotiation[];
    bombingsLastRound: BombingResult[];
    roundResults: Record<number, any[]>;
    adminCalls: string[];
};
