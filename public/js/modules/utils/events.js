/**
 * Configurar ouvintes de eventos
 */
import { builderState } from '../config.js';
import { renderChampionSummary } from '../builder/champion.js';
import { renderItemResults } from '../builder/items.js';
import { renderBuildLoadout } from '../builder/loadout.js';
import { updateBuilderStats } from '../stats/stats.js';
import { setupAbilitiesToggle } from '../utils/abilities.js';
import { hideItemSectionOnMobile, setupInteractiveBuildSlots } from '../builder/loadout.js';
import { showChampionPickerModal } from '../modals/championModal.js';

/**
 * Configurar event listeners
 */
export function setupEventListeners() {
    // Seleção de campeão
    const championSelect = document.getElementById('builder-champion-select');
    if (championSelect) {
        championSelect.addEventListener('change', (e) => {
            builderState.championId = e.target.value;
            renderChampionSummary(e.target.value);
        });
    }
    
    // Busca de itens
    const itemSearch = document.getElementById('builder-item-search');
    if (itemSearch) {
        itemSearch.addEventListener('input', () => {
            renderItemResults();
        });
    }
    
    // Categoria de itens
    const itemCategory = document.getElementById('builder-item-category');
    if (itemCategory) {
        itemCategory.addEventListener('change', () => {
            renderItemResults();
        });
    }
    
    // Limpar build
    const clearButton = document.getElementById('builder-clear');
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            builderState.items = [];
            renderBuildLoadout();
            renderItemResults();
            updateBuilderStats();
        });
    }
    
    // Toggle de habilidades
    setupAbilitiesToggle();
    
    // Responsividade
    window.addEventListener('resize', function() {
        hideItemSectionOnMobile();
        setupInteractiveBuildSlots();
    });
    
    // Inicialização DOM
    document.addEventListener('DOMContentLoaded', function() {
        hideItemSectionOnMobile();
        setupInteractiveBuildSlots();
    });
}