// Ações do builder (adicionar/remover itens)
import { CONFIG } from '../config.js';
import { getBuilderState, setBuilderState, findItemById } from '../data/state.js';
import { renderBuilderLoadout, updateBuilderStats, renderBuilderItemResults } from './renderer.js';

export function addItemToBuild(itemId) {
    const builderState = getBuilderState();
    
    if (builderState.items.length >= CONFIG.MAX_BUILD_ITEMS) {
        return;
    }

    const item = findItemById(itemId);
    if (!item) {
        return;
    }

    const newItems = [...builderState.items, String(item.id)];
    setBuilderState({ items: newItems });
    
    renderBuilderLoadout();
    updateBuilderStats();
    renderBuilderItemResults();
    
    // Atualizar habilidades quando itens mudarem
    if (builderState.showAbilities) {
        updateChampionAbilities();
    }
}

export function removeItemFromBuild(index) {
    const builderState = getBuilderState();
    
    if (index < 0 || index >= builderState.items.length) {
        return;
    }

    const newItems = [...builderState.items];
    newItems.splice(index, 1);
    setBuilderState({ items: newItems });
    
    renderBuilderLoadout();
    updateBuilderStats();
    renderBuilderItemResults();
    
    // Atualizar habilidades quando itens mudarem
    if (builderState.showAbilities) {
        updateChampionAbilities();
    }
}

// Função para atualizar habilidades (importada do setup)
function updateChampionAbilities() {
    if (window.championAbilitiesManager) {
        // Esta função será implementada no setup.js
        console.log('Atualizando habilidades após mudança de itens');
    }
}