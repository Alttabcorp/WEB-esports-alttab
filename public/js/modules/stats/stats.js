/**
 * Funções de cálculo e exibição de estatísticas
 */
import { selectedChampionData, builderState, allItems } from '../config-new.js';

/**
 * Atualizar estatísticas da build
 */
export function updateBuilderStats() {
    const container = document.getElementById('builder-stat-rows');
    if (!container || !selectedChampionData) return;
    
    // Calcular stats do campeão no nível 18
    const level = 18;
    const championStats = calculateChampionStatsAtLevel(selectedChampionData, level);
    
    // Calcular bônus dos itens
    const itemStats = calculateItemStats();
    
    // Combinar stats
    const finalStats = combineStats(championStats, itemStats, window.extendedStatsMode);
    
    // Renderizar tabela
    renderStatsTable(container, finalStats, window.extendedStatsMode);
    
    // Adicionar botão de toggle se não existir
    if (!document.getElementById('toggle-extended-stats')) {
        const statsBoard = container.closest('.builder-stats-board');
        if (statsBoard) {
            const btn = document.createElement('button');
            btn.id = 'toggle-extended-stats';
            btn.className = 'builder-stats-tag';
            btn.type = 'button';
            btn.style.marginLeft = 'auto';
            btn.innerHTML = `<i class="fas fa-layer-group"></i> <span>Versão Estendida</span>`;
            btn.onclick = function() {
                window.extendedStatsMode = !window.extendedStatsMode;
                updateBuilderStats();
                btn.classList.toggle('active', !!window.extendedStatsMode);
                btn.querySelector('span').textContent = window.extendedStatsMode ? 'Versão Resumida' : 'Versão Estendida';
            };
            const header = statsBoard.querySelector('.builder-stats-header');
            if (header) header.appendChild(btn);
        }
    }
}

/**
 * Calcular stats do campeão em determinado nível
 */
export function calculateChampionStatsAtLevel(champion, level) {
    const stats = champion.stats || {};
    
    return {
        hp: (stats.hp || 0) + (stats.hpperlevel || 0) * (level - 1),
        mp: (stats.mp !== undefined ? (stats.mp || 0) + (stats.mpperlevel || 0) * (level - 1) : undefined),
        attackdamage: (stats.attackdamage || 0) + (stats.attackdamageperlevel || 0) * (level - 1),
        abilitypower: 0,
        armor: (stats.armor || 0) + (stats.armorperlevel || 0) * (level - 1),
        spellblock: (stats.spellblock || 0) + (stats.spellblockperlevel || 0) * (level - 1),
        movespeed: stats.movespeed || 0,
        attackspeed: ((stats.attackspeed || 0) * (1 + ((stats.attackspeedperlevel || 0) / 100) * (level - 1))),
        crit: (stats.crit || 0) + (stats.critperlevel || 0) * (level - 1),
        attackrange: stats.attackrange || 0,
        hpregen: (stats.hpregen || 0) + (stats.hpregenperlevel || 0) * (level - 1),
        mpregen: (stats.mpregen !== undefined ? (stats.mpregen || 0) + (stats.mpregenperlevel || 0) * (level - 1) : undefined)
    };
}

/**
 * Calcular stats dos itens
 */
export function calculateItemStats() {
    const stats = {
        hp: 0, attackdamage: 0, abilitypower: 0, armor: 0, 
        spellblock: 0, movespeed: 0, attackspeed: 0, crit: 0
    };
    
    builderState.items.forEach(itemId => {
        const item = allItems.find(i => i.id.toString() === itemId);
        if (item && item.stats) {
            // AD
            if (item.stats.FlatPhysicalDamageMod) {
                stats.attackdamage += item.stats.FlatPhysicalDamageMod;
            }
            // AP
            if (item.stats.FlatMagicDamageMod) {
                stats.abilitypower += item.stats.FlatMagicDamageMod;
            }
            // HP
            if (item.stats.FlatHPPoolMod) {
                stats.hp += item.stats.FlatHPPoolMod;
            }
            // Armor
            if (item.stats.FlatArmorMod) {
                stats.armor += item.stats.FlatArmorMod;
            }
            // MR
            if (item.stats.FlatSpellBlockMod) {
                stats.spellblock += item.stats.FlatSpellBlockMod;
            }
            // MS
            if (item.stats.FlatMovementSpeedMod) {
                stats.movespeed += item.stats.FlatMovementSpeedMod;
            }
            // AS
            if (item.stats.PercentAttackSpeedMod) {
                stats.attackspeed += item.stats.PercentAttackSpeedMod;
            }
            // Crit
            if (item.stats.FlatCritChanceMod) {
                stats.crit += item.stats.FlatCritChanceMod;
            }
        }
    });
    
    return stats;
}

/**
 * Combinar stats do campeão e itens
 */
export function combineStats(championStats, itemStats) {
    const stats = {
        'Vida': Math.round(championStats.hp + itemStats.hp),
        'Dano de Ataque': Math.round((championStats.attackdamage + itemStats.attackdamage) * 10) / 10,
        'Poder de Habilidade': Math.round(itemStats.abilitypower * 10) / 10,
        'Armadura': Math.round((championStats.armor + itemStats.armor) * 10) / 10,
        'Resistência Mágica': Math.round((championStats.spellblock + itemStats.spellblock) * 10) / 10,
        'Velocidade de Movimento': Math.round(championStats.movespeed + itemStats.movespeed),
        'Velocidade de Ataque': Math.round((championStats.attackspeed * (1 + itemStats.attackspeed)) * 1000) / 1000,
        'Chance de Crítico': Math.round(itemStats.crit * 100) + '%'
    };
    
    if (!window.extendedStatsMode) return stats;
    
    // Versão estendida: adicionar atributos extras
    stats['Roubo de Vida'] = (itemStats.lifesteal ? Math.round(itemStats.lifesteal * 1000) / 10 : 0) + '%';
    stats['Onivampirismo'] = (itemStats.omnivamp ? Math.round(itemStats.omnivamp * 1000) / 10 : 0) + '%';
    stats['Penetração de Armadura'] = (itemStats.armorpen ? Math.round(itemStats.armorpen * 100) / 100 : 0);
    stats['Penetração Mágica'] = (itemStats.magicpen ? Math.round(itemStats.magicpen * 100) / 100 : 0);
    stats['Aceleração de Habilidade'] = (itemStats.ah ? Math.round(itemStats.ah) : 0);
    stats['Mana'] = (championStats.mp !== undefined ? Math.round(championStats.mp + (itemStats.mp || 0)) : (itemStats.mp ? Math.round(itemStats.mp) : 0));
    stats['Regeneração de Vida'] = (championStats.hpregen !== undefined ? Math.round(championStats.hpregen + (itemStats.hpregen || 0)) : (itemStats.hpregen ? Math.round(itemStats.hpregen) : 0));
    stats['Regeneração de Mana'] = (championStats.mpregen !== undefined ? Math.round(championStats.mpregen + (itemStats.mpregen || 0)) : (itemStats.mpregen ? Math.round(itemStats.mpregen) : 0));
    
    return stats;
}

/**
 * Renderizar tabela de estatísticas
 */
export function renderStatsTable(container, stats) {
    container.innerHTML = '';
    
    // Mapeamento de ícones para cada estatística
    const statIcons = {
        'Vida': 'fas fa-heart',
        'Dano de Ataque': 'fas fa-sword',
        'Poder de Habilidade': 'fas fa-magic',
        'Armadura': 'fas fa-shield-alt',
        'Resistência Mágica': 'fas fa-shield',
        'Velocidade de Movimento': 'fas fa-running',
        'Velocidade de Ataque': 'fas fa-stopwatch',
        'Chance de Crítico': 'fas fa-crosshairs'
    };
    
    // Calcular valores base para mostrar bônus
    const baseStats = selectedChampionData ? calculateChampionStatsAtLevel(selectedChampionData, 18) : {};
    const itemStats = calculateItemStats();
    
    Object.entries(stats).forEach(([name, value]) => {
        const row = document.createElement('div');
        row.className = 'builder-stat-row';
        
        const icon = statIcons[name] || 'fas fa-chart-bar';
        let baseValue = '';
        let bonusText = '';
        
        // Calcular valores base e bônus para exibição
        switch(name) {
            case 'Vida':
                baseValue = `Base: ${Math.round(baseStats.hp || 0)}`;
                if (itemStats.hp > 0) bonusText = `+${Math.round(itemStats.hp)} dos itens`;
                break;
            case 'Dano de Ataque':
                baseValue = `Base: ${Math.round((baseStats.attackdamage || 0) * 10) / 10}`;
                if (itemStats.attackdamage > 0) bonusText = `+${Math.round(itemStats.attackdamage * 10) / 10} dos itens`;
                break;
            case 'Poder de Habilidade':
                baseValue = `Base: 0.0`;
                if (itemStats.abilitypower > 0) bonusText = `+${Math.round(itemStats.abilitypower * 10) / 10} dos itens`;
                break;
            case 'Armadura':
                baseValue = `Base: ${Math.round((baseStats.armor || 0) * 10) / 10}`;
                if (itemStats.armor > 0) bonusText = `+${Math.round(itemStats.armor * 10) / 10} dos itens`;
                break;
            case 'Resistência Mágica':
                baseValue = `Base: ${Math.round((baseStats.spellblock || 0) * 10) / 10}`;
                if (itemStats.spellblock > 0) bonusText = `+${Math.round(itemStats.spellblock * 10) / 10} dos itens`;
                break;
            case 'Velocidade de Movimento':
                baseValue = `Base: ${Math.round(baseStats.movespeed || 0)}`;
                if (itemStats.movespeed > 0) bonusText = `+${Math.round(itemStats.movespeed)} dos itens`;
                break;
            default:
                baseValue = bonusText || 'Sem bônus';
        }
        
        row.innerHTML = `
            <div class="builder-stat-icon">
                <i class="${icon}"></i>
            </div>
            <div class="builder-stat-content">
                <div class="builder-stat-name">${name}</div>
                <div class="builder-stat-base">${baseValue}</div>
                ${bonusText ? `<div class="builder-stat-bonus">${bonusText}</div>` : ''}
            </div>
            <div class="builder-stat-value">${value}</div>
        `;
        container.appendChild(row);
    });
}