/**
 * MobileItemsIntegration.js
 * Script de integração para a modal de itens mobile
 * Adiciona um botão para selecionar itens em dispositivos móveis
 */

document.addEventListener('DOMContentLoaded', function() {
    // Verifica se está em um dispositivo móvel
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;

    // Verifica se a modal está disponível
    if (typeof MobileItemsModal === 'undefined') {
        console.error('MobileItemsModal não está carregado');
        return;
    }
    
    // Monitora redimensionamentos para garantir que o botão não seja exibido no desktop
    window.addEventListener('resize', function() {
        const mobileButton = document.querySelector('.mobile-items-button');
        if (mobileButton) {
            mobileButton.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
        }
    });

    // Encontra o container dos resultados de itens
    const itemResultsContainer = document.getElementById('builder-item-results');
    if (!itemResultsContainer) return;

    // Cria o botão para abrir a modal
    const mobileButton = document.createElement('button');
    mobileButton.type = 'button';
    mobileButton.className = 'mobile-items-button';
    mobileButton.innerHTML = '<i class="fas fa-search"></i> SELECIONAR ITENS';
    
    // Encontra o elemento de feedback dos itens
    const itemFeedbackElement = document.getElementById('builder-item-feedback');
    
    // Decide onde inserir o botão (após o feedback ou antes dos resultados)
    if (itemFeedbackElement) {
        // Adiciona o botão após o elemento de feedback
        itemFeedbackElement.parentNode.insertBefore(mobileButton, itemFeedbackElement.nextSibling);
    } else {
        // Adiciona o botão antes do container de resultados
        itemResultsContainer.parentNode.insertBefore(mobileButton, itemResultsContainer);
    }

    // Adiciona evento para abrir a modal ao clicar no botão
    mobileButton.addEventListener('click', function() {
        showMobileItemsModal();
    });
});

/**
 * Abre a modal de seleção de itens
 */
function showMobileItemsModal() {
    // Cria a instância da modal
    const modal = new MobileItemsModal();
    
    // Obtém os itens selecionados do estado global
    const currentSelectedItems = [];
    
    if (window.builderState && window.builderState.items && window.allItems) {
        window.builderState.items.forEach(itemId => {
            const item = window.allItems.find(item => item.id.toString() === itemId.toString());
            if (item) {
                currentSelectedItems.push(item);
            }
        });
    }
    
    // Mostra a modal com os itens selecionados
    modal.show(
        currentSelectedItems,
        function onItemsSelected(selectedItems) {
            // Atualiza em tempo real para exibir os itens selecionados na seção "3. Sua build"
            if (window.builderState) {
                window.builderState.items = selectedItems.map(item => item.id.toString());
                
                // Renderiza a build com os itens selecionados
                if (typeof renderBuildLoadout === 'function') {
                    renderBuildLoadout();
                }
            }
        },
        function onModalClosed(selectedItems) {
            // Callback chamado quando a modal é fechada
            if (window.builderState) {
                // Atualiza o estado global com os IDs dos itens selecionados
                window.builderState.items = selectedItems.map(item => item.id.toString());
                
                // Renderiza a build com os itens selecionados usando funções globais
                if (typeof window.renderBuildLoadout === 'function') {
                    window.renderBuildLoadout();
                } else {
                    console.log('A função renderBuildLoadout não está disponível no escopo global');
                }
                
                // Atualiza a lista de itens para mostrar os selecionados
                if (typeof window.renderItemResults === 'function') {
                    window.renderItemResults();
                }
                
                // Atualiza as estatísticas se necessário
                if (typeof window.updateBuilderStats === 'function') {
                    window.updateBuilderStats();
                }
                
                // Garante que a seção "3. Sua build" esteja visível no modo responsivo
                setTimeout(() => {
                    // Encontra a seção da build de forma mais confiável
                    let loadoutPanel = document.querySelector('.builder-panel-loadout');
                    
                    if (!loadoutPanel) {
                        // Tentativa alternativa: encontrar pelo título
                        const titles = document.querySelectorAll('h3');
                        for (let title of titles) {
                            if (title.textContent.includes('3. Sua build')) {
                                loadoutPanel = title.closest('.builder-panel');
                                break;
                            }
                        }
                    }
                    
                    // Se ainda não encontrou, tenta pelo container dos slots
                    if (!loadoutPanel) {
                        const slotsContainer = document.getElementById('builder-loadout-slots');
                        if (slotsContainer) {
                            loadoutPanel = slotsContainer.closest('.builder-panel');
                        }
                    }
                    
                    if (loadoutPanel && window.innerWidth <= 768) {
                        // Rolagem suave até a seção
                        loadoutPanel.scrollIntoView({behavior: 'smooth', block: 'start'});
                    }
                }, 300); // Dá um tempo para garantir que tudo foi atualizado
            }
        }
    );
}