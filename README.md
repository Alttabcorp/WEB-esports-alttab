# 🎮 ALTTAB Esports - Recrutamento & MVP

<div align="center">

![ALTTAB Esports](https://avatars.githubusercontent.com/u/89790306?s=96&v=4)

[![License](https://img.shields.io/github/license/Alttabcorp/WEB-esports-alttab)](LICENSE)
[![HTML5](https://img.shields.io/badge/HTML5-Ready-orange)](index.html)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow)](public/js/)
[![CSS3](https://img.shields.io/badge/CSS3-Modern-blue)](public/css/)
[![MVP](https://img.shields.io/badge/Status-MVP-success)](README.md)

**MVP da Vertente Esports - ALTTAB Corp | Recrutamento de Novos Talentos**

*Junte-se ao nosso time e domine o Rift conosco!*

```
public/images/
├── logo-alttab.png       # Logo principal
├── team1.png             # Logo time parceiro 1
├── team2.png             # Logo time parceiro 2
├── team3.png             # Logo time parceiro 3
├── team4.png             # Logo time parceiro 4
├── team5.png             # Logo time parceiro 5
├── team6.png             # Logo time parceiro 6
├── players/
│   ├── player-top.jpg    # Top laner
│   ├── player-jungle.jpg # Jungler
│   ├── player-mid.jpg    # Mid laner
│   ├── player-adc.jpg    # ADC
│   └── player-support.jpg# Suporte
├── news/
│   ├── news1.jpg         # Imagem notícia 1
│   ├── news2.jpg         # Imagem notícia 2
│   └── news3.jpg         # Imagem notícia 3
```
- **Comunidade gamer** que quer acompanhar nosso crescimento
- **Patrocinadores** que enxergam potencial no mercado de esports

## 🗂️ Estrutura do Projeto

```
WEB-esports-alttab/
├── public/
│   ├── css/
│   │   └── style.css        # Estilos principais do site
│   ├── images/              # Imagens do site
│   │   ├── players/         # Fotos dos jogadores
│   │   ├── teams/           # Logos dos times adversários
│   │   ├── news/            # Imagens das notícias
│   │   └── logo-alttab.png  # Logo principal
│   ├── videos/              # Vídeos de background
│   └── icons/               # Favicons e ícones
├── public/js/
│   └── app.js               # JavaScript principal
├── index.html               # Página principal
├── README.md                # Documentação do projeto
└── LICENSE                  # Licença do projeto
```

## 🚀 Funcionalidades MVP

### 🏠 Hero Section - Chamada para Ação
- **Mensagem de recrutamento** clara e impactante
- **Formulário de interesse** direto na página inicial
- **Estatísticas atrativas** para gerar credibilidade
- **CTAs estratégicos** para conversão de leads

### 👥 Apresentação do Time Atual
- **Perfis dos jogadores** como referência de qualidade
- **Histórico de conquistas** para demonstrar competência
- **Ambiente profissional** que atrai novos talentos
- **Cultura do time** e valores da organização

### 📧 Canal de Recrutamento
- **Formulário especializado** para candidatos
- **Campos específicos** para avaliação de skills
- **Processo de seleção** transparente
- **Contato direto** com nossa equipe de recrutamento

### 🎯 Oportunidades Disponíveis
- **Vagas abertas** no time principal
- **Programa de desenvolvimento** para novos talentos
- **Parcerias de streaming** e criação de conteúdo
- **Mentoria profissional** para crescimento na carreira

## 🎨 Design System

### Cores Principais
- **Primary**: `#0f172a` (Slate 900)
- **Secondary**: `#1e293b` (Slate 800)
- **Accent**: `#3b82f6` (Blue 500)
- **Success**: `#10b981` (Emerald 500)
- **Warning**: `#f59e0b` (Amber 500)
- **Danger**: `#ef4444` (Red 500)

### Tipografia
- **Display Font**: Orbitron (títulos e logos)
- **Body Font**: Inter (texto geral)

### Componentes
- **Botões**: Primary, Secondary, Outline
- **Cards**: Player, Match, Achievement, News
- **Formulários**: Input, Select, Textarea com validação
- **Navegação**: Navbar responsiva com indicadores

## 🛠️ Stack Tecnológico (MVP)

- **HTML5**: Estrutura semântica e acessível
- **CSS3**: Design moderno com Grid/Flexbox e animações
- **JavaScript Vanilla**: Funcionalidades interativas sem dependências pesadas
- **Font Awesome**: Iconografia profissional
- **Google Fonts**: Tipografia otimizada (Inter + Orbitron)

*Arquitetura simplificada para rápida iteração e deploy do MVP*

## 📱 Responsividade

### Breakpoints
- **Desktop**: 1024px+
- **Tablet**: 768px - 1023px
- **Mobile**: 320px - 767px

### Adaptações Mobile
- Menu hambúrguer para navegação
- Cards em coluna única
- Redimensionamento de tipografia
- Otimização de touch targets
- Stack vertical para seções complexas

## ⚡ Performance

### Otimizações Implementadas
- **Lazy loading** de imagens
- **Debounce** em eventos de scroll
- **Intersection Observer** para animações
- **Preload** de recursos críticos
- **Minificação** de código (produção)

### Métricas Esperadas
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

## 🔧 Configuração e Instalação

### Pré-requisitos
```bash
# Servidor local (opcional)
python -m http.server 8000
# ou
npx live-server
```

### Clone do Repositório
```bash
git clone https://github.com/Alttabcorp/WEB-esports-alttab.git
cd WEB-esports-alttab
```

### Servir Localmente
```bash
# Usando Python
python3 -m http.server 8000

# Usando Node.js
npx live-server --port=8000

# Ou simplesmente abra index.html no navegador
```

### Deploy
O projeto é estático e pode ser hospedado em:
- GitHub Pages
- Netlify
- Vercel
- Firebase Hosting
- Qualquer servidor web

## 📸 Assets Necessários

Para funcionamento completo, adicione os seguintes assets:

### Imagens
```
public/images/
├── logo-alttab.png           # Logo principal
├── stream-preview.jpg        # Destaque da seção de lives
├── stream-thumb1.jpg         # Miniatura live 1
├── stream-thumb2.jpg         # Miniatura live 2
├── stream-thumb3.jpg         # Miniatura live 3
├── players/
│   ├── player-top.jpg        # Foto do jogador Top
│   ├── player-jungle.jpg     # Foto do jogador Jungle
│   ├── player-mid.jpg        # Foto do jogador Mid
│   ├── player-adc.jpg        # Foto do jogador ADC
│   └── player-support.jpg    # Foto do jogador Support
└── teams/
   ├── enemy-team1.png       # Logo time adversário 1
   ├── enemy-team2.png       # Logo time adversário 2
   └── enemy-team3.png       # Logo time adversário 3
```

### Vídeos
```
public/videos/
└── lol-background.mp4        # Vídeo de background do hero
```

### Ícones
```
public/icons/
└── favicon.ico               # Favicon do site
```

## 🎯 Personalização

### Alterando Cores
Edite as variáveis CSS em `public/css/style.css`:
```css
:root {
    --primary-color: #0f172a;
    --accent-color: #3b82f6;
    /* ... outras variáveis */
}
```

### Modificando Conteúdo
1. **Informações do time**: Edite a seção `#team` no `index.html`
2. **Lives**: Atualize a seção `#streams`
3. **Conquistas**: Modifique a seção `#achievements`
4. **Campeonatos**: Altere a seção `#tournaments`

### Adicionando Funcionalidades
O JavaScript é modular em `public/js/app.js`. Adicione novas funções seguindo o padrão:
```javascript
function setupNewFeature() {
    // Sua funcionalidade aqui
}

// Chame na função init()
function init() {
    // ... outras funções
    setupNewFeature();
}
```

## 🔍 SEO e Acessibilidade

### SEO
- Meta tags otimizadas
- Estrutura semântica HTML5
- URLs amigáveis (single page)
- Schema markup (implementar se necessário)

### Acessibilidade
- Navegação por teclado
- Alt texts em imagens
- Contraste adequado de cores
- ARIA labels onde necessário
- Focus indicators visíveis

## 🎯 Roadmap da Vertente Esports

### Fase 1 - MVP (Atual)
- ✅ Landing page de recrutamento
- ✅ Identidade visual da marca
- ✅ Formulário de contato para candidatos
- ✅ Apresentação do conceito

### Fase 2 - Crescimento (Q1 2026)
- 🔄 Sistema de inscrições online
- 🔄 Portal do jogador com dashboard
- 🔄 Calendário interativo de treinos
- 🔄 Sistema de streaming integrado

### Fase 3 - Expansão (Q2-Q3 2026)
- 📋 Múltiplos times (LoL, Valorant, CS2)
- 📋 Academia de desenvolvimento
- 📋 Plataforma de análise de performance
- 📋 Partnerships e patrocínios

### Fase 4 - Consolidação (Q4 2026)
- 📋 Liga própria ALTTAB
- 📋 Centro de treinamento físico
- 📋 Ecosystem completo de esports

## 🤝 Como Participar

### Para Jogadores Interessados
1. **Acesse o site**: Navegue pelas seções e conheça nossa proposta
2. **Preencha o formulário**: Envie suas informações através do formulário de contato
3. **Aguarde retorno**: Nossa equipe entrará em contato para próximos passos
4. **Processo seletivo**: Participação em tryouts e avaliações

### Para Desenvolvedores
1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NewFeature`)
3. Commit suas mudanças (`git commit -m 'Add NewFeature'`)
4. Push para a branch (`git push origin feature/NewFeature`)
5. Abra um Pull Request

### Para Investidores/Patrocinadores
- Entre em contato através do formulário oficial
- Envie proposta para: esports@alttab.com.br
- Agende reunião com nossa equipe comercial

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👨‍💻 Equipe

**ALTTAB Corp - Vertente Esports**
- **Desenvolvimento**: [GitHub](https://github.com/Alttabcorp)
- **Contato Esports**: esports@alttab.com.br
- **Recrutamento**: recrutamento@alttab.com.br

## 🙏 Agradecimentos

- **Riot Games** pelo League of Legends
- **Comunidade gamer brasileira** pelo apoio inicial
- **Early adopters** que acreditaram no projeto
- **Font Awesome** e **Google Fonts** pelas ferramentas
- **Todos os jogadores** que demonstraram interesse em fazer parte da ALTTAB Esports

---

<div align="center">

**🎮 ALTTAB Esports - Onde talentos se tornam campeões**

*MVP desenvolvido com ❤️ para revolucionar o cenário de esports brasileiro*

</div>

## 🚀 Como Usar

### Pré-requisitos

- **Navegador Web Moderno**: Chrome, Firefox, Safari, Edge (versões recentes)
- **JavaScript Habilitado**: Necessário para funcionalidade completa
- **Conexão com Internet**: Para fontes externas e ícones

### Instalação e Execução

1. **Clone o Repositório**:
   ```bash
   git clone https://github.com/Alttabcorp/WEB-Orcamento3D-alttab.git
   cd WEB-Orcamento3D-alttab
   ```

2. **Abra o Sistema**:
   - Abra o arquivo `index.html` em seu navegador
   - Ou use um servidor local (recomendado):
   ```bash
   # Com Python 3
   python -m http.server 8000
   
   # Com Node.js (http-server)
   npx http-server
   
   # Com PHP
   php -S localhost:8000
   ```

3. **Acesse a Aplicação**:
   - Diretamente: `file:///caminho/para/index.html`
   - Servidor local: `http://localhost:8000`

### Uso do Sistema

1. **Calculadora de Impressão 3D**:
   - Insira o tempo de impressão (em horas)
   - Informe o peso da peça (em gramas)
   - Clique em "Calcular Custo"

2. **Dados do Cliente** (opcional):
   - Nome completo
   - E-mail
   - Telefone

3. **Detalhes do Projeto**:
   - Descrição detalhada
   - Prazo de entrega
   - Imagem do projeto (opcional)

4. **Geração do Orçamento**:
   - Clique em "Gerar Orçamento PDF"
   - O relatório é aberto em uma nova aba (permita pop-ups do domínio)
   - Salve ou envie o PDF diretamente pelo visualizador do navegador

5. **Compartilhamento rápido**:
   - Use o botão "📋 Copiar Resultado" para gerar um resumo textual
   - Cole em conversas, e-mail ou CRM conforme necessário

## ⚙️ Configuração

### Personalização de Custos

- Clique no botão **⚙️ Configurações** na interface para abrir o painel completo.
- Ajuste preços de filamento, energia, acessórios, custos fixos, margem (markup), impostos, taxa de cartão, custo de anúncio e margem mínima do lojista.
- As alterações são salvas automaticamente no navegador (localStorage) e podem ser exportadas/importadas via JSON.

Se preferir definir novos valores padrão versionados, edite o arquivo `js/modules/calculator/core/getDefaultConfig.js`:

```javascript
return {
   preco_filamento_por_kg: 156.00,
   potencia_w: 175,
   valor_kw_h: 0.84,
   quantidade_acessorios: 1,
   custo_unidade_acessorio: 0.48,
   custo_fixo_mensal: 300.00,
   valor_maquina: 2000.00,
   vida_util_horas: 24000,
   percentual_falha: 0.10,
   markup: 3,
   percentual_imposto: 0.085,
   taxa_cartao: 0.045,
   custo_anuncio_percentual: 0.15,
   margem_minima_lojista: 1.35
};
```

### Personalização Visual

- **Cores**: Edite variáveis CSS em `public/css/style.css`
- **Logo**: Substitua arquivos em `public/images/logo/`
- **Ícones**: Atualize arquivos em `public/icons/`

## 🔧 Funcionalidades Técnicas

### Cálculos Implementados

- **Custo do Filamento**: Baseado no peso e preço por grama
- **Custo Energético**: Calculado por tempo de impressão
- **Custos Fixos**: Amortização de equipamentos e instalações
- **Impostos e Taxas**: Percentuais sobre o valor total
- **Margens de Lucro**: Markup com ajuste psicológico (.90) e margem mínima B2B configurável
- **Escalonamento de Preços**: Faixas automáticas para 10, 50 e 100+ unidades com descontos progressivos

### Geração de PDF

- Utiliza a biblioteca **jsPDF**
- Layout profissional com branding ALTTAB
- Inclui todos os detalhes do orçamento
- Suporte a imagens do projeto
- Pré-visualização em nova aba (sem download automático)

### Responsividade

- **Mobile First**: Design otimizado para dispositivos móveis
- **Breakpoints**: 768px e 480px para diferentes telas
- **Flexbox/Grid**: Layout moderno e adaptável

## 📱 Compatibilidade

### Navegadores Suportados

| Navegador | Versão Mínima | Status |
|-----------|---------------|--------|
| Chrome    | 80+           | ✅ Totalmente Suportado |
| Firefox   | 75+           | ✅ Totalmente Suportado |
| Safari    | 13+           | ✅ Totalmente Suportado |
| Edge      | 80+           | ✅ Totalmente Suportado |

### Dispositivos

- **Desktop**: Windows, macOS, Linux
- **Tablet**: iPad, Android tablets
- **Mobile**: iOS, Android

## 🛠️ Desenvolvimento

### Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **PDF**: jsPDF 2.5.1
- **Ícones**: Font Awesome 6.4.0
- **Fontes**: Montserrat (Google Fonts)

### Estrutura de Arquivos JavaScript

```
js/
├── app.js                    # Arquivo principal
├── modules/
│   ├── calculator.js         # Lógica de cálculos
│   ├── config.js            # Configurações do sistema
│   ├── pdfGenerator.js      # Geração de relatórios
│   ├── calculadoraInterface.js # Interface da calculadora
│   └── interfaceManager.js   # Gerenciamento geral
└── utils/
    └── formatting.js        # Funções de formatação
```

### Padrões de Código

- **ES6+ Features**: Arrow functions, const/let, template literals
- **Modularização**: Separação por responsabilidades
- **Nomenclatura**: CamelCase para JavaScript, kebab-case para CSS
- **Comentários**: Documentação inline para funções complexas

## 📋 Roadmap

### Versão Atual (v1.0)
- ✅ Calculadora básica de custos
- ✅ Geração de PDF
- ✅ Interface responsiva
- ✅ Branding ALTTAB

### Próximas Versões
- 🔄 **v1.1**: Histórico de orçamentos
- 🔄 **v1.2**: Múltiplos materiais de impressão
- 🔄 **v1.3**: Integração com API de preços
- 🔄 **v1.4**: Dashboard administrativo
- 🔄 **v2.0**: Sistema multi-usuário

## 🤝 Contribuição

1. **Fork** do repositório
2. Crie uma **branch** para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. **Commit** suas alterações (`git commit -m 'Adiciona nova funcionalidade'`)
4. **Push** para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um **Pull Request**

### Guidelines de Contribuição

- Siga os padrões de código existentes
- Adicione testes para novas funcionalidades
- Atualize a documentação quando necessário
- Use commits descritivos e em português

## 🐛 Relatório de Bugs

Encontrou um problema? Abra uma **issue** incluindo:

- **Descrição detalhada** do problema
- **Passos para reproduzir**
- **Comportamento esperado** vs **comportamento atual**
- **Screenshots** (se aplicável)
- **Informações do ambiente** (navegador, SO, etc.)

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Contato e Suporte

### ALTTAB Corp - Equipe de Desenvolvimento

- **Email**: alttabcorp@gmail.com
- **Telefone**: (83) 9 9332-2427
- **Localização**: Cajazeiras, PB
- **Website**: [alttabcorp.com.br](https://www.alttabcorp.com.br)

### Redes Sociais

- **LinkedIn**: [@alttab-corp](https://www.linkedin.com/company/alttab-corp)
- **Instagram**: [@alttabcorp](https://www.instagram.com/alttabcorp)
- **Facebook**: [@alttabcorp](https://www.facebook.com/alttabcorp)
- **Twitter**: [@AlttabeSports](https://x.com/AlttabeSports)

### Links Úteis

- **Documentação Técnica**: [TECHNICAL_DOCS.md](TECHNICAL_DOCS.md)
- **Repositório GitHub**: [WEB-Orcamento3D-alttab](https://github.com/Alttabcorp/WEB-Orcamento3D-alttab)
- **Issues**: [GitHub Issues](https://github.com/Alttabcorp/WEB-Orcamento3D-alttab/issues)

---

<div align="center">

**Desenvolvendo soluções tecnológicas inovadoras para transformar ideias em resultados concretos**

**Made with ❤️ by ALTTAB Corp**

[⭐ Star no GitHub](https://github.com/Alttabcorp/WEB-Orcamento3D-alttab) • [🐛 Reportar Bug](https://github.com/Alttabcorp/WEB-Orcamento3D-alttab/issues) • [💡 Sugerir Feature](https://github.com/Alttabcorp/WEB-Orcamento3D-alttab/issues)

</div>
