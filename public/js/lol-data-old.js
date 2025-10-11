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
        
        // Exibir skins do campeão
        displayChampionSkins(championData, currentVersion);
        
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
            <button type="button" class="builder-item-details" style="margin-left:0.5rem; background:#233; color:#fff; border:none; border-radius:0.5rem; padding:0.3rem 0.7rem; font-size:0.92rem; cursor:pointer;">Detalhes</button>
        `;
        
        const button = card.querySelector('.builder-item-add');
        button.addEventListener('click', () => {
            if (isSelected) {
                removeItemFromBuild(item.id);
            } else if (!isBuildFull) {
                addItemToBuild(item.id);
            }
        });
        
        const detailsBtn = card.querySelector('.builder-item-details');
        detailsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showItemDetailsModal(item);
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

// Modal de seleção de campeões (matriz)
function showChampionPickerModal(champions) {
    if (document.getElementById('champion-picker-modal')) {
        document.getElementById('champion-picker-modal').style.display = 'flex';
        return;
    }
    const modal = document.createElement('div');
    modal.id = 'champion-picker-modal';
    modal.style = 'display:flex; position:fixed; z-index:9999; left:0; top:0; width:100vw; height:100vh; background:rgba(10,18,32,0.92); align-items:center; justify-content:center;';
    modal.innerHTML = `
      <div style="background:#151c2c; border-radius:1.2rem; padding:2.2rem 2.2rem 1.5rem 2.2rem; min-width:340px; max-width:98vw; max-height:98vh; box-shadow:0 8px 32px #000a; display:flex; flex-direction:column; gap:1.2rem; height:90vh;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem;">
          <h3 style="margin:0; font-size:1.25rem;">Selecionar Campeão</h3>
          <button id="close-champion-picker" style="background:none; border:none; color:#fff; font-size:1.5rem; cursor:pointer;"><i class='fas fa-times'></i></button>
        </div>
        <input id="champion-search-input" type="text" placeholder="Buscar campeão..." style="padding:0.6rem 1rem; border-radius:0.7rem; border:1px solid #233; background:#101624; color:#fff; font-size:1rem; outline:none; margin-bottom:0.7rem;" />
        <div id="champion-table-container" style="flex:1 1 0; min-height:0; height:100%;"></div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('close-champion-picker').onclick = () => {
        modal.style.display = 'none';
    };
    function renderChampionTable(filter = '') {
        const container = document.getElementById('champion-table-container');
        const sorted = [...champions].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        const filtered = filter ? sorted.filter(c => c.name.toLowerCase().includes(filter.toLowerCase())) : sorted;
        if (!filtered.length) {
            container.innerHTML = '<div style="color:#aaa; text-align:center; padding:1.5rem;">Nenhum campeão encontrado</div>';
            return;
        }
        if (filtered.length === 1) {
            container.innerHTML = `<div style='display:flex;justify-content:center;align-items:flex-start;height:100%;padding-top:1.5rem;'>
                <button class="champion-table-btn" data-champ-id="${filtered[0].id}" style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:0.5rem;padding:0.6rem 0.1rem;background:#1e263a;border-radius:0.8rem;border:1px solid #233;cursor:pointer;transition:.2s;outline:none;min-width:0;min-height:0;width:120px;overflow:hidden;box-sizing:border-box;">
                    <img src='${API_BASE}/${currentVersion}/img/champion/${filtered[0].image.full}' alt='${filtered[0].name}' style='width:44px;height:44px;border-radius:0.6rem;background:#222;object-fit:cover;box-shadow:0 2px 8px #0004;'>
                    <span style="color:#fff;font-size:${filtered[0].name.length > 12 ? '0.85rem' : '0.93rem'};font-weight:600;text-align:center;line-height:1.2;white-space:normal;word-break:break-word;max-width:90px;">${filtered[0].name}</span>
                </button>
            </div>`;
        } else {
            let colCount = 3;
            if (filtered.length === 2) colCount = 2;
            container.innerHTML = `<div style="display:grid; grid-template-columns:repeat(${colCount},1fr); gap:1.1rem 0.7rem; max-height:60vh; overflow-y:auto;">${filtered.map(champion => `
                <button class=\"champion-table-btn\" data-champ-id=\"${champion.id}\" style=\"display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:0.5rem;padding:0.6rem 0.1rem;background:#1e263a;border-radius:0.8rem;border:1px solid #233;cursor:pointer;transition:.2s;outline:none;min-width:0;min-height:0;aspect-ratio:1/1;overflow:hidden;box-sizing:border-box;\">\n                    <img src='${API_BASE}/${currentVersion}/img/champion/${champion.image.full}' alt='${champion.name}' style='width:44px;height:44px;border-radius:0.6rem;background:#222;object-fit:cover;box-shadow:0 2px 8px #0004;'>\n                    <span style=\"color:#fff;font-size:${champion.name.length > 12 ? '0.85rem' : '0.93rem'};font-weight:600;text-align:center;line-height:1.2;white-space:normal;word-break:break-word;max-width:90px;\">${champion.name}</span>\n                </button>\n            `).join('')}</div>`;
        }
        container.querySelectorAll('.champion-table-btn').forEach(btn => {
            btn.onclick = () => {
                const champId = btn.getAttribute('data-champ-id');
                const select = document.getElementById('builder-champion-select');
                if (select) select.value = champId;
                modal.style.display = 'none';
                builderState.championId = champId;
                renderChampionSummary(champId);
            };
        });
    }
    document.getElementById('champion-search-input').oninput = (e) => {
        renderChampionTable(e.target.value);
    };
    renderChampionTable();
}

// Substituir select padrão por botão de modal
(function() {
    const select = document.getElementById('builder-champion-select');
    if (!select) return;
    select.style.display = 'none';
    let openBtn = document.getElementById('open-champion-picker');
    if (!openBtn) {
        openBtn = document.createElement('button');
        openBtn.id = 'open-champion-picker';
        openBtn.className = 'builder-stats-tag';
        openBtn.type = 'button';
        openBtn.innerHTML = '<i class="fas fa-user-ninja"></i> Selecionar Campeão';
        select.parentNode.insertBefore(openBtn, select.nextSibling);
    }
    openBtn.onclick = () => showChampionPickerModal(allChampions);
})();

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
        
        // Inicializar sistema de abas e botão de alternar detalhes
        initChampionDetailsTabs();
        initToggleDetailsButton();
        
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

// Modal de detalhes do item
function showItemDetailsModal(item) {
    if (document.getElementById('item-details-modal')) {
        document.getElementById('item-details-modal').remove();
    }
    const modal = document.createElement('div');
    modal.id = 'item-details-modal';
    modal.style = 'display:flex; position:fixed; z-index:9999; left:0; top:0; width:100vw; height:100vh; background:rgba(10,18,32,0.92); align-items:center; justify-content:center;';
    modal.innerHTML = `
      <div style="background:#151c2c; border-radius:1.2rem; padding:2.2rem 2.2rem 1.5rem 2.2rem; min-width:320px; max-width:96vw; max-height:90vh; box-shadow:0 8px 32px #000a; display:flex; flex-direction:column; gap:1.2rem;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem;">
          <h3 style="margin:0; font-size:1.15rem;">${item.name}</h3>
          <button id="close-item-details" style="background:none; border:none; color:#fff; font-size:1.5rem; cursor:pointer;"><i class='fas fa-times'></i></button>
        </div>
        <div style='display:flex;gap:1.2rem;align-items:flex-start;'>
          <img src='${API_BASE}/${currentVersion}/img/item/${item.image.full}' alt='${item.name}' style='width:64px;height:64px;border-radius:0.7rem;background:#222;object-fit:cover;box-shadow:0 2px 8px #0004;'>
          <div style='flex:1;'>
            <div style='color:#fff;font-size:1.01rem;margin-bottom:0.7rem;'>${item.plaintext || ''}</div>
            <div style='color:#bcd; font-size:0.97rem;'>${item.description || ''}</div>
            <div style='color:#aaa; font-size:0.93rem; margin-top:0.7rem;'>Custo: ${item.gold?.total || 0} <i class="fas fa-coins"></i></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('close-item-details').onclick = () => {
        modal.remove();
    };
}

/**
 * Carrega e exibir as skins do campeão selecionado
 * @param {Object} champion - Objeto com dados do campeão
 * @param {string} version - Versão atual da API
 */
function displayChampionSkins(champion, version) {
    if (!champion || !champion.id) {
        showEmptySkinsState("Selecione um campeão para ver as skins disponíveis.");
        return;
    }

    const skinsContainer = document.getElementById('champion-skins-container');
    
    // Limpar conteúdo anterior
    skinsContainer.innerHTML = '';
    
    // Se não tiver skins
    if (!champion.skins || champion.skins.length === 0) {
        showEmptySkinsState("Este campeão não possui skins disponíveis.");
        return;
    }

    // Criar cards para cada skin
    champion.skins.forEach(skin => {
        // Pular a skin padrão (num: 0) que é apenas o campeão base
        if (skin.num === 0) return;

        const skinCard = document.createElement('div');
        skinCard.className = 'champion-skin-card';

        // URL da imagem da skin usando o Data Dragon
        const skinImageUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion.id}_${skin.num}.jpg`;

        skinCard.innerHTML = `
            <div class="champion-skin-image">
                <img src="${skinImageUrl}" alt="${skin.name}" loading="lazy">
            </div>
            <div class="champion-skin-info">
                <div class="champion-skin-name">${skin.name}</div>
                <div class="champion-skin-number">Skin #${skin.num}</div>
            </div>
        `;

        skinsContainer.appendChild(skinCard);
    });
}

/**
 * Exibe estado vazio quando não há skins para mostrar
 * @param {string} message - Mensagem a ser exibida
 */
function showEmptySkinsState(message) {
    const skinsContainer = document.getElementById('champion-skins-container');
    skinsContainer.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-image"></i>
            ${message}
        </div>
    `;
}

/**
 * Inicializa o sistema de abas para alternar entre habilidades e skins
 */
function initChampionDetailsTabs() {
    const tabButtons = document.querySelectorAll('.champion-tab-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remover classe ativa de todos os botões
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Adicionar classe ativa ao botão clicado
            button.classList.add('active');
            
            // Obter o ID da aba que deve ser exibida
            const tabId = button.getAttribute('data-tab');
            
            // Esconder todas as abas
            const tabPanes = document.querySelectorAll('.champion-tab-pane');
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Mostrar a aba selecionada
            document.getElementById(`${tabId}-tab-content`).classList.add('active');
        });
    });
}

/**
 * Adiciona manipulador para o botão de alternar exibição dos detalhes
 */
function initToggleDetailsButton() {
    const toggleButton = document.getElementById('toggle-details');
    const toggleText = document.getElementById('toggle-details-text');
    const detailsContainer = document.getElementById('champion-details-container');
    
    toggleButton.addEventListener('click', () => {
        const isVisible = !detailsContainer.classList.contains('hidden');
        
        if (isVisible) {
            detailsContainer.classList.add('hidden');
            toggleButton.classList.remove('active');
            toggleText.textContent = 'Mostrar';
        } else {
            detailsContainer.classList.remove('hidden');
            toggleButton.classList.add('active');
            toggleText.textContent = 'Ocultar';
        }
    });
}