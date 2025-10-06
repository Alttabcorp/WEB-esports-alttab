/**
 * Funções relacionadas aos itens do builder
 */
import { API_BASE, currentVersion, allItems, builderState } from '../config.js';
import { renderBuildLoadout } from './loadout.js';
import { updateBuilderStats } from '../stats/stats.js';
import { showItemDetailsModal } from '../modals/itemDetails.js';

/**
 * Renderizar lista de itens
 */
export function renderItemResults(items = allItems) {
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
export function addItemToBuild(itemId) {
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
export function removeItemFromBuild(itemId) {
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
 * Configurar categorias de itens
 */
export function setupItemCategories() {
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