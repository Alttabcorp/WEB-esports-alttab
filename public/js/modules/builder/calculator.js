// Calculadora de estatísticas do builder
import { CONFIG, BUILDER_STATS } from '../config.js';
import { getSelectedChampion, getSelectedItems } from '../data/state.js';

export function computeBuilderStat(champion, items, definition) {
    const stats = champion?.stats || {};
    const baseValue = typeof definition.base === 'function'
        ? definition.base(champion)
        : Number(stats[definition.baseKey] ?? definition.baseFallback ?? 0);

    const flatBonus = sumItemStats(items, definition.flatKeys);
    const percentBonus = sumItemStats(items, definition.percentKeys);

    let totalValue;
    if (typeof definition.customCompute === 'function') {
        totalValue = definition.customCompute({
            base: baseValue,
            flat: flatBonus,
            percent: percentBonus,
            champion,
            items
        });
    } else if (definition.mode === 'additive') {
        totalValue = baseValue + flatBonus + percentBonus;
    } else {
        totalValue = (baseValue + flatBonus) * (1 + percentBonus);
    }

    if (!Number.isFinite(totalValue)) {
        totalValue = baseValue;
    }

    return {
        base: baseValue,
        total: totalValue
    };
}

export function sumItemStats(items, keys = []) {
    if (!Array.isArray(keys) || !keys.length) {
        return 0;
    }

    return items.reduce((total, item) => {
        const statBlock = item?.stats || {};
        const delta = keys.reduce((acc, key) => acc + (Number(statBlock[key]) || 0), 0);
        return total + delta;
    }, 0);
}

export function computeChampionBaseAttackSpeed(champion) {
    if (!champion) {
        return 0.625;
    }

    const stats = champion.stats || {};
    if (typeof stats.attackspeed === 'number') {
        return stats.attackspeed;
    }

    const offset = Number(stats.attackspeedoffset || 0);
    const base = 0.625 / (1 + offset);
    return Number.isFinite(base) ? base : 0.625;
}

export function formatStatValue(value, definition, options = {}) {
    const { withSign = false } = options;
    const displayType = definition.display || 'number';
    const numeric = Number(value) || 0;
    const scale = displayType === 'percent' ? 100 : 1;
    const decimals = definition.decimals ?? (displayType === 'attackSpeed' ? 3 : displayType === 'percent' ? 1 : 0);
    const scaledValue = numeric * scale;
    const threshold = displayType === 'attackSpeed' ? 0.005 : (displayType === 'percent' ? 0.05 : 0.05);
    const unit = displayType === 'percent' ? '%' : '';

    if (withSign) {
        if (Math.abs(scaledValue) < threshold) {
            return '';
        }
        const sign = scaledValue > 0 ? '+' : '-';
        const absValue = Math.abs(scaledValue).toLocaleString('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
        return `${sign}${absValue}${unit}`;
    }

    const formatted = scaledValue.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
    return `${formatted}${unit}`;
}