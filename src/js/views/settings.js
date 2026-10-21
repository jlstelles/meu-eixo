// Ajustes e backup: metas, exportar/importar dados locais, apagar tudo, situação do armazenamento.

import { backupFilename, buildBackup, countRecords, parseBackup } from '../core/backup.js';
import { h } from '../ui/dom.js';
import { confirmSheet } from '../ui/sheet.js';
import { btn, card, primaryBtn } from '../ui/widgets.js';
import { openGoal } from './water.js';

const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

function fmtWhen(value) {
  try {
    return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(value);
  }
}

function backupText(app) {
  return JSON.stringify(buildBackup(app.store.get(), app.now()), null, 2);
}

function markExported(app) {
  app.store.update((s) => { s.meta.lastExportAt = app.now(); });
}

export function downloadBackup(app) {
  const blob = new Blob([backupText(app)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: backupFilename(app.now()) });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  markExported(app);
  app.toast('Backup gerado. Guarde o arquivo em local seguro.');
}

async function shareBackup(app) {
  try {
    const file = new File([backupText(app)], backupFilename(app.now()), { type: 'application/json' });
    if (!navigator.canShare?.({ files: [file] })) {
      app.toast('Este navegador não compartilha arquivos. Use “Baixar backup”.');
      return;
    }
    await navigator.share({ files: [file], title: 'Backup do Meu Eixo' });
    markExported(app);
  } catch (err) {
    if (err?.name !== 'AbortError') app.toast('Não foi possível compartilhar. Use “Baixar backup”.');
  }
}

/** Lê e valida o texto de um backup; pede confirmação antes de substituir os dados. */
export async function importBackupText(app, text) {
  const res = parseBackup(text);
  if (!res.ok) {
    app.toast(res.error, { ms: 7000 });
    return false;
  }
  const current = countRecords(app.store.get()).total;
  const lines = [
    `O arquivo tem ${res.counts.total} registro(s)${res.exportedAt ? `, exportado em ${fmtWhen(res.exportedAt)}` : ''}.`,
    `Isso substitui TODOS os dados atuais deste aparelho (${current} registro(s)). Se tiver dúvida, cancele e exporte um backup antes.`,
    res.dropped ? `${res.dropped} item(ns) inválido(s) do arquivo serão ignorados.` : null,
  ].filter(Boolean);
  const ok = await confirmSheet({ title: 'Importar este backup?', message: lines.join(' '), confirmLabel: 'Substituir meus dados', danger: true });
  if (!ok) return false;
  app.store.replace(res.state);
  app.toast('Backup importado.');
  return true;
}

function pickAndImport(app) {
  const input = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      app.toast('Arquivo grande demais para ser um backup do Meu Eixo.');
      return;
    }
    importBackupText(app, await file.text());
  });
  document.body.append(input);
  input.click();
}

async function eraseAll(app) {
  const ok = await confirmSheet({
    title: 'Apagar todos os dados?',
    message: 'Isso remove registros, metas, refeições, plano e playlists deste aparelho. Não dá para desfazer. Exporte um backup antes se quiser guardar uma cópia.',
    confirmLabel: 'Apagar tudo',
    danger: true,
  });
  if (!ok) return;
  app.store.reset();
  app.toast('Dados apagados.');
}

export function renderSettings(app) {
  const state = app.store.get();
  const status = app.store.status();
  const total = countRecords(state).total;
  const canShare = typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
  const warnings = [];
  if (status.volatile) warnings.push('Este navegador não permite salvar dados locais agora (modo privado ou bloqueio). O que você registrar será perdido ao fechar o app.');
  if (status.saveError) warnings.push('Não foi possível gravar os últimos dados (espaço cheio ou bloqueado). Exporte um backup assim que puder.');
  if (status.loadError) warnings.push('Os dados salvos antes estavam ilegíveis. Uma cópia do texto original foi preservada no armazenamento do navegador, e o app recomeçou vazio.');
  if (status.dropped) warnings.push(`${status.dropped} registro(s) inválido(s) foram ignorados ao carregar.`);

  return [
    ...warnings.map((w) => h('section', { class: 'card note', role: 'alert' }, h('p', null, w))),
    card(
      'Metas e preferências',
      h('p', { class: 'muted' }, `Meta de água: ${state.settings.water.goalMl} ml · botão rápido: ${state.settings.water.defaultMl} ml`),
      btn('Ajustar meta de água', () => openGoal(app)),
      h('div', { class: 'check' }, h('input', { type: 'checkbox', id: 'keep-on', checked: state.settings.keepScreenOn, on: { change: (ev) => app.store.update((s) => { s.settings.keepScreenOn = ev.target.checked; }) } }), h('label', { for: 'keep-on' }, 'Manter a tela ligada durante o cronômetro')),
      h('a', { class: 'btn', href: '#/pausas' }, 'Ajustar lembretes'),
    ),
    card(
      'Backup',
      h('p', null, 'Seus dados ficam só neste aparelho. Se você trocar de celular, limpar os dados do navegador ou desinstalar o app, eles podem ser perdidos. Exporte uma cópia de vez em quando.'),
      h('p', { class: 'muted' }, `${total} registro(s) guardados · último backup: ${state.meta.lastExportAt ? fmtWhen(state.meta.lastExportAt) : 'nunca'}.`),
      primaryBtn('Baixar backup', () => downloadBackup(app), 'btn-lg btn-block'),
      canShare ? btn('Compartilhar backup', () => shareBackup(app), 'btn-block') : null,
      btn('Importar backup', () => pickAndImport(app), 'btn-block'),
      h('p', { class: 'hint' }, 'O arquivo de backup não é criptografado e contém seus registros de saúde. Guarde-o em local seguro e não o compartilhe com quem você não confia.'),
    ),
    card(
      'Privacidade',
      h('p', null, 'Nenhum dado de saúde é enviado a servidores nem a serviços de análise. O app não tem login nem sincronização na nuvem. Links de playlists só são abertos quando você toca neles.'),
      h('p', { class: 'muted' }, 'O Meu Eixo é uma ferramenta de organização pessoal e não substitui um profissional de saúde.'),
    ),
    card('Zona de risco', h('p', { class: 'muted' }, 'Apaga tudo deste aparelho, sem volta.'), btn('Apagar todos os dados', () => eraseAll(app), 'btn-danger btn-block')),
  ];
}
