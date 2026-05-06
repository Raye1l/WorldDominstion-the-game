import type { GameOrders, BombingResult } from '../shared/types';
import { GAME_CONFIG } from '../shared/constants';
import { CountryModel } from '../domain/Country';

export type RoundReport = {
    ecology: number;
    bombings: BombingResult[];
    logs: string[];
};

export class GameEngine {
    static processRound(
        countries: Record<string, CountryModel>,
        orders: Record<string, GameOrders>,
        currentEcology: number
    ): RoundReport {
        const logs: string[] = [];
        let ecology = currentEcology;

        this.processInvestments(countries, orders, logs);
        ecology = this.processNuclearResearch(countries, orders, ecology, logs);
        this.processMissileProduction(countries, orders, logs);
        ecology = this.processEcologyInvestments(countries, orders, ecology, logs);

        const bombings = this.processBombings(countries, orders, logs);
        ecology = Math.max(0, ecology - GAME_CONFIG.ECOLOGY_DAMAGE_PER_BOMB * bombings.length);

        ecology = Math.max(0, ecology - GAME_CONFIG.ECOLOGY_DAMAGE_NATURAL);

        this.commitPendingMissiles(countries);
        this.processIncome(countries, ecology, logs);

        this.resetRoundData(countries);
        this.applyNewSanctions(countries, orders, logs);

        return { ecology, bombings, logs };
    }

    private static processInvestments(
        countries: Record<string, CountryModel>,
        orders: Record<string, GameOrders>,
        logs: string[]
    ): void {
        for (const [countryId, o] of Object.entries(orders)) {
            const country = countries[countryId];
            if (!country) continue;

            if (o.develop) {
                for (const [regionId, isDeveloping] of Object.entries(o.develop)) {
                    if (isDeveloping && country.developRegion(regionId)) {
                        const region = country.regions.find(r => r.id === regionId);
                        logs.push(`${country.name} развил(а) регион ${region?.name}`);
                    }
                }
            }

            if (o.shields) {
                for (const [regionId, isBuilding] of Object.entries(o.shields)) {
                    if (isBuilding && country.buildShield(regionId)) {
                        const region = country.regions.find(r => r.id === regionId);
                        logs.push(`${country.name} построил(а) щит на ${region?.name}`);
                    }
                }
            }
        }
    }

    private static processNuclearResearch(
        countries: Record<string, CountryModel>,
        orders: Record<string, GameOrders>,
        ecology: number,
        logs: string[]
    ): number {
        let currentEcology = ecology;
        for (const [countryId, o] of Object.entries(orders)) {
            const country = countries[countryId];
            if (!country || !o.researchNuclear) continue;
            if (country.researchNuclear()) {
                currentEcology = Math.max(0, currentEcology - GAME_CONFIG.ECOLOGY_DAMAGE_PER_RESEARCH);
                logs.push(`${country.name} завершил(а) ядерные исследования! Экология планеты ухудшилась на ${GAME_CONFIG.ECOLOGY_DAMAGE_PER_RESEARCH}%.`);
            }
        }
        return currentEcology;
    }

    private static processMissileProduction(
        countries: Record<string, CountryModel>,
        orders: Record<string, GameOrders>,
        _logs: string[]
    ): void {
        for (const [countryId, o] of Object.entries(orders)) {
            const country = countries[countryId];
            if (!country || !o.missiles || o.missiles <= 0) continue;
            country.queueMissiles(o.missiles);
        }
    }

    private static processEcologyInvestments(
        countries: Record<string, CountryModel>,
        orders: Record<string, GameOrders>,
        ecology: number,
        logs: string[]
    ): number {
        let currentEcology = ecology;
        for (const [countryId, o] of Object.entries(orders)) {
            const country = countries[countryId];
            if (!country || !o.ecology) continue;
            if (country.investInEcology()) {
                currentEcology = Math.min(100, currentEcology + GAME_CONFIG.ECOLOGY_BONUS_INVESTMENT);
                logs.push(`${country.name} инвестировал(а) в экологию.`);
            }
        }
        return currentEcology;
    }

    private static processBombings(
        countries: Record<string, CountryModel>,
        orders: Record<string, GameOrders>,
        logs: string[]
    ): BombingResult[] {
        const bombings: BombingResult[] = [];

        for (const [attackerId, o] of Object.entries(orders)) {
            const attacker = countries[attackerId];
            if (!attacker || !o.bomb) continue;

            for (const [bombKey, isBombing] of Object.entries(o.bomb)) {
                if (!isBombing) continue;

                const [targetCountryId, regionId] = bombKey.split('_');
                const targetCountry = countries[targetCountryId];
                if (!targetCountry) continue;
                const region = targetCountry.regions.find(r => r.id === regionId);
                if (!region) continue;

                if (!attacker.launchMissile()) {
                    logs.push(`${attacker.name} попытался атаковать, но у него нет ракет!`);
                    continue;
                }

                if (region.isDestroyed) {
                    bombings.push({ targetCountryId, regionId, attackerId, result: 'already_destroyed' });
                    logs.push(`${attacker.name} нанес удар по руинам ${region.name} (${targetCountry.name}). Ракеты потрачены впустую.`);
                } else if (region.shield) {
                    region.absorbMissileWithShield();
                    bombings.push({ targetCountryId, regionId, attackerId, result: 'shield_destroyed' });
                    logs.push(`${attacker.name} атаковал ${region.name} (${targetCountry.name}), но щит отразил удар! Уровень жизни упал на ${GAME_CONFIG.SHIELD_DAMAGE_REDUCTION}.`);
                } else {
                    region.destroy();
                    bombings.push({ targetCountryId, regionId, attackerId, result: 'city_hit' });
                    logs.push(`ВНИМАНИЕ: ${attacker.name} нанес ядерный удар по ${region.name} (${targetCountry.name})! Город уничтожен!`);
                }
            }
        }

        return bombings;
    }

    private static commitPendingMissiles(countries: Record<string, CountryModel>): void {
        for (const country of Object.values(countries)) {
            country.commitPendingMissiles();
        }
    }

    private static processIncome(
        countries: Record<string, CountryModel>,
        ecology: number,
        _logs: string[]
    ): void {
        for (const country of Object.values(countries)) {
            if (!country.isActive) continue;
            const gross = country.calculateTotalIncome(ecology);
            const net = country.applySanctionsPenalty(gross);
            country.earn(net);
            country.stats.totalIncome += net;
        }
    }

    private static resetRoundData(countries: Record<string, CountryModel>): void {
        for (const country of Object.values(countries)) {
            country.resetRoundData();
        }
    }

    private static applyNewSanctions(
        countries: Record<string, CountryModel>,
        orders: Record<string, GameOrders>,
        logs: string[]
    ): void {
        for (const [countryId, o] of Object.entries(orders)) {
            if (!o.sanction) continue;
            const source = countries[countryId];
            if (!source) continue;
            for (const [targetId, isSanctioned] of Object.entries(o.sanction)) {
                if (!isSanctioned) continue;
                const target = countries[targetId];
                if (!target) continue;
                if (target.addSanctionFrom(countryId)) {
                    logs.push(`${source.name} наложил(а) санкции на ${target.name}!`);
                }
            }
        }
    }
}
