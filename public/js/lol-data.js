/**
 * Sistema principal do lol-data.html
 * Baseado no champions-example.js com adaptações para a estrutura existente
 */

const API_BASE = 'https://ddragon.leagueoflegends.com/cdn';
const LANG = 'pt_BR';
let currentVersion = '15.19.1';
let allChampions = [];
let allItems = [];
let selectedItems = [];
let selectedChampionId = null;
let selectedChampionData = null;

// Estado do builder
const builderState = {
    championId: null,
    items: [],
    maxItems: 6
};

/**
 * Obter versão mais recente do Data Dragon
 */
async function getLatestVersion() {
    try {
        const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
        const versions = await res.json();
        return versions[0];
    } catch (error) {
        console.warn('Erro ao buscar versão mais recente, usando padrão:', currentVersion);
        return currentVersion;
    }
}

/**
 * Obter lista de campeões
 */
async function getChampions(version) {
    const url = `${API_BASE}/${version}/data/${LANG}/champion.json`;
    const res = await fetch(url);
    const data = await res.json();
    return Object.values(data.data);
}

/**
 * Obter detalhes completos de um campeão
 */
async function getChampionDetails(version, champId) {
    const url = `${API_BASE}/${version}/data/${LANG}/champion/${champId}.json`;
    const res = await fetch(url);
    const data = await res.json();
    return data.data[champId];
}

/**
 * Obter lista de itens
 */
async function getItems(version) {
    const url = `${API_BASE}/${version}/data/${LANG}/item.json`;
    const res = await fetch(url);
    const data = await res.json();
    return Object.entries(data.data)
        .map(([id, item]) => ({ id: parseInt(id), ...item }))
        .filter(item => item.gold && item.gold.purchasable && item.image && item.maps && item.maps["11"]);
}

/**
 * Renderizar lista de campeões no select
 */
function renderChampionSelect(champions) {
    const select = document.getElementById('builder-champion-select');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione um campeão</option>';
    
    const sorted = [...champions].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    
    sorted.forEach(champion => {
        const option = document.createElement('option');
        option.value = champion.id;
        option.textContent = champion.name;
        select.appendChild(option);
    });
}

/**
 * Renderizar resumo do campeão selecionado
 */
async function renderChampionSummary(championId) {
    const summaryEl = document.getElementById('builder-champion-summary');
    if (!summaryEl || !championId) {
        if (summaryEl) {
            summaryEl.innerHTML = '<div class="loading-state"><i class="fas fa-user-ninja"></i>Escolha um campeão para começar.</div>';
        }
        return;
    }

    try {
        summaryEl.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i>Carregando campeão...</div>';
        
        const championData = await getChampionDetails(currentVersion, championId);
        selectedChampionData = championData;
        
        const imageUrl = `${API_BASE}/${currentVersion}/img/champion/${championData.image.full}`;
        
        summaryEl.innerHTML = `
            <div class="builder-champion-card">
                <div class="builder-champion-portrait">
                    <img loading="lazy" src="${imageUrl}" alt="${championData.name}" onerror="this.onerror=null;this.src='public/images/logo-alttab.png';">
                </div>
                <div class="builder-champion-info">
                    <h3>${championData.name}</h3>
                    <p class="builder-champion-title">${championData.title}</p>
                    <div class="builder-champion-tags">
                        ${(championData.tags || []).map(tag => `<span class="data-badge">${tag}</span>`).join('')}
                    </div>
                    ${championData.partype ? `<p class="builder-champion-resource"><i class="fas fa-bolt"></i>${championData.partype}</p>` : ''}
                </div>
            </div>
            <p class="builder-champion-blurb">${championData.blurb || championData.lore?.substring(0, 200) + '...' || ''}</p>
        `;
        
        // Atualizar habilidades se o sistema existir
        updateChampionAbilities();
        updateBuilderStats();
        
    } catch (error) {
        console.error('Erro ao carregar campeão:', error);
        summaryEl.innerHTML = '<div class="builder-empty">Erro ao carregar campeão</div>';
    }
}

/**
 * Renderizar lista de itens
 */
function renderItemResults(items = allItems) {
    const container = document.getElementById('builder-item-results');
    const feedbackEl = document.getElementById('builder-item-feedback');
    
    if (!container) return;
    
    const searchValue = document.getElementById('builder-item-search')?.value.trim().toLowerCase() || '';
    const categoryValue = document.getElementById('builder-item-category')?.value || 'all';
    
    // Filtrar itens
    let filtered = items;
    
    if (categoryValue !== 'all') {
        filtered = filtered.filter(item => item.tags?.includes(categoryValue));
    }
    
    if (searchValue) {
        filtered = filtered.filter(item => {
            const searchText = [
                item.name,
                item.plaintext || '',
                (item.description || '').replace(/<[^>]*>/g, '')
            ].join(' ').toLowerCase();
            return searchText.includes(searchValue);
        });
    }
    
    const limit = 20;
    const displayItems = filtered.slice(0, limit);
    
    if (!displayItems.length) {
        container.innerHTML = '<div class="builder-empty">Nenhum item encontrado</div>';
        if (feedbackEl) {
            feedbackEl.innerHTML = '<span><strong>0</strong> itens encontrados</span>';
        }
        return;
    }
    
    container.innerHTML = '';
    
    displayItems.forEach(item => {
        const card = document.createElement('article');
        card.className = 'builder-item-card';
        
        const isSelected = builderState.items.includes(item.id.toString());
        const isBuildFull = builderState.items.length >= builderState.maxItems;
        
        if (isSelected) {
            card.classList.add('builder-item-card-active');
        }
        
        card.innerHTML = `
            <div class="builder-item-thumb">
                <img loading="lazy" src="${API_BASE}/${currentVersion}/img/item/${item.image.full}" 
                     alt="${item.name}" onerror="this.onerror=null;this.src='public/images/logo-alttab.png';">
            </div>
            <div class="builder-item-info">
                <span class="builder-item-name">${item.name}</span>
                <div class="builder-item-meta">
                    <span class="builder-item-cost">${item.gold?.total || 0} <i class="fas fa-coins"></i></span>
                    ${(item.tags || []).slice(0, 2).map(tag => `<span class="data-badge">${tag}</span>`).join('')}
                </div>
                ${isSelected ? '<span class="builder-item-selected"><i class="fas fa-check"></i> Na build</span>' : ''}
            </div>
            <button type="button" class="builder-item-add" ${isBuildFull && !isSelected ? 'disabled' : ''}>
                ${isSelected ? 'Remover' : isBuildFull ? 'Slots completos' : 'Adicionar'}
            </button>
        `;
        
        const button = card.querySelector('.builder-item-add');
        button.addEventListener('click', () => {
            if (isSelected) {
                removeItemFromBuild(item.id);
            } else if (!isBuildFull) {
                addItemToBuild(item.id);
            }
        });
        
        container.appendChild(card);
    });
    
    if (feedbackEl) {
        const total = filtered.length;
        const showing = Math.min(displayItems.length, total);
        const buildSlots = `${builderState.items.length}/${builderState.maxItems}`;
        
        feedbackEl.innerHTML = `
            <span>Mostrando <strong>${showing}</strong> de <strong>${total}</strong> itens</span>
            <span>Build atual: <strong>${buildSlots}</strong></span>
        `;
    }
}

/**
 * Adicionar item à build
 */
function addItemToBuild(itemId) {
    if (builderState.items.length >= builderState.maxItems) return;
    
    const itemIdStr = itemId.toString();
    if (!builderState.items.includes(itemIdStr)) {
        builderState.items.push(itemIdStr);
        renderBuildLoadout();
        renderItemResults();
        updateBuilderStats();
    }
}

/**
 * Remover item da build
 */
function removeItemFromBuild(itemId) {
    const itemIdStr = itemId.toString();
    const index = builderState.items.indexOf(itemIdStr);
    if (index > -1) {
        builderState.items.splice(index, 1);
        renderBuildLoadout();
        renderItemResults();
        updateBuilderStats();
    }
}

/**
 * Renderizar slots da build
 */
function renderBuildLoadout() {
    const container = document.getElementById('builder-loadout-slots');
    const counterEl = document.getElementById('builder-loadout-counter');
    const costEl = document.getElementById('builder-total-cost');
    
    if (counterEl) {
        counterEl.textContent = `${builderState.items.length}/${builderState.maxItems}`;
    }
    
    if (!container) return;
    
    container.innerHTML = '';
    
    // Calcular custo total
    let totalCost = 0;
    const selectedItemsData = builderState.items.map(itemId => {
        const item = allItems.find(i => i.id.toString() === itemId);
        if (item) totalCost += item.gold?.total || 0;
        return item;
    }).filter(Boolean);
    
    if (costEl) {
        costEl.innerHTML = `${totalCost} <i class="fas fa-coins"></i>`;
    }
    
    // Renderizar slots
    for (let i = 0; i < builderState.maxItems; i++) {
        const slot = document.createElement('div');
        slot.className = 'builder-slot';
        
        const item = selectedItemsData[i];
        if (item) {
            slot.classList.add('filled');
            slot.innerHTML = `
                <button type="button" class="builder-slot-remove" aria-label="Remover ${item.name}">
                    <i class="fas fa-times"></i>
                </button>
                <div class="builder-slot-thumb">
                    <img loading="lazy" src="${API_BASE}/${currentVersion}/img/item/${item.image.full}" 
                         alt="${item.name}" onerror="this.onerror=null;this.src='public/images/logo-alttab.png';">
                </div>
                <div class="builder-slot-info">
                    <span class="builder-slot-name">${item.name}</span>
                    <span class="builder-slot-gold">${item.gold?.total || 0} <i class="fas fa-coins"></i></span>
                </div>
            `;
            
            slot.addEventListener('click', () => removeItemFromBuild(item.id));
        } else {
            slot.innerHTML = `
                <span class="builder-slot-index">${i + 1}</span>
                <span class="builder-slot-placeholder">Slot vazio</span>
            `;
        }
        
        container.appendChild(slot);
    }
}

/**
 * Atualizar estatísticas da build
 */
function updateBuilderStats() {
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
function calculateChampionStatsAtLevel(champion, level) {
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
function calculateItemStats() {
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
function combineStats(championStats, itemStats) {
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
function renderStatsTable(container, stats) {
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

/**
 * Configurar categorias de itens
 */
function setupItemCategories() {
    const select = document.getElementById('builder-item-category');
    if (!select) return;
    
    const categories = new Set();
    allItems.forEach(item => {
        if (item.tags) {
            item.tags.forEach(tag => categories.add(tag));
        }
    });
    
    select.innerHTML = '<option value="all">Todas</option>';
    [...categories].sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
}

/**
 * Atualizar habilidades do campeão (se o sistema existir)
 */
function updateChampionAbilities() {
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
 * Configurar event listeners
 */
function setupEventListeners() {
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

/**
 * Atualizar badges do hero
 */
function updateHeroBadges(version, champions, items) {
    const patchBadge = document.getElementById('badge-patch');
    const championBadge = document.getElementById('badge-champions');
    const itemBadge = document.getElementById('badge-items');
    
    if (patchBadge) patchBadge.textContent = `Patch ${version}`;
    if (championBadge) championBadge.textContent = `${champions.length} campeões`;
    if (itemBadge) itemBadge.textContent = `${items.length} itens`;
}

/**
 * Inicialização principal
 */
async function init() {
    try {
        const statusEl = document.getElementById('dataset-status');
        if (statusEl) statusEl.textContent = 'Carregando dados do Data Dragon...';
        
        // Obter versão mais recente
        currentVersion = await getLatestVersion();
        
        // Carregar dados
        const [champions, items] = await Promise.all([
            getChampions(currentVersion),
            getItems(currentVersion)
        ]);
        
        allChampions = champions;
        allItems = items;
        
        // Atualizar interface
        updateHeroBadges(currentVersion, champions, items);
        renderChampionSelect(champions);
        setupItemCategories();
        renderItemResults();
        renderBuildLoadout();
        
        // Configurar event listeners
        setupEventListeners();
        
        if (statusEl) {
            statusEl.textContent = `Dados carregados com sucesso (Patch ${currentVersion})`;
            statusEl.className = 'data-update-status success';
        }
        
        console.log('Lol-data inicializado com sucesso:', {
            version: currentVersion,
            champions: champions.length,
            items: items.length
        });
        
    } catch (error) {
        console.error('Erro ao inicializar lol-data:', error);
        const statusEl = document.getElementById('dataset-status');
        if (statusEl) {
            statusEl.textContent = 'Erro ao carregar dados. Tente recarregar a página.';
            statusEl.className = 'data-update-status error';
        }
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);