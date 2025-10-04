// Configuração e inicialização do builder
import { CONFIG } from '../config.js';
import { getBuilderState, setBuilderState, getChampionDataset, getItemDataset, findChampionById, getSelectedChampion, getSelectedItems } from '../data/state.js';
import { debounce } from '../utils/helpers.js';
import { renderBuilderChampionSummary, renderBuilderItemResults, renderBuilderLoadout, updateBuilderStats } from './renderer.js';

function computeScaledStat(base, perLevel, level) {
    return (base || 0) + (perLevel || 0) * (level - 1);
}

// Função local para popular categorias de itens (evita dependência circular)
function populateItemCategories(select, dataset) {
    if (!select) {
        return;
    }

    select.innerHTML = '<option value="all">Todas</option>';

    const categories = new Set();
    dataset.forEach(item => {
        (item.tags || []).forEach(tag => categories.add(tag));
    });

    const sorted = Array.from(categories).sort((a, b) => a.localeCompare(b));

    sorted.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        select.appendChild(option);
    });
}

export function initializeBuilderSection() {
    const section = document.getElementById('builder');
    if (!section) {
        return;
    }

    const championSelect = document.getElementById('builder-champion-select');
    const itemSearch = document.getElementById('builder-item-search');
    const itemCategory = document.getElementById('builder-item-category');
    const clearButton = document.getElementById('builder-clear');

    const championDataset = getChampionDataset();
    const itemDataset = getItemDataset();
    
    populateBuilderChampionSelect(championSelect, championDataset);

    const builderState = getBuilderState();
    
    if (builderState.championId && !findChampionById(builderState.championId)) {
        setBuilderState({ championId: null });
    }

    if (!builderState.championId && championDataset.length) {
        setBuilderState({ championId: championDataset[0].id });
    }

    if (championSelect) {
        championSelect.value = builderState.championId || '';
        championSelect.disabled = !championDataset.length;
        if (!championSelect.dataset.bound) {
            championSelect.addEventListener('change', (event) => {
                setBuilderState({ championId: event.target.value || null });
                renderBuilderChampionSummary();
                updateBuilderStats();
                // Atualizar habilidades quando campeão mudar
                if (builderState.showAbilities && window.championAbilitiesManager) {
                    updateChampionAbilities();
                }
            });
            championSelect.dataset.bound = 'true';
        }
    }

    if (itemSearch && !itemSearch.dataset.bound) {
        const triggerFilter = debounce(() => renderBuilderItemResults(), 180);
        itemSearch.addEventListener('input', triggerFilter);
        itemSearch.dataset.bound = 'true';
    }

    if (itemCategory) {
        const previousValue = itemCategory.value || 'all';
        populateItemCategories(itemCategory, getItemDataset());
        if (Array.from(itemCategory.options).some(option => option.value === previousValue)) {
            itemCategory.value = previousValue;
        } else {
            itemCategory.value = 'all';
        }

        if (!itemCategory.dataset.bound) {
            itemCategory.addEventListener('change', () => renderBuilderItemResults());
            itemCategory.dataset.bound = 'true';
        }
    }

    if (clearButton && !clearButton.dataset.bound) {
        clearButton.addEventListener('click', () => {
            setBuilderState({ items: [] });
            renderBuilderLoadout();
            updateBuilderStats();
            renderBuilderItemResults();
        });
        clearButton.dataset.bound = 'true';
    }

    // Filtrar itens inválidos
    const validItems = builderState.items.filter(id => Boolean(findItemById(id)));
    setBuilderState({ items: validItems });

    renderBuilderChampionSummary();
    renderBuilderLoadout();
    updateBuilderStats();
    renderBuilderItemResults();
    
    // Configurar toggle das habilidades na seção separada
    const toggleBtn = document.getElementById('toggle-abilities');
    if (toggleBtn && !toggleBtn.dataset.bound) {
        toggleBtn.addEventListener('click', toggleChampionAbilities);
        toggleBtn.dataset.bound = 'true';
    }
    
    // Carregar habilidades inicial se ativo
    if (builderState.showAbilities && window.championAbilitiesManager) {
        updateChampionAbilities();
    }
}

function populateBuilderChampionSelect(select, dataset) {
    if (!select) {
        return;
    }

    const previous = select.value;
    select.innerHTML = '';

    const sorted = [...dataset].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    sorted.forEach(champion => {
        const option = document.createElement('option');
        option.value = champion.id;
        option.textContent = champion.name;
        select.appendChild(option);
    });

    if (previous && sorted.some(champion => champion.id === previous)) {
        select.value = previous;
    } else if (sorted.length) {
        select.value = sorted[0].id;
    } else {
        select.value = '';
    }
}

function toggleChampionAbilities() {
    const builderState = getBuilderState();
    const newShowAbilities = !builderState.showAbilities;
    setBuilderState({ showAbilities: newShowAbilities });
    
    const toggleBtn = document.getElementById('toggle-abilities');
    const toggleText = document.getElementById('toggle-abilities-text');
    const container = document.getElementById('champion-abilities-container');
    
    if (toggleBtn) {
        toggleBtn.classList.toggle('active', newShowAbilities);
    }
    
    if (toggleText) {
        toggleText.textContent = newShowAbilities ? 'Ocultar' : 'Mostrar';
    }
    
    if (container) {
        container.style.display = newShowAbilities ? 'block' : 'none';
    }
    
    // Carregar habilidades se estiver ativo
    if (newShowAbilities && window.championAbilitiesManager) {
        updateChampionAbilities();
    }
}

function updateChampionAbilities() {
    const champion = getSelectedChampion();
    console.log('updateChampionAbilities chamada, campeão:', champion?.name);
    
    if (!champion || !window.championAbilitiesManager) {
        console.warn('Campeão ou manager de habilidades não disponível');
        return;
    }
    
    // Calcular stats combinados (campeão base + itens)
    const combinedStats = calculateCombinedChampionStats();
    console.log('Stats combinados calculados:', combinedStats);
    
    // Renderizar habilidades
    window.championAbilitiesManager.renderChampionAbilities(
        champion.id,
        combinedStats,
        '#champion-abilities-container'
    );
}

function calculateCombinedChampionStats() {
    const champion = getSelectedChampion();
    const selectedItems = getSelectedItems();
    
    if (!champion) {
        return {};
    }
    
    // Stats base do campeão (nível 18 para cálculos máximos)
    const level = 18;
    const baseStats = {
        hp: computeScaledStat(champion.stats?.hp, champion.stats?.hpperlevel, level),
        attackdamage: computeScaledStat(champion.stats?.attackdamage, champion.stats?.attackdamageperlevel, level),
        attackdamagebase: champion.stats?.attackdamage || 0,
        abilitypower: 0, // Campeões não têm AP base
        armor: computeScaledStat(champion.stats?.armor, champion.stats?.armorperlevel, level),
        spellblock: computeScaledStat(champion.stats?.spellblock, champion.stats?.spellblockperlevel, level),
        movespeed: champion.stats?.movespeed || 0
    };
    
    // Adicionar stats dos itens
    selectedItems.forEach(item => {
        if (item.stats) {
            // AD
            if (item.stats.FlatPhysicalDamageMod) {
                baseStats.attackdamage += item.stats.FlatPhysicalDamageMod;
            }
            // AP
            if (item.stats.FlatMagicDamageMod) {
                baseStats.abilitypower += item.stats.FlatMagicDamageMod;
            }
            // HP
            if (item.stats.FlatHPPoolMod) {
                baseStats.hp += item.stats.FlatHPPoolMod;
            }
            // Armor
            if (item.stats.FlatArmorMod) {
                baseStats.armor += item.stats.FlatArmorMod;
            }
            // MR
            if (item.stats.FlatSpellBlockMod) {
                baseStats.spellblock += item.stats.FlatSpellBlockMod;
            }
            // MS
            if (item.stats.FlatMovementSpeedMod) {
                baseStats.movespeed += item.stats.FlatMovementSpeedMod;
            }
            if (item.stats.PercentMovementSpeedMod) {
                baseStats.movespeed *= (1 + item.stats.PercentMovementSpeedMod);
            }
        }
    });
    
    return baseStats;
}

function computeScaledStat(base, perLevel, level) {
    return (base || 0) + (perLevel || 0) * (level - 1);
}