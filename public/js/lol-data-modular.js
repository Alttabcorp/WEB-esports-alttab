// Arquivo principal modular do lol-data
import { CONFIG } from './modules/config.js';
import { setDatasetStatusEl } from './modules/data/state.js';
import { bootstrapDataset, applyDataset, updateHeroBadges } from './modules/data/manager.js';
import { 
    setupNavigation, 
    setupMobileMenu, 
    setupSmoothScrolling, 
    setupBackToTop, 
    showGlobalDatasetError 
} from './modules/ui/navigation.js';
import { initializeBuilderSection } from './modules/builder/setup.js';
import { initializeChampionSection } from './modules/ui/champions.js';
import { initializeItemSection } from './modules/ui/items.js';

// Inicialização principal
document.addEventListener('DOMContentLoaded', () => {
    initLolDataPage();
});

async function initLolDataPage() {
    const datasetStatusEl = document.getElementById('dataset-status');
    setDatasetStatusEl(datasetStatusEl);

    setupNavigation();
    setupMobileMenu();
    setupSmoothScrolling();
    setupBackToTop();

    try {
        const dataset = await bootstrapDataset();
        
        if (dataset && dataset.champions && dataset.items) {
            applyDataset(dataset);
        } else {
            throw new Error('Dataset inválido recebido');
        }
    } catch (error) {
        console.error('Falha crítica ao preparar os dados de LoL:', error);
        setDatasetStatus('Não foi possível carregar os dados do League of Legends. Verifique sua conexão e tente novamente.', 'error');
        showGlobalDatasetError();
    }
}

// Escuta evento de aplicação de dataset para inicializar seções
document.addEventListener('datasetApplied', async (event) => {
    updateHeroBadges();
    initializeBuilderSection();
    
    // Inicializar módulos de UI
    if (document.getElementById('champion-list')) {
        initializeChampionSection();
    }
    
    if (document.getElementById('item-list')) {
        initializeItemSection();
    }
});

function setDatasetStatus(message, state = '') {
    const datasetStatusEl = document.getElementById('dataset-status');
    if (!datasetStatusEl) {
        return;
    }
    datasetStatusEl.textContent = message;
    datasetStatusEl.classList.remove('success', 'error');
    if (state) {
        datasetStatusEl.classList.add(state);
    }
}