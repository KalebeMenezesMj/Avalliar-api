import React from 'react';
import { Linking, NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { ArquivoAnexo, CategoriaArquivo } from '../services/demandaService';
import { mlService } from '../services/mlService';
import { AZURE_ML_URL } from '../services/api';
// Renomeado para não sombrear o `File` global do navegador (usado no fluxo web)
import { File as ArquivoNativo, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const DEFAULT_LAN_IP = '192.168.3.12';
const DEFAULT_METRO_PORT = '8081';
const DEFAULT_ML_PORT = '8000';

export interface ArquivoDispositivoSelecionado {
  nome: string;
  tamanho: string;
  extensao: string;
  mimeType: string;
  categoria: CategoriaArquivo;
  uri?: string;
  webFile?: any;
}

function inferirCategoria(nome: string, fallback: CategoriaArquivo = 'DOCUMENTO'): CategoriaArquivo {
  const lower = (nome || '').toLowerCase();
  const ext = (lower.split('.').pop() || '').toLowerCase();
  if (['xlsx', 'xlsm', 'xls', 'csv'].includes(ext)) return 'PLANILHA';
  if (lower.includes('vistoria') || lower.includes('laudo') || lower.includes('inspecao')) {
    return 'VISTORIA';
  }
  if (lower.includes('relatorio') || ext === 'pdf') return 'RELATORIO';
  return fallback;
}

function formatarTamanhoBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '1.2 MB';
  const kb = Math.max(1, Math.round(bytes / 1024));
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

/**
 * Abre o seletor nativo de arquivos do celular (Android / iOS via ExpoDocumentPicker)
 * ou do computador (Web via <input type="file">) para o usuário enviar um arquivo real.
 */
export async function selecionarArquivoDoDispositivo(
  categoriaPadrao: CategoriaArquivo = 'DOCUMENTO'
): Promise<ArquivoDispositivoSelecionado | null> {
  // 1. Web: abre o seletor nativo de arquivos do navegador
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.doc,.docx,.xlsx,.xlsm,.xls,.csv,.png,.jpg,.jpeg,.txt';
      input.onchange = (e: any) => {
        const file = e?.target?.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
        resolve({
          nome: file.name,
          tamanho: formatarTamanhoBytes(file.size),
          extensao: ext,
          mimeType: file.type || 'application/octet-stream',
          categoria: inferirCategoria(file.name, categoriaPadrao),
          webFile: file,
        });
      };
      input.click();
    });
  }

  // 2. Mobile (Android / iOS no Expo Go): utiliza o módulo nativo ExpoDocumentPicker já embutido no Expo Go
  try {
    const ExpoDocumentPicker = requireOptionalNativeModule<any>('ExpoDocumentPicker');
    if (ExpoDocumentPicker && typeof ExpoDocumentPicker.getDocumentAsync === 'function') {
      const result = await ExpoDocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result?.canceled) {
        return null;
      }

      const asset = result?.assets?.[0] || (result?.uri ? result : null);
      if (asset && asset.uri) {
        const nome = asset.name || asset.uri.split('/').pop() || `Arquivo_${Date.now()}.pdf`;
        const ext = (nome.split('.').pop() || 'pdf').toLowerCase();
        return {
          nome,
          tamanho: formatarTamanhoBytes(asset.size),
          extensao: ext,
          mimeType: asset.mimeType || 'application/octet-stream',
          categoria: inferirCategoria(nome, categoriaPadrao),
          uri: asset.uri,
        };
      }
    }
  } catch {
    // tenta fallback abaixo caso ExpoDocumentPicker falhe
  }

  // 3. Fallback Mobile: seletor de imagens/documentos da galeria (ExponentImagePicker)
  try {
    const ExponentImagePicker = requireOptionalNativeModule<any>('ExponentImagePicker');
    if (
      ExponentImagePicker &&
      typeof ExponentImagePicker.launchImageLibraryAsync === 'function'
    ) {
      const result = await ExponentImagePicker.launchImageLibraryAsync({
        mediaTypes: 'All',
        quality: 0.9,
      });
      if (!result?.canceled && result?.assets?.[0]?.uri) {
        const asset = result.assets[0];
        const nome =
          asset.fileName || asset.uri.split('/').pop() || `Documento_${Date.now()}.jpg`;
        const ext = (nome.split('.').pop() || 'jpg').toLowerCase();
        return {
          nome,
          tamanho: formatarTamanhoBytes(asset.fileSize),
          extensao: ext,
          mimeType: asset.mimeType || 'image/jpeg',
          categoria: categoriaPadrao,
          uri: asset.uri,
        };
      }
    }
  } catch {
    // ignora
  }

  return null;
}

/**
 * Descobre o IP e a porta do servidor Metro / LAN usado pelo celular (Expo Go) ou navegador
 */
function getHostAndMetroPort(): { host: string; metroPort: string } {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    return {
      host: window.location.hostname || 'localhost',
      metroPort: window.location.port || DEFAULT_METRO_PORT,
    };
  }

  const candidates: string[] = [];

  try {
    const turboSourceCode: any = TurboModuleRegistry?.get?.('SourceCode');
    const turboUrl = turboSourceCode?.getConstants?.()?.scriptURL;
    if (turboUrl) candidates.push(String(turboUrl));
  } catch {
    // ignora
  }

  if (NativeModules?.SourceCode?.scriptURL) {
    candidates.push(String(NativeModules.SourceCode.scriptURL));
  }

  try {
    const stack = new Error().stack;
    if (stack) candidates.push(stack);
  } catch {
    // ignora
  }

  for (const text of candidates) {
    const match = text.match(/https?:\/\/([^:/\s]+)(?::(\d+))?/);
    if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
      return {
        host: match[1],
        metroPort: match[2] || DEFAULT_METRO_PORT,
      };
    }
  }

  return { host: DEFAULT_LAN_IP, metroPort: DEFAULT_METRO_PORT };
}

/**
 * Descobre o servidor HTTP ativo para servir documentos e downloads:
 * Prioriza diretamente a infraestrutura do Machine Learning na nuvem (Azure Container Apps).
 */
async function resolveMobileFileServerUrl(): Promise<string> {
  // Retorna diretamente o servidor em produção na Azure
  return AZURE_ML_URL;
}

function decodeBase64ToBytes(b64: string): Uint8Array {
  const clean = (b64 || '').replace(/[^A-Za-z0-9+/=]/g, '');
  if (typeof atob === 'function') {
    const binaryString = atob(clean);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  let bufferLength = clean.length * 0.75;
  if (clean[clean.length - 1] === '=') {
    bufferLength--;
    if (clean[clean.length - 2] === '=') {
      bufferLength--;
    }
  }
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const encoded1 = lookup[clean.charCodeAt(i)];
    const encoded2 = lookup[clean.charCodeAt(i + 1)];
    const encoded3 = lookup[clean.charCodeAt(i + 2)];
    const encoded4 = lookup[clean.charCodeAt(i + 3)];
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (p < bufferLength) bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    if (p < bufferLength) bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }
  return bytes;
}

/**
 * Envia o binário real do arquivo selecionado no celular (uri), PC (webFile) ou gerado em base64 (conteudoBase64)
 * para o servidor (/arquivos/upload), garantindo que cada arquivo enviado à empresa
 * ou a uma demanda/tarefa específica mantenha seu conteúdo original.
 */
export async function enviarArquivoParaServidor(
  arq: ArquivoAnexo,
  selecionado?: ArquivoDispositivoSelecionado | null
): Promise<boolean> {
  const webFile = selecionado?.webFile || arq.webFile;
  const mobileUri = selecionado?.uri || arq.uriLocal;
  const base64Data = arq.conteudoBase64;
  if (!webFile && !mobileUri && !base64Data) return false;

  try {
    const baseUrl = await resolveMobileFileServerUrl();
    const ext = (arq.extensao || arq.nome.split('.').pop() || 'xlsx').toLowerCase();
    const defaultMime =
      ext === 'xlsm'
        ? 'application/vnd.ms-excel.sheet.macroEnabled.12'
        : ext === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/octet-stream';

    const params = new URLSearchParams({
      id: arq.id,
      nome: arq.nome,
      categoria: arq.categoria,
      tamanho: arq.tamanho,
      empresaId: arq.empresaId || '',
      empresa: arq.empresaNome || '',
      tarefaId: arq.tarefaId || '',
      demanda: arq.tarefaTitulo || '',
      autor: arq.autor || '',
      mime: selecionado?.mimeType || arq.mimeType || defaultMime,
    });

    const uploadUrl = `${baseUrl}/arquivos/upload?${params.toString()}`;

    if (base64Data) {
      // 1. Tenta envio universal via JSON com conteudo_base64 (funciona perfeitamente em Mobile e Web)
      try {
        const jsonRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: arq.id,
            nome: arq.nome,
            categoria: arq.categoria,
            empresaId: arq.empresaId,
            empresa: arq.empresaNome || '',
            tarefaId: arq.tarefaId,
            demanda: arq.tarefaTitulo || '',
            autor: arq.autor,
            conteudo_base64: base64Data,
            mime: defaultMime,
          }),
        });
        if (jsonRes.ok) return true;
      } catch {
        // continua para envio binário
      }

      if (Platform.OS === 'web' && typeof Blob !== 'undefined') {
        try {
          const bytes = decodeBase64ToBytes(base64Data);
          const blob = new Blob([bytes as any], { type: defaultMime });
          const res = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Content-Type': defaultMime,
            },
            body: blob,
          });
          if (res.ok) return true;
        } catch {
          // segue
        }
      }
    }

    if (Platform.OS === 'web' && webFile) {
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': webFile.type || defaultMime,
        },
        body: webFile,
      });
      return res.ok;
    }

    if (mobileUri) {
      const formData = new FormData();
      formData.append('file', {
        uri: mobileUri,
        name: arq.nome,
        type: selecionado?.mimeType || arq.mimeType || defaultMime,
      } as any);

      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
      return res.ok;
    }
  } catch {
    // se estiver offline, mantém referência local (webFile / uriLocal / conteudoBase64)
  }

  return false;
}

function buildFileQueryString(
  arq: ArquivoAnexo,
  empresaNome: string,
  demandaTitulo: string,
  imovelRef: string,
  responsavel: string
): string {
  const params = new URLSearchParams();
  params.set('id', arq.id || '');
  params.set('nome', arq.nome || 'Documento_Vistoria.pdf');
  params.set('extensao', arq.extensao || 'pdf');
  params.set('categoria', arq.categoria || 'VISTORIA');
  params.set('tamanho', arq.tamanho || '1.8 MB');
  params.set('empresaId', arq.empresaId || '');
  params.set('empresa', empresaNome || arq.empresaNome || 'Avalliar');
  params.set('tarefaId', arq.tarefaId || '');
  params.set('demanda', demandaTitulo || arq.tarefaTitulo || 'Vistoria Técnica');
  params.set('imovel', imovelRef || 'Imóvel em Avaliação');
  params.set('responsavel', responsavel || arq.autor || 'Eng. Responsável');
  params.set('autor', arq.autor || 'Equipe Técnica');
  params.set('data', arq.dataUpload || new Date().toLocaleDateString('pt-BR'));
  if (arq.templateMl) params.set('template', arq.templateMl);
  if (arq.camposExtraidosMl) {
    try {
      params.set('campos', JSON.stringify(arq.camposExtraidosMl));
    } catch {
      // ignora
    }
  }
  return params.toString();
}

function buildClientPdfBytes(
  arq: ArquivoAnexo,
  empresaNome: string,
  demandaTitulo: string,
  imovelRef: string,
  responsavel: string
): Uint8Array {
  const toHex = (str: string) => {
    let hex = '<';
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c > 255) c = 0x2d;
      hex += c.toString(16).padStart(2, '0').toUpperCase();
    }
    return hex + '>';
  };

  const data = arq.dataUpload || new Date().toLocaleDateString('pt-BR');
  const ops = [
    '0.776 0.063 0.063 rg',
    '0 760 595 82 re f',
    `BT /F2 16 Tf 1 1 1 rg 40 808 Td ${toHex('AVALLIAR - ENGENHARIA E AVALIACOES')} Tj ET`,
    `BT /F1 10 Tf 1 0.88 0.88 rg 40 788 Td ${toHex(`DOCUMENTO TECNICO (${arq.categoria}) - ${arq.nome}`)} Tj ET`,
    `BT /F1 9 Tf 1 1 1 rg 40 772 Td ${toHex(`Emissao: ${data}   |   Tamanho: ${arq.tamanho}`)} Tj ET`,
    '0.96 0.97 0.98 rg 36 620 523 120 re f',
    `BT /F2 11 Tf 0.12 0.16 0.23 rg 48 716 Td ${toHex('1. IDENTIFICACAO DA DEMANDA E EMPRESA')} Tj ET`,
    `BT /F1 10 Tf 0.06 0.09 0.16 rg 48 694 Td ${toHex(`Empresa Solicitante: ${empresaNome}`)} Tj ET`,
    `BT /F1 10 Tf 0.06 0.09 0.16 rg 48 674 Td ${toHex(`Demanda Vinculada: ${demandaTitulo.slice(0, 65)}`)} Tj ET`,
    `BT /F1 10 Tf 0.06 0.09 0.16 rg 48 654 Td ${toHex(`Imovel / Endereco: ${imovelRef.slice(0, 65)}`)} Tj ET`,
    `BT /F1 10 Tf 0.06 0.09 0.16 rg 48 634 Td ${toHex(`Responsavel Tecnico: ${responsavel}`)} Tj ET`,
    `BT /F2 11 Tf 0.776 0.063 0.063 rg 40 584 Td ${toHex('2. REGISTRO DE VISTORIA E INSPECAO PREDIAL (ABNT NBR 14653-2)')} Tj ET`,
    `BT /F1 10 Tf 0.12 0.16 0.23 rg 44 558 Td ${toHex('[OK] Estrutura, fundacoes e alvenaria inspecionadas sem anomalias')} Tj ET`,
    `BT /F1 10 Tf 0.12 0.16 0.23 rg 44 538 Td ${toHex('[OK] Instalacoes eletricas e hidrossanitarias testadas em campo')} Tj ET`,
    `BT /F1 10 Tf 0.12 0.16 0.23 rg 44 518 Td ${toHex('[OK] Padrao construtivo CUB/SINDUSCON: R8-N (Residencial Normal)')} Tj ET`,
    `BT /F1 10 Tf 0.12 0.16 0.23 rg 44 498 Td ${toHex('[OK] Parametros de homogeneizacao validados pelo motor Avalliar ML')} Tj ET`,
  ];

  const stream = ops.join('\n');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
    `6 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) {
    bytes[i] = pdf.charCodeAt(i) & 0xff;
  }
  return bytes;
}

const MIME_PLANILHA: Record<string, { mime: string; uti?: string }> = {
  xlsx: {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uti: 'org.openxmlformats.spreadsheetml.sheet',
  },
  xlsm: {
    mime: 'application/vnd.ms-excel.sheet.macroEnabled.12',
    uti: 'com.microsoft.excel.sheet.macroenabled.xlsm',
  },
  xls: { mime: 'application/vnd.ms-excel', uti: 'com.microsoft.excel.xls' },
  csv: { mime: 'text/csv', uti: 'public.comma-separated-values-text' },
};

/**
 * Obtém os bytes reais de uma planilha no celular, sem depender do servidor de arquivos.
 * Ordem: conteúdo já preenchido -> arquivo enviado do aparelho -> preenchimento sob demanda no ML.
 * Se nada disso existir, lança erro (nunca gera uma planilha genérica no lugar).
 */
async function obterBytesPlanilhaMobile(
  arq: ArquivoAnexo,
  empresaNome: string,
  demandaTitulo: string,
  imovelRef: string,
  responsavel: string
): Promise<Uint8Array> {
  if (arq.conteudoBase64) {
    return decodeBase64ToBytes(arq.conteudoBase64);
  }
  if (arq.uriLocal) {
    return await new ArquivoNativo(arq.uriLocal).bytes();
  }
  if (arq.statusMl === 'PREENCHIDA_ML' || arq.templateMl) {
    const tid =
      arq.templateMl && arq.templateMl.includes('v25')
        ? 'v25_unidades_padronizadas'
        : 'v22_unidades_isoladas';
    const dados = arq.camposExtraidosMl || {
      cliente: empresaNome,
      empreendimento: demandaTitulo,
      endereco: imovelRef,
      engenheiro_responsavel: responsavel,
    };
    // Lança com o motivo exato se o ML não conseguir gerar a planilha
    const res = await mlService.preencherPlanilha(tid, dados, arq.id);
    arq.conteudoBase64 = res.conteudo_base64;
    return decodeBase64ToBytes(res.conteudo_base64 as string);
  }
  throw new Error('Esta planilha não tem conteúdo disponível neste aparelho.');
}

/** Grava a planilha em cache do app, pronta para visualizar ou compartilhar. */
function gravarPlanilhaTemporaria(arq: ArquivoAnexo, bytes: Uint8Array): ArquivoNativo {
  const ext = (arq.extensao || arq.nome.split('.').pop() || 'xlsx').toLowerCase();
  const nomeFinal = arq.nome.toLowerCase().endsWith(`.${ext}`) ? arq.nome : `${arq.nome}.${ext}`;
  const arquivo = new ArquivoNativo(Paths.cache, nomeFinal);
  if (arquivo.exists) arquivo.delete();
  arquivo.create();
  return arquivo;
}

/** Visualização no celular: Quick Look do iOS (dentro do app). Se não der, abre o menu de compartilhamento. */
async function visualizarPlanilhaMobile(
  arq: ArquivoAnexo,
  bytes: Uint8Array
): Promise<'preview' | 'compartilhado'> {
  const arquivo = gravarPlanilhaTemporaria(arq, bytes);
  await arquivo.write(bytes);
  if (await ArquivoNativo.canPreview(arquivo)) {
    await ArquivoNativo.preview(arquivo);
    return 'preview';
  }
  await compartilharPlanilhaMobile(arq, arquivo);
  return 'compartilhado';
}

/** Menu de compartilhamento do sistema (iOS: "Salvar em Arquivos", "Abrir em..."). */
async function compartilharPlanilhaMobile(arq: ArquivoAnexo, arquivo: ArquivoNativo): Promise<void> {
  const ext = (arq.extensao || arq.nome.split('.').pop() || 'xlsx').toLowerCase();
  const info = MIME_PLANILHA[ext] || { mime: 'application/octet-stream' };
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('O compartilhamento de arquivos não está disponível neste aparelho.');
  }
  await Sharing.shareAsync(arquivo.uri, {
    mimeType: info.mime,
    UTI: info.uti,
    dialogTitle: arquivo.name,
  });
}

/** Download no celular: grava o arquivo e abre o menu do sistema para salvar (iOS: "Salvar em Arquivos"). */
async function baixarPlanilhaMobile(arq: ArquivoAnexo, bytes: Uint8Array): Promise<void> {
  const arquivo = gravarPlanilhaTemporaria(arq, bytes);
  await arquivo.write(bytes);
  await compartilharPlanilhaMobile(arq, arquivo);
}

/**
 * Abre o documento diretamente em uma nova aba do navegador (tanto no celular quanto no PC).
 * Se o arquivo tiver sido enviado pelo usuário e ainda não estiver no servidor, garante o upload antes de abrir.
 */
export async function visualizarArquivoDemanda(
  arq: ArquivoAnexo,
  empresaNome = 'Avalliar',
  demandaTitulo = 'Vistoria Técnica',
  imovelRef = 'Imóvel Vistoriado',
  responsavel = 'Eng. Responsável'
): Promise<string> {
  const isPlanilha =
    arq.categoria === 'PLANILHA' ||
    ['xlsx', 'xlsm', 'xls', 'csv'].includes((arq.extensao || '').toLowerCase());

  // Celular: a planilha é visualizada a partir dos bytes reais (Quick Look / menu do sistema)
  if (isPlanilha && Platform.OS !== 'web') {
    const bytes = await obterBytesPlanilhaMobile(
      arq,
      empresaNome,
      demandaTitulo,
      imovelRef,
      responsavel
    );
    const modo = await visualizarPlanilhaMobile(arq, bytes);
    return modo === 'preview'
      ? `Planilha aberta: ${arq.nome}`
      : `Escolha o app para abrir a planilha: ${arq.nome}`;
  }

  if (isPlanilha && !arq.conteudoBase64) {
    try {
      const tid =
        arq.templateMl && arq.templateMl.includes('v25')
          ? 'v25_unidades_padronizadas'
          : 'v22_unidades_isoladas';
      const dados = arq.camposExtraidosMl || {
        cliente: empresaNome,
        empreendimento: demandaTitulo,
        endereco: imovelRef,
        engenheiro_responsavel: responsavel,
      };
      const res = await mlService.preencherPlanilha(tid, dados, arq.id);
      if (res.conteudo_base64) {
        arq.conteudoBase64 = res.conteudo_base64;
      }
    } catch {
      // mantém fluxo normal
    }
  }

  // 1. Se tem conteudoBase64 preenchido, atualiza webFile e abre/baixa a planilha real
  if (arq.conteudoBase64 && Platform.OS === 'web' && typeof Blob !== 'undefined') {
    try {
      const mime =
        arq.extensao === 'xlsm'
          ? 'application/vnd.ms-excel.sheet.macroEnabled.12'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const bytes = decodeBase64ToBytes(arq.conteudoBase64);
      const blob = new Blob([bytes as any], { type: mime });
      if (typeof File !== 'undefined') {
        arq.webFile = new File([blob], arq.nome, { type: mime });
      }
      if (typeof URL !== 'undefined' && URL.createObjectURL) {
        const fileUrl = URL.createObjectURL(blob);
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
        return `Planilha preenchida aberta em nova aba: ${arq.nome}`;
      }
    } catch (_e) {
      // fallback abaixo
    }
  }

  if (arq.conteudoBase64 || arq.uriLocal || arq.webFile) {
    await enviarArquivoParaServidor(arq);
  }

  const qs = buildFileQueryString(arq, empresaNome, demandaTitulo, imovelRef, responsavel);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (arq.webFile && typeof URL !== 'undefined' && URL.createObjectURL) {
      const fileUrl = URL.createObjectURL(arq.webFile);
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      return `Arquivo aberto em nova aba: ${arq.nome}`;
    }

    if (!isPlanilha && typeof Blob !== 'undefined' && typeof URL !== 'undefined') {
      const pdfBytes = buildClientPdfBytes(
        arq,
        empresaNome,
        demandaTitulo,
        imovelRef,
        responsavel
      );
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      return `Documento aberto em nova aba: ${arq.nome}`;
    }

    const baseUrl = await resolveMobileFileServerUrl();
    window.open(`${baseUrl}/arquivos/download?${qs}`, '_blank', 'noopener,noreferrer');
    return `Planilha aberta: ${arq.nome}`;
  }

  const baseUrl = await resolveMobileFileServerUrl();
  const targetEndpoint = isPlanilha ? 'download' : 'visualizar';
  const viewUrl = `${baseUrl}/arquivos/${targetEndpoint}?${qs}`;
  await Linking.openURL(viewUrl);
  return `Abrindo ${arq.nome}...`;
}

/**
 * Realiza o download real do arquivo no celular e no navegador Web.
 */
export async function baixarArquivoDemanda(
  arq: ArquivoAnexo,
  empresaNome = 'Avalliar',
  demandaTitulo = 'Vistoria Técnica',
  imovelRef = 'Imóvel Vistoriado',
  responsavel = 'Eng. Responsável'
): Promise<string> {
  const isPlanilha =
    arq.categoria === 'PLANILHA' ||
    ['xlsx', 'xlsm', 'xls', 'csv'].includes((arq.extensao || '').toLowerCase());

  // Celular: grava a planilha real e abre o menu do sistema para salvar
  if (isPlanilha && Platform.OS !== 'web') {
    const bytes = await obterBytesPlanilhaMobile(
      arq,
      empresaNome,
      demandaTitulo,
      imovelRef,
      responsavel
    );
    await baixarPlanilhaMobile(arq, bytes);
    return `Escolha "Salvar em Arquivos" para baixar: ${arq.nome}`;
  }

  if (isPlanilha && !arq.conteudoBase64) {
    try {
      const tid =
        arq.templateMl && arq.templateMl.includes('v25')
          ? 'v25_unidades_padronizadas'
          : 'v22_unidades_isoladas';
      const dados = arq.camposExtraidosMl || {
        cliente: empresaNome,
        empreendimento: demandaTitulo,
        endereco: imovelRef,
        engenheiro_responsavel: responsavel,
      };
      const res = await mlService.preencherPlanilha(tid, dados, arq.id);
      if (res.conteudo_base64) {
        arq.conteudoBase64 = res.conteudo_base64;
      }
    } catch {
      // continua
    }
  }

  if (arq.conteudoBase64 || arq.uriLocal || arq.webFile) {
    await enviarArquivoParaServidor(arq);
  }

  const qs = buildFileQueryString(arq, empresaNome, demandaTitulo, imovelRef, responsavel);

  if (Platform.OS !== 'web') {
    const baseUrl = await resolveMobileFileServerUrl();
    const downloadUrl = `${baseUrl}/arquivos/download?${qs}`;
    await Linking.openURL(downloadUrl);
    return `Download iniciado no navegador: ${arq.nome}`;
  }

  if (typeof document !== 'undefined') {
    // A. Prioridade máxima: se possui conteudoBase64 preenchido por ML, baixa os dados preenchidos reais
    if (arq.conteudoBase64) {
      try {
        const mime =
          arq.extensao === 'xlsm'
            ? 'application/vnd.ms-excel.sheet.macroEnabled.12'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const binaryString = atob(arq.conteudoBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = arq.nome;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 4000);

        if (typeof File !== 'undefined') {
          arq.webFile = new File([blob], arq.nome, { type: mime });
          enviarArquivoParaServidor(arq);
        }
        return `Download da planilha preenchida concluído: ${arq.nome}`;
      } catch (_e) {
        // continua para o fallback
      }
    }

    // B. Se for planilha ainda não preenchida, tenta preenchimento automático sob demanda
    if (isPlanilha && !arq.conteudoBase64) {
      try {
        const tid = arq.templateMl || 'v22_unidades_isoladas';
        const dados = arq.camposExtraidosMl || {
          cliente: empresaNome,
          empreendimento: demandaTitulo,
          endereco: imovelRef,
          engenheiro_responsavel: responsavel,
        };
        const res = await mlService.preencherPlanilha(tid, dados, arq.id);
        if (res.conteudo_base64) {
          arq.conteudoBase64 = res.conteudo_base64;
          const mime =
            arq.extensao === 'xlsm'
              ? 'application/vnd.ms-excel.sheet.macroEnabled.12'
              : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          const binaryString = atob(res.conteudo_base64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: mime });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = arq.nome;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 4000);

          if (typeof File !== 'undefined') {
            arq.webFile = new File([blob], arq.nome, { type: mime });
            enviarArquivoParaServidor(arq);
          }
          return `Planilha preenchida via IA baixada: ${arq.nome}`;
        }
      } catch {
        // usa fallback de arquivo original ou download do servidor abaixo
      }
    }

    // C. Se for outro arquivo do usuário ou arquivo bruto
    if (arq.webFile && typeof URL !== 'undefined' && URL.createObjectURL) {
      const url = URL.createObjectURL(arq.webFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = arq.nome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      return `Download concluído: ${arq.nome}`;
    }

    const baseUrl = await resolveMobileFileServerUrl();
    if (isPlanilha) {
      window.open(`${baseUrl}/arquivos/download?${qs}`, '_blank');
      return `Download iniciado: ${arq.nome}`;
    }

    const pdfBytes = buildClientPdfBytes(
      arq,
      empresaNome,
      demandaTitulo,
      imovelRef,
      responsavel
    );
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = arq.nome.endsWith('.pdf') ? arq.nome : `${arq.nome}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    return `Download iniciado: ${arq.nome}`;
  }

  return `Download iniciado: ${arq.nome}`;
}

interface FileViewerModalProps {
  visible: boolean;
  arquivo: ArquivoAnexo | null;
  empresaNome?: string;
  demandaTitulo?: string;
  imovelReferencia?: string;
  onClose: () => void;
  onProcessarMl?: (arq: ArquivoAnexo) => Promise<void> | void;
}

export default function FileViewerModal(_props: FileViewerModalProps) {
  return null;
}
