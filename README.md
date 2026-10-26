![Capa do projeto](images/arte_renova_bu.png)

# 📚 Renovação de livros BU

Extensão de navegador que renova automaticamente todos os livros emprestados na Biblioteca Universitária da UFSC por meio do sistema Pergamum.

> **Projeto independente e não oficial. Não possui vínculo com a Universidade Federal de Santa Catarina ou Pergamum.**

## 🚀 Como Instalar

Como a extensão não está nas lojas oficiais, como Chrome Web Store ou Microsoft Edge Add-ons, **a instalação é feita localmente utilizando o "Modo do Desenvolvedor" do navegador**. *Funciona em navegadores baseados em Chromium, como Google Chrome, Microsoft Edge, Brave, Opera, entre outros.*

### Passo a Passo:

1. **Baixe o projeto:**
  
  - Acesse a seção Releases deste repositório e baixe o arquivo renovacao-livros-bu-v1.2.0.zip da versão mais recente.

2. **Extraia os arquivos:**  
  Descompacte o arquivo `.zip` baixado em uma pasta de sua preferência no computador.
  
3. **Acesse a página de extensões:**
  
  - No Google Chrome ou Brave, digite na barra de endereços: `chrome://extensions/`
    
  - No Microsoft Edge, digite: `edge://extensions/`
    
  - No Opera, digite: `opera://extensions/`
    
  - Em outros navegadores baseados em Chromium, acesse a página de gerenciamento de extensões correspondente.
    
4. **Ative o Modo Desenvolvedor:**  
  Na página de extensões, ative a opção **"Modo do desenvolvedor"** ou **"Developer mode"**.
  
5. **Carregue a extensão:**
  
  - Clique no botão **"Carregar sem compactação"** ou **"Load unpacked"**.
    
  - Selecione a pasta exata onde você descompactou os arquivos do projeto, ou seja, a pasta que contém o arquivo `manifest.json`.
    
6. **Pronto!**  
  A extensão agora está instalada e ativa no navegador. Você pode fixá-la na barra de ferramentas para facilitar o acesso.
  

## ▶️ Como usar

1. Abra a extensão pelo menu de extensões do navegador.
  
2. Informe sua **matrícula** e **senha** do Pergamum.
  
3. Opcionalmente, marque **"Salvar credenciais"**.
  
4. Clique em **"Renovar Todos os Livros"**.
  
5. Aguarde enquanto a extensão:
  
  - abre o Pergamum automaticamente;
    
  - faz login;
    
  - acessa a página de renovação;
    
  - seleciona todos os livros disponíveis;
    
  - clica em **"Gravar"**.
    

## 📅 Agendamento

A extensão permite definir um intervalo para lembrar quando realizar uma nova renovação.

Você pode escolher um dos intervalos disponíveis ou informar manualmente a quantidade de dias.

Na data programada, o navegador exibirá uma notificação para lembrar da renovação.

Caso as credenciais tenham sido salvas localmente, a renovação poderá ser iniciada diretamente pela notificação.

## ☝️ Segurança

- As credenciais são salvas localmente no navegador por meio de `chrome.storage.local` somente quando o usuário escolhe a opção **"Salvar credenciais"**.
  
- Nenhum dado é enviado para servidores externos pela extensão.
  
- As credenciais são utilizadas somente para realizar o login no sistema Pergamum.
  
- O usuário pode apagar as credenciais salvas a qualquer momento pelo botão **"Limpar credenciais salvas"**.
  

## 📁 Estrutura

```text
bu-renovacao-extension/
├── manifest.json
├── popup.html
├── popup.js
├── background.js
├── content.js
└── icons/
```

### Arquivos

`manifest.json`  
Configuração e permissões da extensão.

`popup.html`  
Interface exibida ao abrir a extensão.

`popup.js`  
Lógica da interface, credenciais, agendamento e histórico.

`background.js`  
Responsável pela navegação, autenticação e processo de renovação.

`content.js`  
Script auxiliar executado nas páginas do Pergamum.

`icons/`  
Ícones utilizados pela extensão.

## ⚠️ Observações

- O Pergamum precisa estar acessível no momento da renovação.
  
- **Desde 22/10/2026, a UFSC restringiu temporariamente o acesso ao Pergamum à rede da UFSC** ([aviso da BU](https://portal.bu.ufsc.br/restricao-temporaria-no-acesso-ao-pergamum-fora-da-rede-da-ufsc/)). Fora dos campi, conecte-se à **VPN UFSC** antes de usar a extensão; caso contrário, o Pergamum responde com erro **403 Forbidden**.
  
- Livros que não estiverem disponíveis para renovação não poderão ser renovados pela extensão.
  
- Alterações futuras na interface ou no funcionamento do Pergamum podem exigir atualizações na extensão.
  
- Testado com o **Pergamum v.11.2.1** da Biblioteca Universitária da UFSC.
