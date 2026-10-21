# Instruções de execução — Meu Eixo

Você é responsável por implementar o aplicativo; priorize entregar um MVP utilizável, não um protótipo de telas sem comportamento.

## Antes de começar
1. Inspecione o repositório e sua configuração atual.
2. Se estiver vazio, escolha uma stack simples para uma PWA mobile-first. Não presuma que há framework instalado.
3. Faça um plano curto e comece a implementar, sem pedir confirmação para decisões reversíveis de baixo risco.
4. Mantenha a aplicação simples, responsiva e utilizável por adultos ocupados; não use padrões visuais de app fitness competitivo.

## Requisitos funcionais do MVP
- Painel “Hoje” com resumo e ações rápidas.
- Check-in diário: humor, energia, estresse e disposição.
- Sono: registrar hora de deitar, hora de acordar, latência/despertares opcionais, qualidade percebida; calcular duração aproximada e mostrar histórico semanal.
- Hidratação: registrar volume de água rapidamente, ajustar volume padrão e meta diária, mostrar progresso.
- Alimentação: adicionar/editar/remover refeições; nomes e horários personalizáveis; registrar alimentos e observações; marcar refeições realizadas; histórico por dia. Não exigir calorias.
- Atividades: configurar plano simples, registrar caminhada/corrida/mobilidade, iniciar/pausar/finalizar cronômetro, registrar distância opcional, duração, esforço percebido e observações; histórico e resumo semanal.
- Pausas: intervalos e horário de início/fim configuráveis, ações “Fiz a pausa” e “Adiar”; permitir configurar lembretes de água e rotina noturna.
- Mobilidade e mindfulness: cartões de exercícios curtos, com instruções concisas e opção de concluir. Evitar recomendações que ignorem dor ou limitações.
- Saúde: registros opcionais de pressão arterial e frequência cardíaca, com data/hora e notas. Não interpretar um valor isolado como diagnóstico ou garantia de segurança para treinar.
- Música e foco: salvar links de playlists por tipo de atividade e abrir em serviço externo.
- Configurações: metas, lembretes, preferências e exportação/importação de backup dos dados locais.

## UX
- Mobile-first, painel claro, botões grandes e poucos toques.
- Mostrar claramente “próxima ação” sem sobrecarregar o usuário.
- Permitir editar ou apagar registros.
- Estado vazio útil; nunca inventar dados pessoais.
- Não culpar o usuário por dias sem atividade.
- Acessibilidade básica, contraste adequado e rótulos claros.

## Privacidade e segurança
- No MVP, guardar dados localmente no dispositivo; não enviar dados de saúde para serviços externos.
- Não incluir segredos, tokens ou dados pessoais no código.
- Implementar backup exportável e importável, explicando que o usuário deve guardar o arquivo com segurança.
- Não implementar analytics que coletem dados de saúde.
- Incluir aviso breve: ferramenta de organização pessoal, não substitui profissional de saúde.
- Não diagnosticar depressão nem prescrever exercícios/medicamentos.
- Para rastreio emocional, não simular questionários clínicos validados sem implementá-los fielmente e explicar suas limitações; no MVP, check-in simples é suficiente.

## Limitações técnicas
- Notificações, som e execução com a tela bloqueada variam conforme navegador, permissões e otimização de bateria do Android. Não prometa alarmes confiáveis em qualquer cenário; documente e teste.
- Não implementar ainda player MP3 próprio, clima ou smartwatch/Bluetooth/USB. Deixe a arquitetura preparada sem criar abstrações prematuras.

## Entrega
1. Implemente o MVP funcional.
2. Execute testes/lint/build disponíveis e corrija falhas.
3. Forneça resumo das decisões, arquivos principais, limitações conhecidas e comandos para rodar/publicar.
4. Não diga que algo foi testado se não executou o teste.
5. Faça commits pequenos e claros, se o ambiente permitir.
