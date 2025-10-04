// Carregamento de dados da API Data Dragon oficial
import { CONFIG } from '../config.js';

let datasetStatusEl = null;

export function setDatasetStatusEl(element) {
    datasetStatusEl = element;
}

export function setDatasetStatus(message, state = '') {
    console.log(`📊 Status: ${message}`);
    if (!datasetStatusEl) {
        return;
    }
    datasetStatusEl.textContent = message;
    datasetStatusEl.classList.remove('success', 'error');
    if (state) {
        datasetStatusEl.classList.add(state);
    }
}

export async function fetchLatestVersion() {
    console.log('🔍 Buscando versão mais recente da API...');
    const response = await fetch(CONFIG.VERSIONS_URL, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Falha ao buscar versões: ${response.status}`);
    }
    const versions = await response.json();
    return versions[0]; // Primeira versão é a mais recente
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} para ${url}`);
    }
    return response.json();
}

export async function downloadDatasetViaJson(version) {
    console.log(`🌐 Baixando dados da API externa para versão ${version}...`);
    setDatasetStatus(`Baixando dados do patch ${version} da API Data Dragon...`);
    
    try {
        const [championJson, itemJson] = await Promise.all([
            fetchJson(`${CONFIG.CDN_BASE}/${version}/data/${CONFIG.TARGET_LOCALE}/champion.json`, { cache: 'no-store' }),
            fetchJson(`${CONFIG.CDN_BASE}/${version}/data/${CONFIG.TARGET_LOCALE}/item.json`, { cache: 'no-store' })
        ]);
        
        console.log('✅ Dados da API externa carregados com sucesso');
        const dataset = mapDatasetFromResponses(version, championJson, itemJson, { source: 'api' });
        console.log('📊 Dataset da API externa processado:', {
            champions: dataset.champions?.length || 0,
            items: dataset.items?.length || 0,
            version: dataset.version
        });
        
        return dataset;
    } catch (error) {
        console.error('❌ Erro ao carregar da API externa:', error);
        throw error;
    }
}

export function loadCachedDataset(expectedVersion) {
    try {
        const raw = localStorage.getItem(CONFIG.DATA_CACHE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        if (!parsed.version || !parsed.champions || !parsed.items) {
            return null;
        }
        if (expectedVersion && parsed.version !== expectedVersion) {
            return null;
        }
        if (Date.now() - parsed.timestamp > CONFIG.CACHE_TTL) {
            return null;
        }
        return {
            version: parsed.version,
            champions: parsed.champions,
            items: parsed.items,
            championImageBase: parsed.championImageBase,
            itemImageBase: parsed.itemImageBase,
            source: 'cache'
        };
    } catch (error) {
        console.warn('Falha ao recuperar cache:', error);
        return null;
    }
}

export function saveDatasetCache(dataset) {
    try {
        const payload = JSON.stringify({
            version: dataset.version,
            champions: dataset.champions,
            items: dataset.items,
            championImageBase: dataset.championImageBase,
            itemImageBase: dataset.itemImageBase,
            timestamp: Date.now()
        });
        localStorage.setItem(CONFIG.DATA_CACHE_KEY, payload);
        console.log('💾 Dataset salvo no cache');
    } catch (error) {
        console.warn('Falha ao salvar cache:', error);
    }
}

function mapDatasetFromResponses(versionHint, championResponse, itemResponse, { source }) {
    const resolvedVersion = (championResponse?.version || versionHint).trim();

    const champions = Object.values(championResponse?.data || {});
    const items = Object.entries(itemResponse?.data || {})
        .map(([id, item]) => ({ id, ...item }))
        .filter(item => Boolean(item.image?.full));

    console.log('📊 Dados processados:', {
        champions: champions.length,
        items: items.length,
        version: resolvedVersion,
        source
    });

    return {
        version: resolvedVersion,
        champions,
        items,
        championImageBase: `${CONFIG.CDN_BASE}/${resolvedVersion}/img/champion/`,
        itemImageBase: `${CONFIG.CDN_BASE}/${resolvedVersion}/img/item/`,
        source
    };
}