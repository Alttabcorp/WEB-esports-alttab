/**
 * Arquivo principal que inicializa o módulo lol-data
 * Importa e coordena todos os outros módulos
 */
import { API_BASE, currentVersion, allChampions, allItems } from './modules/config-new.js';
import { getLatestVersion, getChampions, getItems } from './modules/api/datadragon.js';
import { renderChampionSelect } from './modules/builder/champion.js';
import { setupItemCategories, renderItemResults } from './modules/builder/items.js';
import { renderBuildLoadout, hideItemSectionOnMobile, setupInteractiveBuildSlots } from './modules/builder/loadout.js';
import { setupChampionModal } from './modules/modals/championModal.js';
import { showItemPickerModal, showItemDetailsModal } from './modules/modals/itemModal.js';
import { updateHeroBadges } from './modules/utils/ui.js';
import { setupEventListeners } from './modules/utils/events.js';
import { displayChampionSkins, initChampionDetailsTabs, initToggleDetailsButton } from './modules/ui/champion-skins.js';

// Tornar funções importantes disponíveis globalmente
window.showItemPickerModal = showItemPickerModal;
window.showItemDetailsModal = showItemDetailsModal;
window.displayChampionSkins = displayChampionSkins;

/**
 * Inicialização principal
 */
async function init() {
    try {
        const statusEl = document.getElementById('dataset-status');
        if (statusEl) statusEl.textContent = 'Carregando dados do Data Dragon...';
        
        // Obter versão mais recente
        const version = await getLatestVersion();
        window.currentVersion = version;
        
        // Carregar dados
        const [champions, items] = await Promise.all([
            getChampions(version),
            getItems(version)
        ]);
        
        // Atualizar dados globais
        window.allChampions = champions;
        window.allItems = items;
        
        // Atualizar interface
        updateHeroBadges(version, champions, items);
        renderChampionSelect(champions);
        setupItemCategories();
        renderItemResults();
        renderBuildLoadout();
        setupChampionModal();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Configurar responsividade
        hideItemSectionOnMobile();
        setupInteractiveBuildSlots();
        
        // Inicializar sistema de abas e botão de alternar detalhes
        initChampionDetailsTabs();
        initToggleDetailsButton();
        
        if (statusEl) {
            statusEl.textContent = `Dados carregados com sucesso (Patch ${version})`;
            statusEl.className = 'data-update-status success';
        }
        
        console.log('Lol-data inicializado com sucesso:', {
            version: version,
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