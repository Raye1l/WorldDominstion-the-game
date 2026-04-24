import type { Region } from '../shared/types';
import { GAME_CONFIG } from '../shared/constants';

export class RegionModel {
    id: string;
    name: string;
    development: number;
    lifeLevel: number;
    income: number;
    shield: boolean;
    imageUrl: string;
    isDestroyed: boolean;

    constructor(
        id: string,
        name: string,
        lifeLevel: number,
        imageUrl: string,
        development: number = 60,
        ecologyLevel: number = GAME_CONFIG.INITIAL_ECOLOGY
    ) {
        this.id = id;
        this.name = name;
        this.lifeLevel = lifeLevel;
        this.imageUrl = imageUrl;
        this.development = development;
        this.shield = false;
        this.isDestroyed = false;
        this.income = RegionModel.computeIncome(development, lifeLevel, ecologyLevel);
    }

    static computeIncome(development: number, lifeLevel: number, ecologyLevel: number): number {
        const effectiveLifeLevel = Math.floor(lifeLevel * (ecologyLevel / 100));
        return Math.floor(GAME_CONFIG.REGION_INCOME_BASE * (development / 100) * (effectiveLifeLevel / 100));
    }

    updateIncome(ecologyLevel: number): void {
        if (this.isDestroyed) {
            this.income = 0;
            return;
        }
        this.income = RegionModel.computeIncome(this.development, this.lifeLevel, ecologyLevel);
    }

    develop(): void {
        this.development = Math.min(100, this.development + 20);
        this.lifeLevel = Math.min(100, this.lifeLevel + 5);
    }

    buildShield(): void {
        this.shield = true;
    }

    absorbMissileWithShield(): void {
        this.shield = false;
        this.lifeLevel = Math.max(0, this.lifeLevel - GAME_CONFIG.SHIELD_DAMAGE_REDUCTION);
    }

    destroy(): void {
        this.isDestroyed = true;
        this.lifeLevel = 0;
        this.development = 0;
        this.income = 0;
        this.shield = false;
    }

    canBeDeveloped(): boolean {
        return !this.isDestroyed;
    }

    canHaveShield(): boolean {
        return !this.isDestroyed && !this.shield;
    }

    toJSON(): Region {
        return {
            id: this.id,
            name: this.name,
            development: this.development,
            lifeLevel: this.lifeLevel,
            income: this.income,
            shield: this.shield,
            imageUrl: this.imageUrl,
            isDestroyed: this.isDestroyed,
        };
    }

    static fromJSON(data: Region): RegionModel {
        const region = new RegionModel(data.id, data.name, data.lifeLevel, data.imageUrl, data.development);
        region.shield = data.shield;
        region.isDestroyed = data.isDestroyed ?? false;
        region.income = data.income;
        return region;
    }
}
