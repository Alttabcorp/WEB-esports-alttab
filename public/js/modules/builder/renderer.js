// Renderização dos componentes do builder
import { CONFIG, BUILDER_STATS } from '../config.js';
import { 
    getBuilderState, 
    setBuilderState,
    getSelectedChampion, 
    getSelectedItems, 
    getDatasetConfig, 
    getItemDataset 
} from '../data/state.js';
import { computeBuilderStat, formatStatValue } from './calculator.js';
import { addItemToBuild, removeItemFromBuild } from './actions.js';
import { 
    escapeHtml, 
    sanitizeUrlSegment, 
    truncateText, 
    stripHtml, 
    formatGold 
} from '../utils/helpers.js';

export function renderBuilderChampionSummary() {
    const summaryEl = document.getElementById('builder-champion-summary');
    if (!summaryEl) {
        return;
    }

    const champion = getSelectedChampion();
    const datasetConfig = getDatasetConfig();

    if (!champion) {
        summaryEl.innerHTML = '<div class="builder-empty">Nenhum campeão disponível. Verifique o carregamento dos dados.</div>';
        return;
    }

    const imageSrc = `${datasetConfig.championImageBase}${sanitizeUrlSegment(champion.image?.full)}`;

    summaryEl.innerHTML = `
        <div class="builder-champion-card">
            <div class="builder-champion-portrait">
                <img loading="lazy" src="${imageSrc}" alt="${escapeHtml(champion.name)}" onerror="this.onerror=null;this.src='public/images/players/player-top.jpg';">
            </div>
            <div class="builder-champion-info">
                <h3>${escapeHtml(champion.name)}</h3>
                <p class="builder-champion-title">${escapeHtml(champion.title)}</p>
                <div class="builder-champion-tags">
                    ${(champion.tags || []).map(tag => `<span class="data-badge">${escapeHtml(tag)}</span>`).join('')}
                </div>
                ${champion.partype ? `<p class="builder-champion-resource"><i class="fas fa-bolt"></i>${escapeHtml(champion.partype)}</p>` : ''}
            </div>
        </div>
        <p class="builder-champion-blurb">${escapeHtml(truncateText(champion.blurb || '', 200))}</p>
    `;
    
    // Carregar habilidades se ativo
    const builderState = getBuilderState();
    if (builderState.showAbilities && window.championAbilitiesManager) {
        updateChampionAbilities();
    }
}

export function renderBuilderItemResults() {
    const container = document.getElementById('builder-item-results');
    const feedbackEl = document.getElementById('builder-item-feedback');

    if (!container) {
        console.warn('Container builder-item-results não encontrado');
        return;
    }

    const itemDataset = getItemDataset();
    const builderState = getBuilderState();
    const datasetConfig = getDatasetConfig();

    // Verificação de segurança - se não há dados, mostra estado de carregamento
    if (!itemDataset || !Array.isArray(itemDataset) || itemDataset.length === 0) {
        container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Carregando itens...</div>';
        if (feedbackEl) {
            feedbackEl.innerHTML = '<span>Aguardando carregamento dos dados...</span>';
        }
        return;
    }

    const searchValue = document.getElementById('builder-item-search')?.value.trim().toLowerCase() || '';
    const categoryValue = document.getElementById('builder-item-category')?.value || 'all';

    let filtered = itemDataset;

    if (categoryValue !== 'all') {
        filtered = filtered.filter(item => item.tags?.includes(categoryValue));
    }

    if (searchValue) {
        filtered = filtered.filter(item => {
            const description = stripHtml(item.description || '').toLowerCase();
            const fields = [item.name, item.plaintext, description].join(' ').toLowerCase();
            return fields.includes(searchValue);
        });
    }

    const total = filtered.length;
    const limit = CONFIG.BUILDER_ITEM_LIMIT;
    const items = filtered.slice(0, limit);

    if (!items.length) {
        container.innerHTML = '<div class="builder-empty">Nenhum item encontrado. Ajuste a busca ou categoria para continuar.</div>';
        if (feedbackEl) {
            feedbackEl.innerHTML = '<span><strong>0</strong> itens encontrados</span><span>Ajuste os filtros para continuar.</span>';
        }
        return;
    }

    const fragment = document.createDocumentFragment();

    items.forEach(item => {
        const card = document.createElement('article');
        card.className = 'builder-item-card';

        const selectedCount = builderState.items.filter(id => id === item.id).length;
        const buildIsFull = builderState.items.length >= CONFIG.MAX_BUILD_ITEMS;
        const goldDisplay = formatGold(item.gold?.total ?? 0);
        const tagBadges = (item.tags || []).slice(0, 2).map(tag => `<span class="data-badge">${escapeHtml(tag)}</span>`).join('');

        const thumb = document.createElement('div');
        thumb.className = 'builder-item-thumb';
        thumb.innerHTML = `<img loading="lazy" src="${datasetConfig.itemImageBase}${sanitizeUrlSegment(item.image.full)}" alt="${escapeHtml(item.name)}" onerror="this.onerror=null;this.src='public/images/logo-alttab.png';">`;

        const info = document.createElement('div');
        info.className = 'builder-item-info';

        const nameEl = document.createElement('span');
        nameEl.className = 'builder-item-name';
        nameEl.textContent = item.name;

        const metaEl = document.createElement('div');
        metaEl.className = 'builder-item-meta';
        metaEl.innerHTML = `<span class="builder-item-cost">${goldDisplay}</span>${tagBadges}`;

        info.appendChild(nameEl);
        info.appendChild(metaEl);

        if (selectedCount) {
            const selectedBadge = document.createElement('span');
            selectedBadge.className = 'builder-item-selected';
            selectedBadge.innerHTML = `<i class="fas fa-check"></i> Na build (${selectedCount})`;
            info.appendChild(selectedBadge);
            card.classList.add('builder-item-card-active');
        }

        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'builder-item-add';
        addButton.textContent = 'Adicionar';
        addButton.disabled = buildIsFull;
        if (buildIsFull && !selectedCount) {
            addButton.textContent = 'Slots completos';
        }
        addButton.addEventListener('click', () => addItemToBuild(item.id));

        card.appendChild(thumb);
        card.appendChild(info);
        card.appendChild(addButton);

        fragment.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(fragment);

    if (feedbackEl) {
        const buildSlots = `${builderState.items.length}/${CONFIG.MAX_BUILD_ITEMS}`;
        const resultSummary = total > limit
            ? `Mostrando <strong>${items.length}</strong> de <strong>${total}</strong> itens`
            : `<strong>${total}</strong> itens encontrados`;
        const buildSummary = builderState.items.length >= CONFIG.MAX_BUILD_ITEMS
            ? '<span class="builder-item-feedback-warning">Build completa! Remova um item para adicionar outro.</span>'
            : `Build atual: <strong>${buildSlots}</strong>`;

        feedbackEl.innerHTML = `<span>${resultSummary}</span><span>${buildSummary}</span>`;
    }
}

export function renderBuilderLoadout() {
    const container = document.getElementById('builder-loadout-slots');
    const counterEl = document.getElementById('builder-loadout-counter');
    const costEl = document.getElementById('builder-total-cost');

    const builderState = getBuilderState();
    const selectedItems = getSelectedItems();
    const datasetConfig = getDatasetConfig();

    if (counterEl) {
        counterEl.textContent = `${builderState.items.length}/${CONFIG.MAX_BUILD_ITEMS}`;
    }

    if (!container) {
        return;
    }

    container.innerHTML = '';
    if (builderState.items.length > CONFIG.MAX_BUILD_ITEMS) {
        const newItems = builderState.items.slice(0, CONFIG.MAX_BUILD_ITEMS);
        setBuilderState({ items: newItems });
    }

    for (let i = 0; i < CONFIG.MAX_BUILD_ITEMS; i += 1) {
        const slot = document.createElement('div');
        slot.className = 'builder-slot';
        slot.dataset.index = i;

        const item = selectedItems[i];
        if (item) {
            slot.setAttribute('tabindex', '0');
            slot.classList.add('filled');
            slot.innerHTML = `
                <button type="button" class="builder-slot-remove" aria-label="Remover ${escapeHtml(item.name)} da build"><i class="fas fa-times"></i></button>
                <div class="builder-slot-thumb">
                    <img loading="lazy" src="${datasetConfig.itemImageBase}${sanitizeUrlSegment(item.image.full)}" alt="${escapeHtml(item.name)}" onerror="this.onerror=null;this.src='public/images/logo-alttab.png';">
                </div>
                <div class="builder-slot-info">
                    <span class="builder-slot-name">${escapeHtml(item.name)}</span>
                    <span class="builder-slot-gold">${formatGold(item.gold?.total ?? 0)}</span>
                </div>
            `;

            slot.addEventListener('click', () => removeItemFromBuild(i));
            slot.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
                    event.preventDefault();
                    removeItemFromBuild(i);
                }
            });

            const removeBtn = slot.querySelector('.builder-slot-remove');
            removeBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                removeItemFromBuild(i);
            });
        } else {
            slot.setAttribute('tabindex', '-1');
            slot.innerHTML = `
                <span class="builder-slot-index">${i + 1}</span>
                <span class="builder-slot-placeholder">Slot vazio</span>
            `;
        }

        container.appendChild(slot);
    }

    if (costEl) {
        const totalCost = selectedItems.reduce((sum, item) => sum + (item?.gold?.total ?? 0), 0);
        costEl.innerHTML = formatGold(totalCost);
    }
}

export function updateBuilderStats() {
    const container = document.getElementById('builder-stat-rows');
    if (!container) {
        return;
    }

    const champion = getSelectedChampion();
    if (!champion) {
        container.innerHTML = '<div class="builder-empty">Selecione um campeão para visualizar os atributos.</div>';
        return;
    }

    const items = getSelectedItems();

    const rows = BUILDER_STATS.map(definition => {
        const { base, total } = computeBuilderStat(champion, items, definition);
        const delta = total - base;
        const deltaText = formatStatValue(delta, definition, { withSign: true });
        const iconClass = definition.icon ? `fas ${definition.icon}` : 'fas fa-chart-line';

        let deltaBadge;
        if (Math.abs(delta) < 0.0001) {
            deltaBadge = '<span class="stat-delta neutral">Sem bônus</span>';
        } else if (delta > 0) {
            deltaBadge = `<span class="stat-delta positive"><i class="fas fa-arrow-up"></i>${deltaText}</span>`;
        } else {
            deltaBadge = `<span class="stat-delta negative"><i class="fas fa-arrow-down"></i>${deltaText}</span>`;
        }

        return `
            <article class="builder-stat-card">
                <span class="stat-icon"><i class="${iconClass}"></i></span>
                <div class="stat-body">
                    <span class="stat-label">${definition.label}</span>
                    <span class="stat-base">Base: ${formatStatValue(base, definition)}</span>
                </div>
                <div class="stat-values">
                    <span class="stat-total">${formatStatValue(total, definition)}</span>
                    ${deltaBadge}
                </div>
            </article>
        `;
    }).join('');

    container.innerHTML = rows;
}

// Função para atualizar habilidades (placeholder)
function updateChampionAbilities() {
    console.log('updateChampionAbilities chamada do renderer');
}