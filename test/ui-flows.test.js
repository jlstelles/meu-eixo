// Testes de interface em DOM simulado (jsdom). Verificam a lógica das telas e os fluxos principais;
// NÃO substituem testes em navegador real nem em um Android de verdade.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultState } from '../src/js/core/defaults.js';
import { boot, tick } from './helpers/dom.js';

const at = (h, m = 0, d = 20) => new Date(2026, 9, d, h, m).getTime();

async function withApp(opts, fn) {
  const env = await boot(opts);
  try {
    await fn(env);
  } finally {
    env.stop();
  }
}

test('abre no painel Hoje com navegação, aviso e próxima ação', () =>
  withApp({}, async (e) => {
    assert.equal(e.$('#titulo').textContent, 'Hoje');
    assert.match(e.$('#subtitulo').textContent, /terça, 20 de outubro/);
    assert.equal(e.$$('#abas a').length, 5);
    assert.equal(e.$('#abas a[aria-current="page"]').dataset.path, '/');
    assert.match(e.text(), /Seus dados ficam só neste aparelho/);
    assert.match(e.text(), /não substitui profissional de saúde/);
    assert.match(e.text(), /Como você está agora\?/, 'primeira ação sugerida é o check-in');
    assert.doesNotMatch(e.text(), /undefined|NaN|\[object/);
  }));

test('todas as rotas renderizam sem erro e sem "undefined/NaN"', () =>
  withApp({}, async (e) => {
    for (const path of ['/', '/agua', '/comer', '/mexer', '/mais', '/sono', '/pausas', '/mobilidade', '/saude', '/musica', '/ajustes']) {
      await e.go(path);
      assert.ok(e.main().children.length > 0, `rota ${path} vazia`);
      assert.doesNotMatch(e.text(), /undefined|NaN|\[object/, `rota ${path} com texto inválido`);
      assert.ok(e.$('#titulo').textContent.length > 0);
    }
    await e.go('/sono');
    assert.ok(e.byText('#conteudo a', '← Mais'), 'subtelas têm voltar');
    assert.equal(e.$('#abas a[aria-current="page"]').dataset.path, '/mais');
  }));

test('água: registrar pelo painel, desfazer e editar', () =>
  withApp({}, async (e) => {
    await e.clickText('button', '+ 250 ml de água');
    assert.equal(e.store.get().logs.water.length, 1);
    assert.match(e.text(), /250 ml/);
    await e.clickText('#toasts button', 'Desfazer');
    assert.equal(e.store.get().logs.water.length, 0);

    await e.go('/agua');
    await e.clickText('button', '+ 250 ml');
    await e.clickText('button', 'Outro volume');
    e.set(e.field('ml'), '500');
    await e.submitSheet();
    assert.equal(e.store.get().logs.water.map((r) => r.ml).join(), '250,500');
    assert.match(e.text(), /750 ml/);

    await e.clickText('#conteudo button', 'Editar');
    e.set(e.field('ml'), '300');
    await e.submitSheet();
    assert.ok(e.store.get().logs.water.some((r) => r.ml === 300));

    await e.clickText('button', 'Meta e volume padrão');
    e.set(e.field('goalMl'), '2500');
    e.set(e.field('defaultMl'), '200');
    await e.submitSheet();
    assert.equal(e.store.get().settings.water.goalMl, 2500);
    assert.match(e.text(), /\+ 200 ml/);
  }));

test('check-in: exige as quatro escalas e salva', () =>
  withApp({}, async (e) => {
    await e.clickText('button', 'Fazer check-in');
    assert.ok(e.sheetOpen());
    await e.submitSheet();
    assert.equal(e.store.get().logs.checkins.length, 0, 'sem escolher nada não salva');
    for (const [name, v] of [['mood', 4], ['energy', 3], ['stress', 2], ['disposition', 5]]) e.click(e.$(`.sheet input[name="${name}"][value="${v}"]`));
    await e.submitSheet();
    assert.equal(e.sheetOpen(), false);
    const c = e.store.get().logs.checkins[0];
    assert.deepEqual([c.mood, c.energy, c.stress, c.disposition], [4, 3, 2, 5]);
    assert.match(e.text(), /Humor 4 · Energia 3 · Estresse 2 · Disposição 5/);
  }));

test('sono: calcula duração, valida horários iguais, edita e apaga', () =>
  withApp({ at: at(9) }, async (e) => {
    await e.go('/sono');
    await e.clickText('button', 'Registrar sono');
    e.set(e.field('date'), '2026-10-20');
    e.set(e.field('bed'), '23:00');
    e.set(e.field('wake'), '23:00');
    await e.submitSheet();
    assert.match(e.$('.form-error').textContent, /não podem ser iguais/);
    assert.equal(e.store.get().logs.sleep.length, 0);
    e.set(e.field('wake'), '06:30');
    e.set(e.field('latencyMin'), '30');
    e.click(e.$('.sheet input[name="quality"][value="4"]'));
    await e.submitSheet();
    const s = e.store.get().logs.sleep[0];
    assert.equal(s.inBedMin, 450);
    assert.equal(s.sleepMin, 420);
    assert.equal(s.quality, 4);
    assert.match(e.text(), /7 h/);

    await e.clickText('#conteudo button', 'Editar');
    e.set(e.field('wake'), '07:00');
    await e.submitSheet();
    assert.equal(e.store.get().logs.sleep[0].inBedMin, 480);

    await e.clickText('#conteudo button', 'Apagar');
    assert.equal(e.store.get().logs.sleep.length, 0);
  }));

test('refeições: marcar, detalhes, histórico por dia e personalização', () =>
  withApp({ at: at(12, 40) }, async (e) => {
    await e.go('/comer');
    assert.match(e.text(), /Almoço/);
    const almocoBtn = e.$$('.meal').find((m) => m.textContent.includes('Almoço'));
    await (async () => { e.click(e.byText('button', 'Marcar como feita', almocoBtn)); await tick(); })();
    const log = e.store.get().logs.mealLogs[0];
    assert.equal(log.mealId, 'almoco');
    assert.equal(log.done, true);

    const almoco2 = e.$$('.meal').find((m) => m.textContent.includes('Almoço'));
    e.click(e.byText('button', 'Detalhes', almoco2));
    e.set(e.field('foods'), 'arroz, feijão e salada');
    await e.submitSheet();
    assert.equal(e.store.get().logs.mealLogs[0].foods, 'arroz, feijão e salada');
    assert.match(e.text(), /arroz, feijão e salada/);

    await e.clickText('button', 'Adicionar');
    e.set(e.field('name'), 'Ceia');
    e.set(e.field('time'), '21:30');
    await e.submitSheet();
    assert.ok(e.store.get().meals.some((m) => m.name === 'Ceia' && m.time === '21:30'));

    await e.clickText('button', '‹');
    assert.match(e.text(), /segunda, 19 de outubro/);
    assert.match(e.text(), /Pendente/, 'ontem não herda o registro de hoje');
    assert.equal(e.byText('button', '›').disabled, false);
  }));

test('refeição removida mantém o histórico', () =>
  withApp({ at: at(12, 40) }, async (e) => {
    await e.go('/comer');
    const almoco = e.$$('.meal').find((m) => m.textContent.includes('Almoço'));
    e.click(e.byText('button', 'Marcar como feita', almoco));
    await tick();
    const row = e.$$('.item').find((i) => i.textContent.includes('Almoço') && i.textContent.includes('12:30'));
    e.click(e.byText('button', 'Apagar', row));
    await tick();
    await e.clickText('.sheet button', 'Remover refeição');
    assert.equal(e.store.get().meals.some((m) => m.id === 'almoco'), false);
    assert.equal(e.store.get().logs.mealLogs.length, 1);
    assert.match(e.text(), /Registros de refeições removidas/);
  }));

test('movimento: cronômetro inicia, pausa, retoma, finaliza e salva', () =>
  withApp({ at: at(15, 0) }, async (e) => {
    await e.go('/mexer');
    await e.clickText('button', 'Caminhada');
    assert.ok(e.store.get().timer.startedAt);
    assert.equal(e.$('.clock').textContent, '00:00');

    e.clock.t = at(15, 0) + 65_000;
    await e.clickText('button', 'Pausar');
    assert.equal(e.store.get().timer.startedAt, null);
    assert.equal(e.store.get().timer.accMs, 65_000);
    assert.equal(e.$('.clock').textContent, '01:05');

    e.clock.t = at(15, 10);
    await e.clickText('button', 'Retomar');
    e.clock.t = at(15, 10) + 25 * 60_000;
    await e.clickText('button', 'Finalizar');
    assert.ok(e.sheetOpen());
    assert.equal(e.field('durationMin').value, '26', '1 min 5 s + 25 min arredonda para 26');
    e.set(e.field('distanceKm'), '2,5'.replace(',', '.'));
    e.set(e.field('effort'), '5');
    e.set(e.field('note'), 'Sem dor.');
    await e.submitSheet();

    assert.equal(e.store.get().timer, null);
    const a = e.store.get().logs.activities[0];
    assert.deepEqual([a.type, a.durationMin, a.distanceKm, a.effort, a.date], ['walk', 26, 2.5, 5, '2026-10-20']);
    assert.match(e.text(), /Caminhada · 26 min/);
    assert.match(e.text(), /2,50 km/);
  }));

test('movimento: cronômetro sobrevive a recarregar a página (timestamps)', async () => {
  const state = defaultState();
  state.timer = { type: 'run', startedAt: at(8, 0), accMs: 0 };
  await withApp({ at: at(8, 30), state }, async (e) => {
    await e.go('/mexer');
    assert.equal(e.$('.clock').textContent, '30:00');
    assert.match(e.text(), /Corrida/);
    assert.match(e.text(), /Atividade em andamento|Pausar/);
  });
});

test('movimento: descartar cronômetro pede confirmação; registro manual, edição e plano', () =>
  withApp({ at: at(15, 0) }, async (e) => {
    await e.go('/mexer');
    await e.clickText('button', 'Corrida');
    await e.clickText('button', 'Descartar');
    await e.clickText('.sheet button', 'Cancelar');
    assert.ok(e.store.get().timer, 'cancelar mantém o cronômetro');
    await e.clickText('button', 'Descartar');
    await e.clickText('.sheet button', 'Descartar');
    assert.equal(e.store.get().timer, null);

    await e.clickText('button', 'Registrar atividade');
    e.set(e.field('type'), 'mobility');
    e.set(e.field('durationMin'), '15');
    await e.submitSheet();
    assert.equal(e.store.get().logs.activities[0].type, 'mobility');

    await e.clickText('#conteudo button', 'Editar');
    e.set(e.field('durationMin'), '20');
    await e.submitSheet();
    assert.equal(e.store.get().logs.activities[0].durationMin, 20);

    await e.clickText('button', 'Adicionar');
    e.set(e.field('weekday'), '2');
    e.set(e.field('type'), 'walk');
    e.set(e.field('minutes'), '30');
    await e.submitSheet();
    assert.equal(e.store.get().plan.length, 1);
    assert.match(e.text(), /Plano de hoje/);
    assert.match(e.text(), /Caminhada · 30 min/);
  }));

test('pausas: lembrete aparece no horário, "Fiz a pausa" e "Adiar" funcionam', () =>
  withApp({ at: at(9, 0) }, async (e) => {
    assert.equal(e.$('.banner'), null, 'antes do horário não há aviso');
    e.clock.t = at(10, 31);
    e.app.refresh();
    e.store.update(() => {}); // dispara checagem de lembretes
    await tick();
    assert.match(e.$('#banner').textContent, /Hora de uma pausa/);

    await e.clickText('#banner button', 'Dispensar');
    assert.equal(e.$('.banner'), null);

    await e.go('/pausas');
    await e.clickText('button', 'Adiar 10 min');
    assert.equal(e.store.get().breakState.snoozedUntil, at(10, 41));
    assert.match(e.text(), /Pausa adiada até 10:41/);

    await e.clickText('button', 'Fiz a pausa');
    assert.equal(e.store.get().breakState.lastDoneAt, at(10, 31));
    assert.equal(e.store.get().breakState.snoozedUntil, null);
    assert.equal(e.store.get().logs.breaks.filter((b) => b.status === 'done').length, 1);
    assert.match(e.text(), /Próxima pausa às 12:01/);
  }));

test('pausas: configurar intervalo e desativar lembretes', () =>
  withApp({ at: at(9, 0) }, async (e) => {
    await e.go('/pausas');
    const row = e.$$('.item').find((i) => i.textContent.includes('Pausas'));
    e.click(e.byText('button', 'Ajustar', row));
    e.set(e.field('intervalMin'), '45');
    e.set(e.field('end'), '08:00');
    await e.submitSheet();
    assert.match(e.$('.form-error').textContent, /depois do início/);
    e.set(e.field('end'), '17:00');
    e.field('enabled').checked = false;
    await e.submitSheet();
    const b = e.store.get().settings.breaks;
    assert.deepEqual([b.enabled, b.intervalMin, b.end], [false, 45, '17:00']);
    assert.match(e.text(), /desativado/);
    assert.match(e.text(), /Lembretes de pausa desativados/);
  }));

test('pausas: texto honesto sobre limitações dos avisos e segurança', () =>
  withApp({}, async (e) => {
    await e.go('/pausas');
    assert.match(e.text(), /enquanto ele está aberto/);
    assert.match(e.text(), /economia de bateria/);
    assert.match(e.text(), /não use o Meu Eixo como alarme confiável/);
    assert.match(e.text(), /SAMU 192/);
  }));

test('saúde: valida pares de pressão, não interpreta valores', () =>
  withApp({}, async (e) => {
    await e.go('/saude');
    assert.match(e.text(), /não interpreta valores/);
    await e.clickText('button', 'Registrar pressão ou batimentos');
    e.set(e.field('sys'), '120');
    await e.submitSheet();
    assert.match(e.$('.form-error').textContent, /os dois valores/);
    e.set(e.field('dia'), '130');
    await e.submitSheet();
    assert.match(e.$('.form-error').textContent, /Confira a pressão/);
    e.set(e.field('dia'), '80');
    e.set(e.field('hr'), '72');
    e.set(e.field('note'), 'em repouso');
    await e.submitSheet();
    const r = e.store.get().logs.health[0];
    assert.deepEqual([r.sys, r.dia, r.hr, r.note], [120, 80, 72, 'em repouso']);
    assert.match(e.text(), /120\/80 mmHg · 72 bpm/);
    assert.doesNotMatch(e.$$('.card').at(-1).textContent, /\b(normal|alta|baixa|hipertens\w*|perigo\w*)\b/i, 'histórico só mostra os números');

    await e.clickText('#conteudo button', 'Apagar');
    assert.equal(e.store.get().logs.health.length, 0);
    await e.clickText('#toasts button', 'Desfazer');
    assert.equal(e.store.get().logs.health.length, 1);
  }));

test('música: aceita só links http(s), agrupa por tipo e abre em nova aba com rel seguro', () =>
  withApp({}, async (e) => {
    await e.go('/musica');
    await e.clickText('button', 'Adicionar playlist');
    e.set(e.field('label'), 'Maldosa');
    e.set(e.field('url'), 'javascript:alert(1)');
    await e.submitSheet();
    assert.match(e.$('.form-error').textContent, /http:\/\/ ou https:\/\//);
    assert.equal(e.store.get().playlists.length, 0);

    e.set(e.field('label'), 'Foco profundo');
    e.set(e.field('url'), 'https://open.spotify.com/playlist/abc123');
    e.set(e.field('kind'), 'focus');
    await e.submitSheet();
    assert.equal(e.store.get().playlists.length, 1);
    const link = e.byText('a', 'Abrir');
    assert.equal(link.getAttribute('href'), 'https://open.spotify.com/playlist/abc123');
    assert.equal(link.getAttribute('target'), '_blank');
    assert.match(link.getAttribute('rel'), /noopener/);

    await e.go('/');
    assert.match(e.text(), /Abrir: Foco profundo/);
  }));

test('mobilidade e mindfulness: concluir registra e mostra feitos de hoje', () =>
  withApp({}, async (e) => {
    await e.go('/mobilidade');
    assert.match(e.text(), /Pare se sentir dor/);
    await e.clickText('button', 'Ver passos');
    assert.ok(e.$('ol li'));
    await e.clickText('#conteudo button', 'Concluir');
    const m = e.store.get().logs.mobility[0];
    assert.equal(m.kind, 'mobility');
    assert.match(e.text(), /Concluído 1× hoje/);
  }));

test('backup: importar substitui dados após confirmação; arquivo inválido é recusado', () =>
  withApp({}, async (e) => {
    const { buildBackup } = await import('../src/js/core/backup.js');
    const { importBackupText } = await import('../src/js/views/settings.js');

    const original = defaultState();
    original.logs.water.push({ id: 'w', date: '2026-10-19', ts: at(9, 0, 19), ml: 400 });
    original.settings.water.goalMl = 3000;
    const file = JSON.stringify(buildBackup(original, at(12)));

    assert.equal(await importBackupText(e.app, '{ruim'), false);
    assert.match(e.$('#toasts').textContent, /JSON válido/);
    assert.equal(e.store.get().settings.water.goalMl, 2000);

    const pending = importBackupText(e.app, file);
    await tick();
    assert.match(e.$('.sheet').textContent, /substitui TODOS os dados/);
    await e.clickText('.sheet button', 'Cancelar');
    assert.equal(await pending, false);
    assert.equal(e.store.get().settings.water.goalMl, 2000, 'cancelar não altera nada');

    const pending2 = importBackupText(e.app, file);
    await tick();
    await e.clickText('.sheet button', 'Substituir meus dados');
    assert.equal(await pending2, true);
    assert.equal(e.store.get().settings.water.goalMl, 3000);
    assert.equal(e.store.get().logs.water[0].ml, 400);
  }));

test('ajustes: exportar gera arquivo e registra data; apagar tudo exige confirmação', () =>
  withApp({}, async (e) => {
    await e.go('/ajustes');
    assert.match(e.text(), /último backup: nunca/);
    assert.match(e.text(), /não é criptografado/);
    assert.match(e.text(), /Nenhum dado de saúde é enviado/);

    e.store.update((s) => s.logs.water.push({ id: 'w', date: '2026-10-20', ts: at(9), ml: 250 }));
    const { downloadBackup } = await import('../src/js/views/settings.js');
    const realCreate = URL.createObjectURL;
    let blob = null;
    URL.createObjectURL = (b) => { blob = b; return 'blob:teste'; };
    try {
      downloadBackup(e.app);
    } finally {
      URL.createObjectURL = realCreate;
    }
    const parsed = JSON.parse(await blob.text());
    assert.equal(parsed.app, 'meu-eixo');
    assert.equal(parsed.data.logs.water[0].ml, 250);
    assert.equal(e.store.get().meta.lastExportAt, at(10));

    await e.clickText('button', 'Apagar todos os dados');
    await e.clickText('.sheet button', 'Cancelar');
    assert.equal(e.store.get().logs.water.length, 1);
    await e.clickText('button', 'Apagar todos os dados');
    await e.clickText('.sheet button', 'Apagar tudo');
    assert.equal(e.store.get().logs.water.length, 0);
  }));

test('segurança: texto do usuário nunca vira HTML', () =>
  withApp({ at: at(7, 40) }, async (e) => {
    const evil = '<img src=x onerror="window.pwned=1">';
    e.store.update((s) => {
      s.meals[0].name = evil;
      s.logs.checkins.push({ id: 'c', date: '2026-10-20', ts: at(7), mood: 3, energy: 3, stress: 3, disposition: 3, note: evil });
      s.playlists.push({ id: 'p', label: evil, url: 'https://example.com', kind: 'focus' });
    });
    await e.go('/comer');
    assert.equal(e.$('#conteudo img'), null);
    assert.ok(e.text().includes(evil));
    await e.go('/musica');
    assert.equal(e.$('#conteudo img'), null);
    assert.equal(e.win.pwned, undefined);
  }));

test('armazenamento indisponível: avisa na tela de ajustes', async () => {
  const env = await boot({});
  try {
    env.storage.setItem = () => { throw new Error('quota'); };
    env.store.update((s) => s.logs.water.push({ id: 'w', date: '2026-10-20', ts: at(9), ml: 250 }));
    await env.go('/ajustes');
    assert.match(env.text(), /Não foi possível gravar os últimos dados/);
  } finally {
    env.stop();
  }
});

test('boas-vindas: aparece na primeira vez e some após "Entendi"', () =>
  withApp({}, async (e) => {
    assert.match(e.text(), /Bem-vindo ao Meu Eixo/);
    await e.clickText('button', 'Entendi');
    assert.equal(e.store.get().meta.welcomed, true);
    assert.doesNotMatch(e.text(), /Bem-vindo ao Meu Eixo/);
  }));
