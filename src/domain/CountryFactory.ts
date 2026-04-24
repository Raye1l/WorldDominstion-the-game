import { CountryConfig, COUNTRIES_CONFIG, GAME_CONFIG, INITIAL_REGION_DEV_LEVELS } from '../shared/constants';
import { CountryModel } from './Country';
import { RegionModel } from './Region';

export class CountryFactory {
    static createAllCountries(): Record<string, CountryModel> {
        const countries: Record<string, CountryModel> = {};
        for (const config of COUNTRIES_CONFIG) {
            countries[config.id] = CountryFactory.createCountry(config);
        }
        return countries;
    }

    static createCountry(config: CountryConfig): CountryModel {
        const regions = config.regions.map((region, index) => {
            const [name, lifeLevel, imageSeed] = region;
            const keywords = imageSeed.replace(/_/g, ',');
            const hash = name
                .split('')
                .reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const development = INITIAL_REGION_DEV_LEVELS[index] ?? 60;
            const imageUrl = `https://loremflickr.com/400/300/${keywords},city/all?lock=${hash}`;
            return new RegionModel(
                `r${index}`,
                name,
                lifeLevel,
                imageUrl,
                development,
                GAME_CONFIG.INITIAL_ECOLOGY
            );
        });
        return new CountryModel(config.id, config.name, config.flag, config.color, regions);
    }
}
