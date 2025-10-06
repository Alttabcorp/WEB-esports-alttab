# Estrutura do Projeto LOL Builder

## Visão Geral

Este projeto foi reorganizado em uma estrutura modular para facilitar manutenção e entendimento. A estrutura é dividida em módulos especializados que lidam com diferentes aspectos da aplicação.

## Estrutura de Diretórios

```
public/js/
├── lol-data.js                # Arquivo original (mantido para compatibilidade)
├── lol-data-new.js            # Nova versão modular principal (recomendado)
├── modules/
│   ├── api/
│   │   └── datadragon.js      # Funções de acesso à API Data Dragon
│   ├── builder/
│   │   ├── actions.js         # Ações do builder (adicionar/remover itens)
│   │   ├── calculator.js      # Cálculos para o builder
│   │   ├── champion.js        # Renderização e gerenciamento de campeões
│   │   ├── items.js           # Renderização e gerenciamento de itens
│   │   ├── loadout.js         # Gerenciamento do loadout de itens
│   │   ├── renderer.js        # Funções de renderização gerais
│   │   └── setup.js           # Configuração inicial do builder
│   ├── config.js              # Configurações globais
│   ├── data/                  # Dados estáticos (se necessário)
│   ├── modals/
│   │   ├── championModal.js   # Modal de seleção de campeões
│   │   └── itemModal.js       # Modal de seleção/detalhes de itens
│   ├── stats/
│   │   └── stats.js           # Cálculo e exibição de estatísticas
│   └── utils/
│       ├── abilities.js       # Utilitários para habilidades de campeão
│       ├── events.js          # Configuração de event listeners
│       ├── helpers.js         # Funções auxiliares gerais
│       └── ui.js              # Utilitários de interface do usuário
```

## Principais Módulos

### Configuração (`config.js`)

Mantém constantes globais, configurações e estado compartilhado entre módulos.

### API (`api/datadragon.js`)

Gerencia todas as requisições à API Data Dragon, fornecendo dados de campeões e itens.

### Builder

- **champion.js**: Renderização e gerenciamento de campeões
- **items.js**: Renderização e gerenciamento da lista de itens
- **loadout.js**: Gerenciamento dos slots de build e responsividade

### Modais

- **championModal.js**: Modal de seleção de campeões no formato de matriz
- **itemModal.js**: Modal para detalhes e seleção de itens (responsivo)

### Stats (`stats.js`)

Cálculo e exibição das estatísticas do campeão com itens.

### Utilitários

- **abilities.js**: Gerenciamento das habilidades do campeão
- **events.js**: Configuração de event listeners para toda a aplicação
- **helpers.js**: Funções utilitárias gerais
- **ui.js**: Funções auxiliares para a interface do usuário

## Como Usar

Para inicializar a aplicação, importe `lol-data-new.js` no seu HTML:

```html
<script type="module" src="public/js/lol-data-new.js"></script>
```

## Responsividade

O sistema está configurado para funcionar responsivamente em dispositivos móveis:
- Seção de itens é removida em telas pequenas
- Slots de build se tornam interativos para abrir um modal de seleção de itens
- Layout se adapta para melhor visualização em telas pequenas

## Manutenção

Para adicionar novos recursos:

1. Identifique o módulo apropriado para a funcionalidade
2. Adicione sua função/classe ao módulo existente ou crie um novo se necessário
3. Exporte a funcionalidade e importe onde for necessária
4. Atualize `lol-data-new.js` se a funcionalidade precisar ser inicializada

## Arquivos Removidos

Os seguintes arquivos foram removidos por serem redundantes ou desnecessários:

- **lol-data-modular.js**: Uma versão intermediária substituída pelo lol-data-new.js
- **item-stats.js**: Funcionalidades já implementadas no módulo stats/stats.js
- **calc-skill-damage.js**: Função utilitária não utilizada no projeto
- **Pasta example/**: Exemplos não necessários para a aplicação principal

Além disso, foram removidas funções duplicadas:
- **fetchJson()**: Removida dos helpers.js por já existir em loader.js
- **createErrorState()**: Removida duplicação em navigation.js, mantida apenas em helpers.js

## Manutenção e Compatibilidade

O arquivo `lol-data.js` original está sendo mantido temporariamente para compatibilidade, mas todas as novas funcionalidades devem ser implementadas na nova estrutura modular. Em uma futura atualização, este arquivo poderá ser totalmente removido.