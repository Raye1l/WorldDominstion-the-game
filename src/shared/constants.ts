/**
 * Shared constants для сервера и клиента
 */

export type CountryRegionConfig = readonly [name: string, lifeLevel: number, imageSeed: string];
export type CountryConfig = {
    readonly id: string;
    readonly name: string;
    readonly flag: string;
    readonly color: string;
    readonly regions: readonly CountryRegionConfig[];
};

export const INITIAL_REGION_DEV_LEVELS = [80, 60, 60, 40] as const;

export const GAME_CONFIG = {
    // Timing
    ROUND_TIME_MS: 14 * 60 * 1000, // 14 minutes

    // Initial values
    INITIAL_MONEY: 1000,
    INITIAL_MISSILES: 0,
    INITIAL_ECOLOGY: 90,

    // Costs
    DEVELOP_COST: 150,
    SHIELD_COST: 300,
    MISSILE_COST: 150,
    NUCLEAR_RESEARCH_COST: 500,
    ECOLOGY_COST: 200,

    // Ecology impact
    ECOLOGY_DAMAGE_PER_BOMB: 3,
    ECOLOGY_DAMAGE_PER_RESEARCH: 3,
    ECOLOGY_DAMAGE_NATURAL: 2,
    ECOLOGY_BONUS_INVESTMENT: 10,

    // Game mechanics
    MAX_ROUNDS: 6,
    REGION_INCOME_BASE: 300,
    SANCTION_PENALTY: 0.10,
    SHIELD_DAMAGE_REDUCTION: 5,

    // Admin
    ADMIN_PASSWORD: 'WoDom2026',
} as const;

export const COUNTRIES_CONFIG = [
    {
        id: 'usa',
        name: 'США',
        flag: '🇺🇸',
        color: 'bg-blue-600 text-white',
        regions: [
            ['ВАШИНГТОН', 86, 'washington_dc'],
            ['НЬЮ-ЙОРК', 77, 'new_york_city'],
            ['ТЕХАС', 68, 'texas_landscape'],
            ['КАЛИФОРНИЯ', 59, 'california_city']
        ]
    },
    {
        id: 'russia',
        name: 'РОССИЯ',
        flag: '🇷🇺',
        color: 'bg-red-600 text-white',
        regions: [
            ['МОСКВА', 95, 'moscow_city'],
            ['САНКТ-ПЕТЕРБУРГ', 80, 'saint_petersburg'],
            ['НОВОСИБИРСК', 63, 'novosibirsk_city'],
            ['КРАСНОДАР', 53, 'krasnodar_city']
        ]
    },
    {
        id: 'china',
        name: 'КИТАЙ',
        flag: '🇨🇳',
        color: 'bg-yellow-500 text-slate-900',
        regions: [
            ['ПЕКИН', 90, 'beijing_city'],
            ['ШАНХАЙ', 80, 'shanghai_skyline'],
            ['СЫЧУАНЬ', 68, 'sichuan_landscape'],
            ['ГУАНДУН', 52, 'guangdong_city']
        ]
    },
    {
        id: 'uk',
        name: 'ВЕЛИКОБРИТАНИЯ',
        flag: '🇬🇧',
        color: 'bg-indigo-800 text-white',
        regions: [
            ['ЛОНДОН', 80, 'london_city'],
            ['БИРМИНГЕМ', 73, 'birmingham_city'],
            ['МАНЧЕСТЕР', 69, 'manchester_city'],
            ['ЭДИНБУРГ', 68, 'edinburgh_city']
        ]
    },
    {
        id: 'germany',
        name: 'ГЕРМАНИЯ',
        flag: '🇩🇪',
        color: 'bg-stone-800 text-white',
        regions: [
            ['БЕРЛИН', 73, 'berlin_city'],
            ['МЮНХЕН', 73, 'munich_city'],
            ['ГАМБУРГ', 73, 'hamburg_city'],
            ['ФРАНКФУРТ', 73, 'frankfurt_city']
        ]
    },
    {
        id: 'france',
        name: 'ФРАНЦИЯ',
        flag: '🇫🇷',
        color: 'bg-blue-400 text-white',
        regions: [
            ['ПАРИЖ', 83, 'paris_city'],
            ['НОРМАНДИЯ', 77, 'normandy_landscape'],
            ['ПРОВАНС', 69, 'provence_landscape'],
            ['БРЕТАНЬ', 62, 'brittany_coast']
        ]
    },
    {
        id: 'japan',
        name: 'ЯПОНИЯ',
        flag: '🇯🇵',
        color: 'bg-white text-red-600',
        regions: [
            ['ТОКИО', 86, 'tokyo_city'],
            ['ОСАКА', 74, 'osaka_city'],
            ['ХОККАЙДО', 68, 'hokkaido_landscape'],
            ['КИОТО', 63, 'kyoto_city']
        ]
    },
    {
        id: 'canada',
        name: 'КАНАДА',
        flag: '🇨🇦',
        color: 'bg-red-500 text-white',
        regions: [
            ['ОТТАВА', 87, 'ottawa_city'],
            ['ТОРОНТО', 76, 'toronto_city'],
            ['КВЕБЕК', 67, 'quebec_city'],
            ['АЛЬБЕРТА', 60, 'alberta_landscape']
        ]
    },
    {
        id: 'iran',
        name: 'ИРАН',
        flag: '🇮🇷',
        color: 'bg-emerald-700 text-white',
        regions: [
            ['ТЕГЕРАН', 80, 'tehran_city'],
            ['ИСФАХАН', 75, 'isfahan_city'],
            ['ШИРАЗ', 69, 'shiraz_city'],
            ['МЕШХЕД', 66, 'mashhad_city']
        ]
    },
    {
        id: 'israel',
        name: 'ИЗРАИЛЬ',
        flag: '🇮🇱',
        color: 'bg-blue-600 text-white',
        regions: [
            ['ИЕРУСАЛИМ', 89, 'jerusalem_city'],
            ['ТЕЛЬ-АВИВ', 78, 'telaviv_city'],
            ['ХАЙФА', 67, 'haifa_city'],
            ['ЭЙЛАТ', 56, 'eilat_city']
        ]
    },
    {
        id: 'north_korea',
        name: 'КНДР',
        flag: '🇰🇵',
        color: 'bg-red-800 text-white',
        regions: [
            ['ПХЕНЬЯН', 100, 'pyongyang_city'],
            ['ХАМХЫН', 69, 'hamhung_city'],
            ['ЧХОНДЖИН', 63, 'chongjin_city'],
            ['НАМПХО', 58, 'nampo_city']
        ]
    },
    {
        id: 'kazakhstan',
        name: 'КАЗАХСТАН',
        flag: '🇰🇿',
        color: 'bg-cyan-700 text-white',
        regions: [
            ['АСТАНА', 84, 'astana_city'],
            ['АЛМАТЫ', 76, 'almaty_city'],
            ['ШЫМКЕНТ', 68, 'shymkent_city'],
            ['КАРАГАНДА', 63, 'karaganda_city']
        ]
    },
    {
        id: 'ukraine',
        name: 'УКРАИНА',
        flag: '🇺🇦',
        color: 'bg-yellow-400 text-blue-900',
        regions: [
            ['КИЕВ', 82, 'kyiv_city'],
            ['ХАРЬКОВ', 78, 'kharkiv_city'],
            ['ОДЕССА', 70, 'odesa_city'],
            ['ДНЕПР', 61, 'dnipro_city']
        ]
    },
    {
        id: 'austria',
        name: 'АВСТРИЯ',
        flag: '🇦🇹',
        color: 'bg-red-700 text-white',
        regions: [
            ['ВЕНА', 79, 'vienna_city'],
            ['ЗАЛЬЦБУРГ', 74, 'salzburg_city'],
            ['ТИРОЛЬ', 71, 'tyrol_landscape'],
            ['ГРАЦ', 67, 'graz_city']
        ]
    }
] as const;
