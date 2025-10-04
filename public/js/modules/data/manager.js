// Orquestrador principal de dados - API Data Dragon oficial
import { CONFIG } from '../config.js';
import { 
    setDatasetStatus,
    fetchLatestVersion,
    loadCachedDataset,
    saveDatasetCache,
    downloadDatasetViaJson
} from './loader.js';
import { 
    setChampionDataset,
    setItemDataset,
    setDatasetConfig,
    getChampionDataset,
    getItemDataset,
    getDatasetConfig
} from './state.js';

export async function bootstrapDataset() {
    console.log('🌐 Inicializando carregamento da API Data Dragon oficial');
    setDatasetStatus('Consultando versão mais recente da API Data Dragon...');

    let latestVersion;
    try {
        latestVersion = await fetchLatestVersion();
        setDatasetStatus(`Versão mais recente encontrada: ${latestVersion}`);
        console.log(`📡 Versão da API: ${latestVersion}`);
    } catch (error) {
        console.warn('Não foi possível obter a versão mais recente:', error);
        setDatasetStatus('Erro ao consultar versão da API. Tentando cache...', 'error');
    }

    // PRIORIDADE 1: Cache válido
    if (latestVersion) {
        const cachedDataset = loadCachedDataset(latestVersion);
        if (cachedDataset) {
            setDatasetStatus(`Dados em cache carregados (patch ${cachedDataset.version}).`, 'success');
            console.log('💾 Usando dados do cache');
            return cachedDataset;
        }
    }

    // PRIORIDADE 2: Download da API oficial
    if (!latestVersion) {
        throw new Error('Não foi possível determinar a versão da API para download.');
    }

    try {
        setDatasetStatus(`Carregando dados da API Data Dragon (patch ${latestVersion})...`);
        console.log('🔄 Baixando dados da API oficial...');
        const apiDataset = await downloadDatasetViaJson(latestVersion);
        
        if (apiDataset && apiDataset.items && apiDataset.items.length > 0) {
            // Filtrar dados para apenas Summoner's Rift
            const filteredDataset = filterDataForSummonersRift(apiDataset);
            
            setDatasetStatus(`Dados carregados da API oficial (patch ${filteredDataset.version}).`, 'success');
            saveDatasetCache(filteredDataset);
            console.log('✅ Dados da API oficial carregados e filtrados com sucesso');
            return filteredDataset;
        } else {
            throw new Error('Dataset da API não contém dados válidos');
        }
    } catch (error) {
        console.error('❌ Falha ao carregar da API oficial:', error);
        throw new Error(`Não foi possível carregar dados da API Data Dragon: ${error.message}`);
    }
}

function filterDataForSummonersRift(dataset) {
    console.log('🔍 Filtrando dados para Summoner\'s Rift...');
    
    // Filtrar itens relevantes para Summoner's Rift
    const filteredItems = dataset.items.filter(item => {
        // Excluir itens por tags não relevantes
        if (CONFIG.EXCLUDED_ITEM_TAGS.some(tag => item.tags?.includes(tag))) {
            return false;
        }
        
        // Manter apenas itens com maps vazios (todos os mapas) ou que incluam Summoner's Rift
        if (item.maps && Object.keys(item.maps).length > 0) {
            return item.maps['11'] === true; // 11 = Summoner's Rift
        }
        
        return true; // Itens sem restrição de mapa
    });

    console.log(`📊 Filtragem concluída:`, {
        championsOriginal: dataset.champions.length,
        championsFiltered: dataset.champions.length, // Mantemos todos os campeões
        itemsOriginal: dataset.items.length,
        itemsFiltered: filteredItems.length
    });

    return {
        ...dataset,
        items: filteredItems,
        source: 'api-filtered'
    };
}

export function applyDataset(dataset) {
    // Validação de segurança
    if (!dataset || !dataset.champions || !dataset.items) {
        console.error('❌ Dataset inválido recebido:', dataset);
        return;
    }
    
    if (!Array.isArray(dataset.champions) || !Array.isArray(dataset.items)) {
        console.error('❌ Dataset com estrutura inválida:', dataset);
        return;
    }
    
    if (dataset.items.length === 0) {
        console.error('❌ Dataset não contém itens:', dataset);
        return;
    }
    
    setDatasetConfig(dataset);
    setChampionDataset(dataset.champions);
    setItemDataset(dataset.items);

    console.log('📊 Dataset aplicado com sucesso:');
    console.log(`- Fonte: ${dataset.source || 'não especificada'}`);
    console.log(`- Campeões: ${getChampionDataset().length}`);
    console.log(`- Itens: ${getItemDataset().length}`);
    console.log(`- Versão: ${getDatasetConfig().version}`);

    // Dispatcha evento customizado para notificar outros módulos
    const event = new CustomEvent('datasetApplied', {
        detail: { dataset }
    });
    
    document.dispatchEvent(event);
}

export function updateHeroBadges() {
    const patchBadge = document.getElementById('badge-patch');
    const championBadge = document.getElementById('badge-champions');
    const itemBadge = document.getElementById('badge-items');

    const datasetConfig = getDatasetConfig();
    const championDataset = getChampionDataset();
    const itemDataset = getItemDataset();

    if (patchBadge && datasetConfig) {
        patchBadge.textContent = `Patch ${datasetConfig.version}`;
    }

    if (championBadge) {
        championBadge.textContent = `${championDataset.length} campeões`;
    }

    if (itemBadge) {
        itemBadge.textContent = `${itemDataset.length} itens`;
    }

    const datasetStatusEl = document.getElementById('dataset-status');
    if (datasetStatusEl && datasetConfig?.source === 'cache') {
        datasetStatusEl.classList.remove('error');
        datasetStatusEl.classList.add('success');
    }
}