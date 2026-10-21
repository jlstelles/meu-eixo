# Meu Eixo

Aplicativo pessoal de autocuidado para adultos com rotina cheia. O foco é reduzir o atrito para acompanhar hábitos e agir: abrir o painel, entender o próximo passo e registrar o que foi feito.

## Princípios
- Mobile-first, simples, acessível e sem culpa ou gamificação excessiva.
- Registros rápidos; nada de formulários longos para tarefas cotidianas.
- Ajudar a criar regularidade, não exigir perfeição.
- Privacidade por padrão: dados de saúde ficam no dispositivo no MVP, sem telemetria de saúde.
- Não diagnosticar, prescrever tratamento nem alterar medicação.
- Não prometer alarmes em segundo plano sem testar as limitações reais do navegador e Android.

## Escopo do MVP
1. Painel diário com próximos cuidados e resumo simples.
2. Lembretes de pausas no trabalho, hidratação e preparação para dormir.
3. Sono: horários de dormir/acordar, duração estimada, qualidade percebida e histórico.
4. Alimentação: refeições e horários personalizáveis, alimentos e notas, sem exigir contagem de calorias.
5. Hidratação: volume por registro, meta ajustável e histórico.
6. Movimento: plano de atividade adaptável, caminhada/corrida, cronômetro e registro manual de duração/distância/esforço.
7. Mobilidade, alongamentos leves e mindfulness com instruções breves.
8. Check-in de humor, energia, estresse e disposição.
9. Registro opcional de pressão arterial e frequência cardíaca.
10. Card Música e foco com links de playlists configuráveis.

## Fora do MVP
- Login, backend, sincronização na nuvem, pagamentos e SaaS multiusuário.
- Player de música próprio com reprodução em segundo plano.
- Integração meteorológica.
- Integração com smartwatch, Bluetooth ou USB.
- Diagnóstico médico, prescrição automática ou recomendação médica baseada apenas em um valor isolado.

## Requisitos de qualidade
- PWA instalável, responsiva e confortável em Android.
- Armazenamento local com exportação/importação de backup.
- Metas e lembretes configuráveis, com opção de desativar.
- Acessibilidade básica, bom contraste e alvos de toque grandes.
- Datas/horas locais e tratamento cuidadoso de dados ausentes.
- Informar claramente se uma notificação depende de permissões, navegador aberto ou configurações de bateria.
- Nunca mostrar dados fictícios como se fossem reais.
- Evitar conteúdo de saúde alarmista. Em situações potencialmente urgentes, orientar a buscar atendimento adequado.

## Fluxo principal
Pausa do trabalho → consultar atividade planejada → verificar disposição/sintomas e registros pertinentes → abrir playlist → iniciar atividade/cronômetro → registrar resultado → ver evolução.

## Estratégia de implementação
Antes de codificar, inspecione o repositório e escolha a stack mais simples e sustentável. Se estiver vazio, use uma configuração leve e amplamente suportada; explique a escolha em poucas linhas. Implemente em etapas pequenas, teste a aplicação e informe os comandos exatos para executar localmente e publicar. Não acrescente dependências ou funcionalidades fora do escopo sem justificar.

## Executar localmente
Requer Node 20 ou superior. Não há framework nem bundler: JavaScript puro com módulos ES; o único pacote instalado é o jsdom, usado só nos testes.

```bash
npm install      # instala o jsdom (apenas para os testes)
npm test         # testes de lógica, de interface (DOM simulado) e de build
npm run build    # copia src/ para dist/ e gera a lista de cache offline
npm start        # build + servidor em http://localhost:4173 (também na rede local)
npm run dev      # serve src/ direto, sem cache do service worker
```

### Ver no celular
- **Mesma rede Wi‑Fi:** rode `npm start` e abra no celular o endereço "Na rede local" que o comando imprime. Funciona para usar e testar, mas, por ser HTTP, o navegador não instala como app nem libera o modo offline.
- **USB (Android):** com a depuração USB ligada, `adb reverse tcp:4173 tcp:4173` e abra `http://localhost:4173` no Chrome do celular; `localhost` conta como contexto seguro, então a instalação e o offline devem funcionar.
- **Publicado (HTTPS):** é o caminho normal para instalar. Veja abaixo.

## Publicar
`.github/workflows/pages.yml` roda os testes, gera o build e publica `dist/` no GitHub Pages a cada push na `main`. Ative uma vez em *Settings → Pages → Source: GitHub Actions*. O endereço será `https://<usuario>.github.io/meu-eixo/`; abra-o no Chrome do Android e use *Instalar app* / *Adicionar à tela inicial*. Qualquer hospedagem estática com HTTPS serve: basta publicar o conteúdo de `dist/`.

## Estrutura
- `src/js/core/`: lógica pura e testável (datas, sono, resumos, lembretes, cronômetro, backup, armazenamento).
- `src/js/views/`: uma tela por arquivo; `src/js/ui/`: peças compartilhadas (DOM seguro, folhas, toasts).
- `scripts/`: build e servidor local. `test/`: testes (`node --test`).

## Limitações conhecidas
- Lembretes só disparam com o app aberto; avisos do sistema dependem de permissão, navegador e economia de bateria do Android. O cronômetro usa o horário de início, então continua correto com a tela bloqueada, mas não toca alarme.
- Os dados ficam no `localStorage` do navegador: apagar os dados do site ou desinstalar pode removê-los. Use *Mais → Ajustes e backup*. O arquivo de backup não é criptografado.
- Layout, toque, instalação, modo offline, notificações e Wake Lock ainda não foram verificados em um aparelho Android real.
