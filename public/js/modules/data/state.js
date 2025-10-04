// Estado global da aplicação
export const appState = {
    championDataset: [],
    itemDataset: [],
    datasetConfig: null,
    datasetStatusEl: null,
    
    builderState: {
        championId: null,
        items: [],
        showAbilities: true,
        selectedAbilityLevels: { q: 1, w: 1, e: 1, r: 1 }
    }
};

// Getters
export function getChampionDataset() {
    return appState.championDataset;
}

export function getItemDataset() {
    return appState.itemDataset;
}

export function getDatasetConfig() {
    return appState.datasetConfig;
}

export function getBuilderState() {
    return appState.builderState;
}

export function getDatasetStatusEl() {
    return appState.datasetStatusEl;
}

// Setters
export function setChampionDataset(dataset) {
    appState.championDataset = dataset;
}

export function setItemDataset(dataset) {
    appState.itemDataset = dataset;
}

export function setDatasetConfig(config) {
    appState.datasetConfig = config;
}

export function setBuilderState(state) {
    appState.builderState = { ...appState.builderState, ...state };
}

export function setDatasetStatusEl(element) {
    appState.datasetStatusEl = element;
}

// Funções auxiliares para encontrar dados
export function findChampionById(id) {
    return appState.championDataset.find(champion => champion.id === id);
}

export function findItemById(id) {
    const target = String(id);
    return appState.itemDataset.find(item => item.id === target);
}

export function getSelectedChampion() {
    if (!appState.builderState.championId) {
        return undefined;
    }
    return findChampionById(appState.builderState.championId);
}

export function getSelectedItems() {
    return appState.builderState.items
        .map(id => findItemById(id))
        .filter(Boolean);
}