# Zera Games — site da loja

Site da Zera Games (Praia Grande – SP): página inicial com o catálogo e página do controle Edição Limitada GTA VI, com carrinho, checkout e área do cliente.

## Como abrir no computador

Dê dois cliques em `index.html`. Abre no navegador, sem instalar nada.

## Arquivos

| Arquivo / pasta | O que é |
|---|---|
| `index.html` | Página inicial: banners, categorias, consoles, controles, jogos, acessórios, loja e cadastro de e-mail |
| `controle-gta6.html` | Página do controle GTA VI: giro do controle, estoque, frete, carrinho, checkout e área do cliente |
| `assets/img/` | Todas as fotos, separadas por categoria |
| `assets/js/zera-runtime.js` | Motor das páginas. Não precisa mexer nele |

## Como cada página é organizada

Cada página tem duas partes:

1. **O visual**, dentro de `<template id="dc-template">`. É HTML comum. Onde aparece `{{algumaCoisa}}`, o valor vem da lógica.
2. **A lógica**, no fim do arquivo, dentro de `<script type="text/x-dc">`. Ela calcula preços, estoque, carrinho etc.

Marcações usadas no visual:

- `{{nome}}` → mostra um valor da lógica
- `onClick="{{funcao}}"` → chama uma função ao clicar
- `<sc-if value="{{condicao}}"> ... </sc-if>` → só aparece se a condição for verdadeira
- `<sc-for list="{{lista}}" as="p"> ... </sc-for>` → repete o bloco para cada item

## Tarefas comuns

### Mudar o preço de um produto da página inicial

Em `index.html`, procure por `var PRICES = {`. Cada produto tem o preço **cheio** (o "de"):

```js
'PlayStation 5 Pro': 5669.99,
```

O desconto fica logo abaixo, em `var PDISC = {` (0.3 = 30%). Produto que não aparece em `PDISC` usa o desconto padrão de `var DISC = 0.2;` (20%). Com desconto 0, o produto aparece sem preço riscado e sem o selo Black November.

### Adicionar um produto na página inicial

1. Coloque as fotos em `assets/img/<categoria>/`.
2. Em `index.html`, procure a lista da categoria (`var consoles = add(...`, `var accessories = add(...` etc.) e acrescente uma linha `['TEXTO CURTO', 'Etiqueta', 'Nome do produto']`.
3. Em `PRICES`, coloque o preço; em `PDISC`, o desconto (se houver).
4. Registre as fotos com `IMGS['Nome do produto'] = ['assets/img/...', ...];` e a descrição com `INFO['Nome do produto'] = ['Descrição', 'Observação'];`.

O nome precisa ser escrito exatamente igual nos quatro lugares.

### Marcar um produto como sem estoque

Em `index.html`, procure por `var OUT = {` e acrescente `'Nome do produto': true`.

### Mudar preço e estoque do controle GTA VI

Em `controle-gta6.html`, no `data-props` do `<script type="text/x-dc">` (perto do fim do arquivo):

- `"price"` → preço no Pix (299.37, 70% off)
- `"priceFrom"` → preço cheio, que vale no cartão (997.9)
- `"stockBlack"` / `"stockWhite"` → unidades disponíveis
- `"installments"` → número de parcelas no cartão (calculadas sobre o preço cheio)

Na página inicial, o mesmo controle fica em `index.html`, em `PRICES[r[0]] = 997.9; PDISC[r[0]] = 0.7;` e nos dois cards fixos da seção Controles. Mude nos dois arquivos.

### Desconto só no Pix

Em todo o site, o preço com desconto (Black Friday) vale só para pagamento no Pix. As formas de pagamento são Pix (já vem selecionado) e cartão de crédito; no cartão, o checkout cobra o preço cheio de cada produto. O carrinho mostra os dois totais, e o checkout troca os valores quando o cliente muda a forma de pagamento.

Atenção: os preços da página inicial ficam separados dos da página do controle. Se mudar o preço do controle ou de um jogo, mude nos dois arquivos.

## O que ainda é demonstração

Funciona na tela, mas **não está ligado a nenhum sistema**:

- **Login e cadastro** → aceitam qualquer e-mail e senha e não guardam nada.
- **Carrinho, checkout e pedidos** → somem ao recarregar a página; nenhuma cobrança é feita. Falta integrar com a Appmax.
- **Botão "Meus pedidos"** → abre um pedido de exemplo sem login. **Remover antes de ir ao ar.**
- **Frete** → qualquer CEP dá "frete grátis".
- **Cupom `TESTE10`** → cupom de teste. **Trocar ou apagar antes de ir ao ar** (`couponCode` no `data-props`).
- **Cadastro de e-mail para ofertas** → não envia para lugar nenhum.

## Pendências de conteúdo

Procure por `[` nos arquivos para achar os campos ainda em aberto: razão social, CNPJ, contato de atendimento, prazo de entrega, garantia, o que vem na caixa de cada produto e confirmação de origem dos controles.

## Publicar na HostGator

1. No cPanel, abra o **Gerenciador de Arquivos** e entre na pasta `public_html`.
2. Envie todos os arquivos desta pasta (mantendo a pasta `assets`).
3. Acesse o domínio no navegador.
