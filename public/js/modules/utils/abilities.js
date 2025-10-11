/**
 * Funções de utilitário para gerenciamento de habilidades do campeão
 */
import { selectedChampionData } from '../config-new.js';
import { calculateChampionStatsAtLevel, calculateItemStats } from '../stats/stats.js';

/**
 * Atualizar habilidades do campeão (se o sistema existir)
 */
export function updateChampionAbilities() {
    if (window.championAbilitiesManager && selectedChampionData) {
        const championStats = calculateChampionStatsAtLevel(selectedChampionData, 18);
        const itemStats = calculateItemStats();
        
        const combinedStats = {
            hp: championStats.hp + itemStats.hp,
            attackdamage: championStats.attackdamage + itemStats.attackdamage,
            attackdamagebase: selectedChampionData.stats?.attackdamage || 0,
            abilitypower: itemStats.abilitypower,
            armor: championStats.armor + itemStats.armor,
            spellblock: championStats.spellblock + itemStats.spellblock,
            movespeed: championStats.movespeed + itemStats.movespeed
        };
        
        window.championAbilitiesManager.renderChampionAbilities(
            selectedChampionData.id,
            combinedStats,
            '#champion-abilities-container'
        );
    }
}

/**
 * Configurar toggle de habilidades
 */
export function setupAbilitiesToggle() {
    const toggleAbilities = document.getElementById('toggle-abilities');
    if (toggleAbilities) {
        toggleAbilities.addEventListener('click', () => {
            const container = document.getElementById('champion-abilities-container');
            const text = document.getElementById('toggle-abilities-text');
            
            if (container.style.display === 'none') {
                container.style.display = 'block';
                text.textContent = 'Ocultar';
                toggleAbilities.classList.add('active');
                updateChampionAbilities();
            } else {
                container.style.display = 'none';
                text.textContent = 'Mostrar';
                toggleAbilities.classList.remove('active');
            }
        });
    }
}