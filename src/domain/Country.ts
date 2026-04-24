import type { Country } from '../shared/types';
import { RegionModel } from './Region';
import { GAME_CONFIG } from '../shared/constants';

export class CountryModel {
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
    regions: RegionModel[];
    color: string;
    isActive: boolean;
    sanctionedBy: string[];
    negotiatedWith: string[];
    stats: {
        totalIncome: number;
        ecologyInvestments: number;
        missilesLaunched: number;
    };
    pendingMissiles: number;

    constructor(
        id: string,
        name: string,
        flag: string,
        color: string,
        regions: RegionModel[]
    ) {
        this.id = id;
        this.name = name;
        this.flag = flag;
        this.color = color;
        this.money = GAME_CONFIG.INITIAL_MONEY;
        this.missiles = GAME_CONFIG.INITIAL_MISSILES;
        this.hasNuclearTech = false;
        this.isReady = false;
        this.ownerId = null;
        this.regions = regions;
        this.isActive = true;
        this.sanctionedBy = [];
        this.negotiatedWith = [];
        this.stats = { totalIncome: 0, ecologyInvestments: 0, missilesLaunched: 0 };
        this.pendingMissiles = 0;
    }

    canAfford(amount: number): boolean {
        return this.money >= amount;
    }

    spend(amount: number): boolean {
        if (!this.canAfford(amount)) return false;
        this.money -= amount;
        return true;
    }

    earn(amount: number): void {
        this.money += amount;
    }

    calculateTotalIncome(ecologyLevel: number): number {
        let total = 0;
        for (const region of this.regions) {
            region.updateIncome(ecologyLevel);
            total += region.income;
        }
        return total;
    }

    applySanctionsPenalty(income: number): number {
        if (this.sanctionedBy.length === 0) return income;
        const penalty = 1 - GAME_CONFIG.SANCTION_PENALTY * this.sanctionedBy.length;
        return Math.floor(income * Math.max(0, penalty));
    }

    // Queues missile production; actual count added after bombing phase
    queueMissiles(count: number): number {
        if (!this.hasNuclearTech || count <= 0) return 0;
        let built = 0;
        for (let i = 0; i < count; i++) {
            if (!this.canAfford(GAME_CONFIG.MISSILE_COST)) break;
            this.spend(GAME_CONFIG.MISSILE_COST);
            this.pendingMissiles += 1;
            built += 1;
        }
        return built;
    }

    commitPendingMissiles(): number {
        const committed = this.pendingMissiles;
        this.missiles += this.pendingMissiles;
        this.pendingMissiles = 0;
        return committed;
    }

    launchMissile(): boolean {
        if (this.missiles <= 0) return false;
        this.missiles -= 1;
        this.stats.missilesLaunched += 1;
        return true;
    }

    researchNuclear(): boolean {
        if (this.hasNuclearTech || !this.canAfford(GAME_CONFIG.NUCLEAR_RESEARCH_COST)) {
            return false;
        }
        this.spend(GAME_CONFIG.NUCLEAR_RESEARCH_COST);
        this.hasNuclearTech = true;
        return true;
    }

    investInEcology(): boolean {
        if (!this.canAfford(GAME_CONFIG.ECOLOGY_COST)) return false;
        this.spend(GAME_CONFIG.ECOLOGY_COST);
        this.stats.ecologyInvestments += 1;
        return true;
    }

    developRegion(regionId: string): boolean {
        if (!this.canAfford(GAME_CONFIG.DEVELOP_COST)) return false;
        const region = this.regions.find(r => r.id === regionId);
        if (!region || !region.canBeDeveloped()) return false;
        this.spend(GAME_CONFIG.DEVELOP_COST);
        region.develop();
        return true;
    }

    buildShield(regionId: string): boolean {
        if (!this.canAfford(GAME_CONFIG.SHIELD_COST)) return false;
        const region = this.regions.find(r => r.id === regionId);
        if (!region || !region.canHaveShield()) return false;
        this.spend(GAME_CONFIG.SHIELD_COST);
        region.buildShield();
        return true;
    }

    transferMoney(target: CountryModel, amount: number): boolean {
        if (amount <= 0 || !this.canAfford(amount)) return false;
        this.spend(amount);
        target.earn(amount);
        return true;
    }

    addSanctionFrom(sourceId: string): boolean {
        if (this.sanctionedBy.includes(sourceId)) return false;
        this.sanctionedBy.push(sourceId);
        return true;
    }

    getAverageLifeLevel(ecologyLevel: number): number {
        if (this.regions.length === 0) return 0;
        const sum = this.regions.reduce(
            (acc, r) => acc + Math.floor(r.lifeLevel * (ecologyLevel / 100)),
            0
        );
        return Math.round(sum / this.regions.length);
    }

    resetRoundData(): void {
        this.isReady = false;
        this.sanctionedBy = [];
        this.negotiatedWith = [];
    }

    toJSON(isOwner: boolean = false): Country {
        return {
            id: this.id,
            name: this.name,
            flag: this.flag,
            money: this.money,
            missiles: this.missiles,
            hasNuclearTech: this.hasNuclearTech,
            isReady: this.isReady,
            ownerId: this.ownerId,
            hasPassword: !!this.password,
            regions: this.regions.map(r => ({
                ...r.toJSON(),
                shield: isOwner ? r.shield : false,
            })),
            color: this.color,
            isActive: this.isActive,
            sanctionedBy: this.sanctionedBy,
            negotiatedWith: this.negotiatedWith,
            stats: this.stats,
        };
    }
}
