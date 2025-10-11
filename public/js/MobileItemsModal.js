/**
 * MobileItemsModal.js
 * Modal de seleção de itens para dispositivos móveis
 */
class MobileItemsModal {
    constructor() {
        this.modal = null;
        this.itemsData = [];
        this.filteredItems = [];
        this.selectedItems = [];
        this.maxItems = 6;
        this.searchTerm = '';
        this.onItemSelect = null;
        this.onClose = null;
        this.showingItemDetails = false;
    }

    /**
     * Mostra a modal com itens e configurações
     * @param {Array} selectedItems - Itens já selecionados (opcional)
     * @param {Function} onItemSelect - Callback quando os itens são selecionados
     * @param {Function} onClose - Callback quando a modal é fechada
     */
    show(selectedItems = [], onItemSelect = null, onClose = null) {
        // Salva os callbacks e os itens selecionados
        this.selectedItems = [...selectedItems]; 
        this.onItemSelect = onItemSelect;
        this.onClose = onClose;
        
        // Carrega dados dos itens (usa os globais se disponíveis)
        if (window.allItems && Array.isArray(window.allItems) && window.allItems.length > 0) {
            this.itemsData = window.allItems;
            this.filteredItems = [...this.itemsData];
            this.renderModal();
            this.setupEventListeners();
        } else {
            // Se não tiver dados globais, tenta buscar da API
            this.loadItemsFromAPI()
                .then(() => {
                    this.renderModal();
                    this.setupEventListeners();
                })
                .catch(error => {
                    console.error('Erro ao carregar itens:', error);
                    alert('Não foi possível carregar os itens. Por favor, tente novamente.');
                });
        }
    }

    /**
     * Carrega os dados dos itens da API
     */
    async loadItemsFromAPI() {
        try {
            const version = window.currentVersion || '15.19.1';
            const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/pt_BR/item.json`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Filtra itens válidos (apenas itens compráveis e disponíveis na Summoner's Rift)
            this.itemsData = Object.entries(data.data)
                .map(([id, item]) => ({ id, ...item }))
                .filter(item => 
                    item.gold && 
                    item.gold.purchasable && 
                    item.maps && 
                    item.maps["11"] && 
                    item.image
                );
                
            this.filteredItems = [...this.itemsData];
            
            // Salva os dados globalmente para futuros usos
            if (!window.allItems) {
                window.allItems = this.itemsData;
            }
            
        } catch (error) {
            console.error('Erro ao carregar itens da API:', error);
            throw error;
        }
    }

    /**
     * Renderiza a estrutura da modal
     */
    renderModal() {
        // Remove modal existente, se houver
        if (document.querySelector('.mobile-items-modal')) {
            document.querySelector('.mobile-items-modal').remove();
        }

        // Bloqueia scroll da página
        document.body.style.overflow = 'hidden';
        
        // Cria elemento da modal
        this.modal = document.createElement('div');
        this.modal.className = 'mobile-items-modal';
        
        // Template da modal
        this.modal.innerHTML = `
            <div class="mobile-modal-header">
                <h3>Selecionar Itens</h3>
                <button type="button" class="mobile-modal-close" id="mobile-modal-close">×</button>
            </div>
            
            <div class="mobile-search-container">
                <div class="mobile-search-field">
                    <i class="fas fa-search"></i>
                    <input 
                        type="text" 
                        class="mobile-search-input" 
                        id="mobile-search-input"
                        placeholder="Buscar item por nome..." 
                        autocomplete="off"
                    >
                    <button type="button" class="mobile-search-clear" id="mobile-search-clear">×</button>
                </div>
            </div>
            
            <div class="mobile-items-list" id="mobile-items-list">
                ${this.renderItemsList()}
            </div>
            
            <div class="mobile-modal-footer">
                <div class="mobile-build-status">
                    <span><strong>${this.selectedItems.length}</strong> itens selecionados</span>
                </div>
                <button type="button" class="mobile-done-button" id="mobile-done-button">Concluir</button>
            </div>
        `;
        
        // Adiciona a modal ao DOM
        document.body.appendChild(this.modal);
    }

    /**
     * Gera o HTML para a lista de itens
     */
    renderItemsList() {
        const items = this.filterItems();
        
        // Se não houver itens, mostra mensagem
        if (items.length === 0) {
            return `
                <div class="mobile-empty-state">
                    <div class="mobile-empty-icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <p class="mobile-empty-text">Nenhum item encontrado</p>
                </div>
            `;
        }
        
        // Gera o HTML para cada item
        return items.map(item => {
            const isSelected = this.selectedItems.some(selectedItem => 
                selectedItem.id === item.id
            );
            
            return `
                <div class="mobile-item-card ${isSelected ? 'selected' : ''}" data-item-id="${item.id}">
                    <div class="mobile-item-image">
                        <img src="https://ddragon.leagueoflegends.com/cdn/${window.currentVersion || '15.19.1'}/img/item/${item.image.full}" 
                             alt="${item.name}">
                    </div>
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">${item.name}</div>
                        <div class="mobile-item-meta">
                            <div class="mobile-item-cost">
                                <span>${item.gold.total}</span>
                                <i class="fas fa-coins"></i>
                            </div>
                            ${item.tags && item.tags.length > 0 ? 
                                `<div class="mobile-item-tag">${item.tags[0]}</div>` : ''}
                        </div>
                    </div>
                    <div class="mobile-item-action">
                        <button type="button" class="mobile-item-button ${isSelected ? 'remove' : ''}">
                            ${isSelected ? 'Remover' : 'Adicionar'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Filtra os itens com base na busca
     */
    filterItems() {
        const searchTerm = this.searchTerm.toLowerCase().trim();
        
        if (!searchTerm) {
            return this.itemsData;
        }
        
        return this.itemsData.filter(item => {
            // Busca no nome do item
            if (item.name.toLowerCase().includes(searchTerm)) {
                return true;
            }
            
            // Busca na descrição curta
            if (item.plaintext && item.plaintext.toLowerCase().includes(searchTerm)) {
                return true;
            }
            
            // Busca nas tags
            if (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm))) {
                return true;
            }
            
            return false;
        });
    }
    
    /**
     * Atualiza a lista de itens na UI
     */
    updateItemsList() {
        const listContainer = document.getElementById('mobile-items-list');
        if (listContainer) {
            listContainer.innerHTML = this.renderItemsList();
        }
        
        // Atualiza contadores
        const itemsCount = document.getElementById('items-count');
        if (itemsCount) {
            itemsCount.textContent = this.filterItems().length;
        }
        
        const selectedCount = document.getElementById('selected-count');
        if (selectedCount) {
            selectedCount.textContent = `${this.selectedItems.length}/${this.maxItems}`;
        }
        
        // Atualiza o status na parte inferior da modal
        const buildStatus = document.querySelector('.mobile-build-status');
        if (buildStatus) {
            buildStatus.innerHTML = `<span><strong>${this.selectedItems.length}</strong> itens selecionados</span>`;
        }
        
        // Reconecta os event listeners
        this.setupItemEventListeners();
    }

    /**
     * Configura os event listeners da modal
     */
    setupEventListeners() {
        // Fecha a modal
        document.getElementById('mobile-modal-close').addEventListener('click', () => {
            this.close();
        });
        
        // Botão de concluir
        document.getElementById('mobile-done-button').addEventListener('click', () => {
            this.close(true);
        });
        
        // Input de busca
        const searchInput = document.getElementById('mobile-search-input');
        searchInput.addEventListener('input', () => {
            this.searchTerm = searchInput.value;
            this.updateItemsList();
        });
        
        // Botão para limpar busca
        document.getElementById('mobile-search-clear').addEventListener('click', () => {
            searchInput.value = '';
            this.searchTerm = '';
            this.updateItemsList();
        });
        
        // Event listeners para os itens
        this.setupItemEventListeners();
    }
    
    /**
     * Configura os listeners para cada item na lista
     */
    setupItemEventListeners() {
        // Botões de adicionar/remover
        document.querySelectorAll('.mobile-item-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                
                const itemCard = button.closest('.mobile-item-card');
                const itemId = itemCard.dataset.itemId;
                this.toggleItemSelection(itemId);
            });
        });
        
        // Click no card do item para mostrar detalhes
        document.querySelectorAll('.mobile-item-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Ignora se clicou no botão
                if (e.target.closest('.mobile-item-button')) return;
                
                // Mostra detalhes do item
                const itemId = card.dataset.itemId;
                this.showItemDetails(itemId);
            });
        });
    }
    
    /**
     * Adiciona ou remove um item da seleção
     */
    toggleItemSelection(itemId) {
        // Verifica se o item já está selecionado
        const index = this.selectedItems.findIndex(item => item.id === itemId);
        
        if (index !== -1) {
            // Remove o item
            this.selectedItems.splice(index, 1);
        } else {
            // Verifica se já atingiu o limite de itens
            if (this.selectedItems.length >= this.maxItems) {
                alert(`Você só pode selecionar até ${this.maxItems} itens.`);
                return;
            }
            
            // Adiciona o item
            const item = this.itemsData.find(item => item.id === itemId);
            if (item) {
                this.selectedItems.push(item);
            }
        }
        
        // Atualiza a UI
        this.updateItemsList();
        
        // Chama o callback, se existir
        if (this.onItemSelect) {
            this.onItemSelect(this.selectedItems);
        }
        
        // Atualiza em tempo real a seção "3. Sua build"
        if (window.builderState) {
            window.builderState.items = this.selectedItems.map(item => item.id.toString());
            
            // Renderiza a build com os itens selecionados usando a função global explicitamente
            if (typeof window.renderBuildLoadout === 'function') {
                window.renderBuildLoadout();
            } else {
                console.log('A função renderBuildLoadout não está disponível no escopo global');
            }
        }
    }
    
    /**
     * Exibe os detalhes de um item
     */
    showItemDetails(itemId) {
        const item = this.itemsData.find(item => item.id === itemId);
        if (!item) return;
        
        this.showingItemDetails = true;
        
        // Usa a função global existente se disponível
        if (typeof showItemDetailsModal === 'function') {
            showItemDetailsModal(item);
        } else {
            // Implementação própria
            const detailsModal = document.createElement('div');
            detailsModal.className = 'mobile-item-details-modal';
            detailsModal.style = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(10, 18, 32, 0.95);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            `;
            
            detailsModal.innerHTML = `
                <div style="background: #091428; border-radius: 8px; padding: 20px; width: 100%; max-width: 480px; max-height: 80vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h3 style="margin: 0; font-size: 18px; color: #f0e6d2;">${item.name}</h3>
                        <button id="close-item-details" style="background: none; border: none; color: #f0e6d2; font-size: 24px; cursor: pointer;">×</button>
                    </div>
                    
                    <div style="display: flex; margin-bottom: 20px;">
                        <img src="https://ddragon.leagueoflegends.com/cdn/${window.currentVersion || '15.19.1'}/img/item/${item.image.full}" 
                             alt="${item.name}" style="width: 64px; height: 64px; border-radius: 8px; margin-right: 16px;">
                        <div>
                            <div style="color: #0596aa; font-size: 16px; margin-bottom: 8px;">${item.gold.total} <i class="fas fa-coins"></i></div>
                            ${item.tags ? `<div style="color: #f0e6d2; font-size: 14px;">${item.tags.join(', ')}</div>` : ''}
                        </div>
                    </div>
                    
                    ${item.plaintext ? `<div style="color: #f0e6d2; margin-bottom: 12px; font-size: 16px;">${item.plaintext}</div>` : ''}
                    <div style="color: #ccc; font-size: 15px;">${item.description || ''}</div>
                    
                    ${item.from || item.into ? `
                        <div style="margin-top: 20px; border-top: 1px solid #1e2328; padding-top: 16px;">
                            ${item.from ? `
                                <div style="margin-bottom: 12px;">
                                    <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #f0e6d2;">Construído a partir de:</h4>
                                    <div id="from-items" style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
                                </div>
                            ` : ''}
                            
                            ${item.into ? `
                                <div>
                                    <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #f0e6d2;">Constrói em:</h4>
                                    <div id="into-items" style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
            
            document.body.appendChild(detailsModal);
            
            // Adiciona os itens "construído a partir de"
            if (item.from) {
                const fromContainer = detailsModal.querySelector('#from-items');
                item.from.forEach(fromItemId => {
                    const fromItem = this.itemsData.find(i => i.id === fromItemId);
                    if (fromItem) {
                        const itemDiv = document.createElement('div');
                        itemDiv.style = "text-align: center;";
                        itemDiv.innerHTML = `
                            <img src="https://ddragon.leagueoflegends.com/cdn/${window.currentVersion || '15.19.1'}/img/item/${fromItem.image.full}" 
                                 alt="${fromItem.name}" style="width: 40px; height: 40px; border-radius: 4px;">
                            <div style="font-size: 12px; color: #f0e6d2; margin-top: 4px;">${fromItem.name.length > 10 ? fromItem.name.substring(0, 10) + '...' : fromItem.name}</div>
                        `;
                        fromContainer.appendChild(itemDiv);
                    }
                });
            }
            
            // Adiciona os itens "constrói em"
            if (item.into) {
                const intoContainer = detailsModal.querySelector('#into-items');
                item.into.forEach(intoItemId => {
                    const intoItem = this.itemsData.find(i => i.id === intoItemId);
                    if (intoItem) {
                        const itemDiv = document.createElement('div');
                        itemDiv.style = "text-align: center;";
                        itemDiv.innerHTML = `
                            <img src="https://ddragon.leagueoflegends.com/cdn/${window.currentVersion || '15.19.1'}/img/item/${intoItem.image.full}" 
                                 alt="${intoItem.name}" style="width: 40px; height: 40px; border-radius: 4px;">
                            <div style="font-size: 12px; color: #f0e6d2; margin-top: 4px;">${intoItem.name.length > 10 ? intoItem.name.substring(0, 10) + '...' : intoItem.name}</div>
                        `;
                        intoContainer.appendChild(itemDiv);
                    }
                });
            }
            
            // Fecha a modal de detalhes
            document.getElementById('close-item-details').addEventListener('click', () => {
                detailsModal.remove();
                this.showingItemDetails = false;
            });
        }
    }
    
    /**
     * Fecha a modal e chama o callback se necessário
     */
    close(callCallback = false) {
        // Se estiver mostrando detalhes de um item, não fecha a modal principal
        if (this.showingItemDetails) {
            const detailsModal = document.querySelector('.mobile-item-details-modal');
            if (detailsModal) {
                detailsModal.remove();
                this.showingItemDetails = false;
            }
            return;
        }
        
        // Restaura o scroll da página
        document.body.style.overflow = '';
        
        // Remove a modal
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
        
        // Chama o callback de fechamento, se existir e for solicitado
        if (callCallback && this.onClose) {
            this.onClose(this.selectedItems);
        }
        
        // Rola a tela para a seção "3. Sua build" se houver itens selecionados
        if (this.selectedItems.length > 0) {
            setTimeout(() => {
                // Encontra a seção da build de forma mais confiável
                let buildSection = document.querySelector('.builder-panel-loadout');
                
                if (!buildSection) {
                    // Tentativa alternativa: encontrar pelo título
                    const titles = document.querySelectorAll('h3');
                    for (let title of titles) {
                        if (title.textContent.includes('3. Sua build')) {
                            buildSection = title.closest('.builder-panel');
                            break;
                        }
                    }
                }
                
                // Se ainda não encontrou, tenta pelo container dos slots
                if (!buildSection) {
                    const slotsContainer = document.getElementById('builder-loadout-slots');
                    if (slotsContainer) {
                        buildSection = slotsContainer.closest('.builder-panel');
                    }
                }
                
                if (buildSection) {
                    console.log('Rolando para a seção de build');
                    buildSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    console.log('Não foi possível encontrar a seção de build para rolagem');
                }
            }, 300); // Aumentamos o tempo para garantir que a página já esteja recarregada
        }
    }
}

// Exporta para uso global
window.MobileItemsModal = MobileItemsModal;