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
