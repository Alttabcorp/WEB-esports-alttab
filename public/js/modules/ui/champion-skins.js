/**
 * Módulo para exibição de skins dos campeões
 * Parte do projeto ALTTAB Esports - Atlas de Dados do League of Legends
 */

/**
 * Carrega e exibir as skins do campeão selecionado
 * @param {Object} champion - Objeto com dados do campeão
 * @param {string} version - Versão atual da API
 */
export function displayChampionSkins(champion, version) {
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
export function initChampionDetailsTabs() {
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
export function initToggleDetailsButton() {
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