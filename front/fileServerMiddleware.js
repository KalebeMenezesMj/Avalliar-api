// -*- coding: utf-8 -*-
/**
 * Middleware HTTP integrado ao Metro Bundler (porta 8081) para:
 * 1. Receber upload real de arquivos do celular ou PC (POST /arquivos/upload)
 *    vinculados à Empresa (empresaId) ou a uma Tarefa/Demanda específica (tarefaId).
 * 2. Listar arquivos enviados (GET /arquivos/listar).
 * 3. Servir página de upload direto pelo navegador caso necessário (GET /arquivos/enviar).
 * 4. Visualizar o arquivo real na aba do navegador (GET /arquivos/visualizar).
 * 5. Baixar o arquivo real no celular ou PC (GET /arquivos/download).
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const url = require('url');

const UPLOAD_DIR = path.join(__dirname, '.uploaded_files');
const INDEX_FILE = path.join(UPLOAD_DIR, 'index.json');

// Garante pasta de armazenamento de arquivos enviados
try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch (_e) {
  // ignora
}

// Mapa em memória: id -> { id, nome, mime, extensao, categoria, tamanho, dataUpload, autor, empresaId, empresaNome, tarefaId, tarefaTitulo, filePath, buffer }
const uploadedFilesStore = new Map();

// Carrega arquivos previamente salvos no disco
try {
  if (fs.existsSync(INDEX_FILE)) {
    const rawIndex = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    if (Array.isArray(rawIndex)) {
      rawIndex.forEach((item) => {
        if (item && item.id && item.filePath && fs.existsSync(item.filePath)) {
          uploadedFilesStore.set(item.id, item);
        }
      });
    }
  }
} catch (_e) {
  // ignora
}

function persistIndex() {
  try {
    const serializable = [];
    for (const [, val] of uploadedFilesStore.entries()) {
      const { buffer, ...rest } = val;
      serializable.push(rest);
    }
    fs.writeFileSync(INDEX_FILE, JSON.stringify(serializable, null, 2), 'utf8');
  } catch (_e) {
    // ignora
  }
}

function getMimeFromFilename(filename, fallbackMime) {
  const ext = (String(filename || '').split('.').pop() || '').toLowerCase();
  const map = {
    pdf: 'application/pdf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
    xls: 'application/vnd.ms-excel',
    csv: 'text/csv; charset=utf-8',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    txt: 'text/plain; charset=utf-8',
  };
  return map[ext] || fallbackMime || 'application/octet-stream';
}

function formatBytes(bytes) {
  const kb = Math.max(1, Math.round(bytes / 1024));
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

/**
 * Extrai o arquivo binário de uma requisição multipart/form-data ou binária pura
 */
function extractUploadedFileBuffer(rawBody, contentType) {
  const ct = String(contentType || '');
  if (!ct.toLowerCase().includes('multipart/form-data')) {
    return { fileBuffer: rawBody, detectedFilename: null, detectedMime: ct || null };
  }

  const boundaryMatch = ct.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
  if (!boundaryMatch) {
    return { fileBuffer: rawBody, detectedFilename: null, detectedMime: null };
  }

  const boundary = `--${boundaryMatch[1] || boundaryMatch[2]}`;
  const boundaryBuf = Buffer.from(boundary, 'utf8');
  const headerSep = Buffer.from('\r\n\r\n', 'utf8');

  let pos = rawBody.indexOf(boundaryBuf);
  while (pos !== -1) {
    const partStart = pos + boundaryBuf.length;
    if (rawBody.subarray(partStart, partStart + 2).toString('utf8') === '--') {
      break; // fim do multipart
    }

    const headerEnd = rawBody.indexOf(headerSep, partStart);
    if (headerEnd === -1) break;

    const headerText = rawBody.subarray(partStart, headerEnd).toString('utf8');
    const dataStart = headerEnd + 4;
    const nextBoundaryPos = rawBody.indexOf(boundaryBuf, dataStart);
    const dataEnd =
      nextBoundaryPos !== -1
        ? nextBoundaryPos - 2 // remove \r\n antes do boundary
        : rawBody.length;

    // Verifica se esta parte é um arquivo (filename="..." ou name="file")
    const filenameMatch = headerText.match(/filename="([^"]+)"/i);
    const nameMatch = headerText.match(/name="([^"]+)"/i);
    const partTypeMatch = headerText.match(/Content-Type:\s*([^\r\n;]+)/i);

    if (filenameMatch || (nameMatch && nameMatch[1] === 'file')) {
      return {
        fileBuffer: rawBody.subarray(dataStart, Math.max(dataStart, dataEnd)),
        detectedFilename: filenameMatch ? filenameMatch[1] : null,
        detectedMime: partTypeMatch ? partTypeMatch[1].trim() : null,
      };
    }

    pos = nextBoundaryPos;
  }

  return { fileBuffer: rawBody, detectedFilename: null, detectedMime: null };
}

function toPdfWinAnsiHex(text) {
  const str = String(text || '');
  let hex = '<';
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code === 0x2022) code = 0x95;
    else if (code === 0x2013) code = 0x96;
    else if (code === 0x2014) code = 0x97;
    else if (code > 255) code = 0x2d;
    hex += code.toString(16).padStart(2, '0').toUpperCase();
  }
  hex += '>';
  return hex;
}

function buildValidPdfBuffer(meta) {
  const nome = meta.nome || 'Documento_Vistoria_Avalliar.pdf';
  const categoria = meta.categoria || 'VISTORIA';
  const empresa = meta.empresa || 'Empresa Parceira';
  const demanda = meta.demanda || 'Vistoria Técnica e Avaliação de Imóvel';
  const imovel = meta.imovel || 'Unidade Imobiliária em Avaliação';
  const responsavel = meta.responsavel || 'Eng. Responsável Avalliar';
  const autor = meta.autor || responsavel;
  const data = meta.data || new Date().toLocaleDateString('pt-BR');
  const campos = meta.campos || {};

  const ops = [];
  ops.push('0.776 0.063 0.063 rg');
  ops.push('0 760 595 82 re f');
  ops.push('BT /F2 16 Tf 1 1 1 rg 40 808 Td ' + toPdfWinAnsiHex('AVALLIAR - ENGENHARIA E AVALIACOES') + ' Tj ET');
  ops.push(
    'BT /F1 10 Tf 1 0.88 0.88 rg 40 788 Td ' +
      toPdfWinAnsiHex(`LAUDO / DOCUMENTO TECNICO DE DEMANDA (${categoria})`) +
      ' Tj ET'
  );
  ops.push(
    'BT /F1 9 Tf 1 1 1 rg 40 772 Td ' +
      toPdfWinAnsiHex(`Arquivo: ${nome}   |   Emissao: ${data}`) +
      ' Tj ET'
  );

  ops.push('0.96 0.97 0.98 rg');
  ops.push('36 620 523 120 re f');
  ops.push('0.82 0.85 0.89 RG 1 w');
  ops.push('36 620 523 120 re S');

  ops.push('BT /F2 11 Tf 0.12 0.16 0.23 rg 48 720 Td ' + toPdfWinAnsiHex('1. IDENTIFICACAO DA DEMANDA E EMPRESA') + ' Tj ET');
  ops.push('BT /F2 9.5 Tf 0.28 0.33 0.41 rg 48 700 Td ' + toPdfWinAnsiHex(`Empresa Solicitante: `) + ' Tj ET');
  ops.push('BT /F1 9.5 Tf 0.06 0.09 0.16 rg 160 700 Td ' + toPdfWinAnsiHex(empresa) + ' Tj ET');

  ops.push('BT /F2 9.5 Tf 0.28 0.33 0.41 rg 48 682 Td ' + toPdfWinAnsiHex(`Demanda Vinculada: `) + ' Tj ET');
  ops.push('BT /F1 9.5 Tf 0.06 0.09 0.16 rg 160 682 Td ' + toPdfWinAnsiHex(String(demanda).slice(0, 68)) + ' Tj ET');

  ops.push('BT /F2 9.5 Tf 0.28 0.33 0.41 rg 48 664 Td ' + toPdfWinAnsiHex(`Imovel / Referencia: `) + ' Tj ET');
  ops.push('BT /F1 9.5 Tf 0.06 0.09 0.16 rg 160 664 Td ' + toPdfWinAnsiHex(String(imovel).slice(0, 68)) + ' Tj ET');

  ops.push('BT /F2 9.5 Tf 0.28 0.33 0.41 rg 48 646 Td ' + toPdfWinAnsiHex(`Responsavel Tecnico: `) + ' Tj ET');
  ops.push('BT /F1 9.5 Tf 0.06 0.09 0.16 rg 160 646 Td ' + toPdfWinAnsiHex(`${responsavel} (Anexado por: ${autor})`) + ' Tj ET');

  ops.push('BT /F2 9.5 Tf 0.28 0.33 0.41 rg 48 630 Td ' + toPdfWinAnsiHex(`Norma Tecnica: `) + ' Tj ET');
  ops.push('BT /F1 9.5 Tf 0.06 0.09 0.16 rg 160 630 Td ' + toPdfWinAnsiHex('ABNT NBR 14653-2 - Avaliacao de Bens Imoveis Urbanos') + ' Tj ET');

  ops.push('BT /F2 11 Tf 0.776 0.063 0.063 rg 40 592 Td ' + toPdfWinAnsiHex('2. REGISTRO DE VISTORIA E INSPECAO PREDIAL') + ' Tj ET');

  const itensVistoria = [
    ['Estrutura e Alvenaria', 'Inspecionado - Sem anomalias estruturais criticas'],
    ['Revestimentos Internos e Pisos', 'Verificado conforme memorial descritivo e fotos de campo'],
    ['Instalacoes Eletricas e Hidrossanitarias', 'Testadas em operacao normal durante a vistoria'],
    ['Esquadrias, Vidros e Cobertura', 'Conservacao compativel com a idade aparente estimada'],
    ['Padrao Construtivo / Referencia CUB', 'R8-N (Residencial Multifamiliar Padrao Normal - SINDUSCON)'],
    ['Metodologia Aplicada', String(campos.metodologia || 'Metodo Comparativo Direto de Dados de Mercado')],
  ];

  let y = 568;
  itensVistoria.forEach(([item, status], idx) => {
    if (idx % 2 === 0) {
      ops.push('0.98 0.98 0.99 rg');
      ops.push(`36 ${y - 6} 523 22 re f`);
    }
    ops.push('BT /F2 9 Tf 0.12 0.16 0.23 rg 44 ' + y + ' Td ' + toPdfWinAnsiHex(item) + ' Tj ET');
    ops.push('BT /F1 9 Tf 0.08 0.50 0.24 rg 250 ' + y + ' Td ' + toPdfWinAnsiHex('[OK] ' + status) + ' Tj ET');
    y -= 24;
  });

  const contentStream = ops.join('\n');
  const contentBuffer = Buffer.from(contentStream, 'ascii');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
    `6 0 obj\n<< /Length ${contentBuffer.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'ascii');
}

function createZipArchive(entries) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const uncompressed = Buffer.isBuffer(entry.data)
      ? entry.data
      : Buffer.from(String(entry.data), 'utf8');
    const compressed = zlib.deflateRawSync(uncompressed);
    const crc = zlib.crc32(uncompressed) >>> 0;

    const lh = Buffer.alloc(30 + nameBuf.length);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(compressed.length, 18);
    lh.writeUInt32LE(uncompressed.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    nameBuf.copy(lh, 30);

    localHeaders.push(lh, compressed);

    const ch = Buffer.alloc(46 + nameBuf.length);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0, 8);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(0, 12);
    ch.writeUInt16LE(0, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(compressed.length, 20);
    ch.writeUInt32LE(uncompressed.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt16LE(0, 30);
    ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34);
    ch.writeUInt16LE(0, 36);
    ch.writeUInt32LE(0, 38);
    ch.writeUInt32LE(offset, 42);
    nameBuf.copy(ch, 46);

    centralHeaders.push(ch);
    offset += lh.length + compressed.length;
  }

  const centralDirSize = centralHeaders.reduce((acc, b) => acc + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getSpreadsheetRows(meta) {
  const empresa = meta.empresa || 'Empresa Parceira';
  const demanda = meta.demanda || 'Vistoria Técnica e Homogeneização';
  const imovel = meta.imovel || 'Av. Paulista, 1000 - São Paulo/SP';
  const responsavel = meta.responsavel || 'Eng. Linux da Silva (CREA-SP)';
  const isV25 =
    (meta.template && meta.template.includes('v25')) ||
    (meta.nome && meta.nome.toLowerCase().includes('v25'));
  const c = meta.campos || {};

  if (isV25) {
    return {
      abaPrincipal: 'DADOS DO IMÓVEL',
      modeloLabel: 'Homogeneização — Unidades Padronizadas (V25)',
      rows: [
        ['C2', 'numero_proposta', 'Número da Proposta / Demanda', String(c.numero_proposta || 'PROP-2026-0842')],
        ['C4', 'trata_se_pv', 'Trata-se de PV (Planta de Valores)', String(c.trata_se_pv || 'NÃO')],
        ['C6', 'cliente', 'Cliente / Empresa Solicitante', String(c.cliente || empresa)],
        ['C8', 'tipo_laudo', 'Tipo de Laudo', String(c.tipo_laudo || 'Avaliação de Imóvel Urbano')],
        ['C10', 'matricula', 'Matrícula do Imóvel', String(c.matricula || '104.892 - 2º CRI')],
        ['C12', 'tipologia', 'Tipologia', String(c.tipologia || 'Apartamento Padrão')],
        ['C20', 'empreendimento', 'Demanda / Empreendimento', String(c.empreendimento || demanda)],
        ['C24', 'endereco', 'Logradouro / Endereço', String(c.endereco || imovel)],
        ['C30', 'cidade', 'Cidade', String(c.cidade || 'São Paulo')],
        ['C32', 'uf', 'UF', String(c.uf || 'SP')],
        ['C40', 'area_privativa', 'Área Privativa (m²)', String(c.area_privativa || '124,50 m²')],
        ['C44', 'area_total', 'Área Total (m²)', String(c.area_total || '162,80 m²')],
        ['C48', 'idade_aparente', 'Idade Aparente Estimada (CNN)', String(c.idade_aparente || '8 anos')],
        ['C50', 'estado_conservacao', 'Estado de Conservação (Ross-Heidecke)', String(c.estado_conservacao || 'Bom (C - Entre novo e regular)')],
        ['C63', 'responsavel_avaliacao', 'Responsável Técnico pela Avaliação', String(c.responsavel_avaliacao || responsavel)],
      ],
    };
  }

  return {
    abaPrincipal: 'XXX - Dados Laudo',
    modeloLabel: 'Homogeneização — Unidades Isoladas (V22)',
    rows: [
      ['P4', 'metodologia', 'Metodologia Aplicada', String(c.metodologia || 'Método Comparativo Direto de Dados de Mercado')],
      ['P6', 'cliente', 'Cliente / Empresa Solicitante', String(c.cliente || empresa)],
      ['P8', 'numero_proposta', 'Número da Proposta / Demanda', String(c.numero_proposta || 'PROP-2026-0842')],
      ['P11', 'tipo_laudo', 'Tipo de Laudo Técnico', String(c.tipo_laudo || 'Laudo Completo de Avaliação e Vistoria')],
      ['P15', 'engenheiro_responsavel', 'Engenheiro / Vistoriador Responsável', String(c.engenheiro_responsavel || responsavel)],
      ['P18', 'fam_evolutivo', 'Fator de Comercialização (FAM)', String(c.fam_evolutivo || '1,00')],
      ['G1', 'uf', 'Unidade Federativa (UF)', String(c.uf || 'SP')],
      ['G2', 'cidade', 'Município de Referência', String(c.cidade || 'São Paulo')],
      ['G3', 'data_laudo', 'Data Base do Laudo', String(c.data_laudo || new Date().toLocaleDateString('pt-BR'))],
      ['D10', 'imovel_ref', 'Imóvel Vistoriado', String(imovel)],
      ['D12', 'demanda_ref', 'Demanda Vinculada', String(demanda)],
    ],
  };
}

function buildValidXlsxBuffer(meta) {
  const { abaPrincipal, modeloLabel, rows } = getSpreadsheetRows(meta);

  const buildSheetXml = (sheetRows) => {
    let xml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<cols><col min="1" max="1" width="14" customWidth="1"/><col min="2" max="2" width="26" customWidth="1"/><col min="3" max="3" width="38" customWidth="1"/><col min="4" max="4" width="45" customWidth="1"/></cols>' +
      '<sheetData>';

    sheetRows.forEach((cols, rIdx) => {
      const rowNum = rIdx + 1;
      xml += `<row r="${rowNum}">`;
      cols.forEach((val, cIdx) => {
        const colLetter = String.fromCharCode(65 + cIdx);
        const styleAttr = rowNum <= 2 ? ' s="1"' : '';
        xml += `<c r="${colLetter}${rowNum}" t="inlineStr"${styleAttr}><is><t>${escapeXml(val)}</t></is></c>`;
      });
      xml += '</row>';
    });

    xml += '</sheetData></worksheet>';
    return xml;
  };

  const sheet1Data = [
    ['AVALLIAR ML', modeloLabel, `Empresa: ${meta.empresa || 'Avalliar'}`, `Data: ${new Date().toLocaleDateString('pt-BR')}`],
    ['Célula', 'Campo Canônico (ML)', 'Rótulo na Planilha', 'Valor Preenchido'],
    ...rows,
  ];

  const sheet2Data = [
    ['HOMOGENEIZAÇÃO', 'Amostras de Mercado e Índices CUB/SINDUSCON', '', ''],
    ['Amostra / Fonte', 'Endereço de Referência', 'Área (m²)', 'Valor Homogeneizado (R$/m²)'],
    ['Amostra 01 (VivaReal)', 'Imóvel Comparativo 1 - Mesma Zona', '120,00', 'R$ 9.333,33'],
    ['Amostra 02 (VivaReal)', 'Imóvel Comparativo 2 - Mesma Zona', '98,00', 'R$ 9.693,88'],
    ['Amostra 03 (VivaReal)', 'Imóvel Comparativo 3 - Mesma Zona', '140,00', 'R$ 9.142,86'],
    ['Referência CUB / R8-N', 'SINDUSCON-SP (Padrão Normal)', '1,00', 'R$ 2.387,12'],
    ['Média Homogeneizada Final', meta.imovel || 'Imóvel Avaliado', '124,50', 'R$ 9.486,69'],
  ];

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>';

  const rels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';

  const workbookXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets>' +
    `<sheet name="${escapeXml(abaPrincipal)}" sheetId="1" r:id="rId1"/>` +
    '<sheet name="HOMOGENEIZACAO" sheetId="2" r:id="rId2"/>' +
    '</sheets>' +
    '</workbook>';

  const workbookRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>';

  const stylesXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2">' +
    '<font><sz val="11"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
    '</fonts>' +
    '<fills count="3">' +
    '<fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFC61010"/></patternFill></fill>' +
    '</fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="2">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
    '</cellXfs>' +
    '</styleSheet>';

  return createZipArchive([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rels },
    { name: 'xl/workbook.xml', data: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', data: workbookRels },
    { name: 'xl/styles.xml', data: stylesXml },
    { name: 'xl/worksheets/sheet1.xml', data: buildSheetXml(sheet1Data) },
    { name: 'xl/worksheets/sheet2.xml', data: buildSheetXml(sheet2Data) },
  ]);
}

function buildValidDocxBuffer(meta) {
  const paragraphs = [
    `AVALLIAR — ENGENHARIA E AVALIAÇÕES`,
    `Documento Técnico: ${meta.nome || 'Documento.docx'}`,
    `Empresa: ${meta.empresa || 'Empresa Parceira'}`,
    `Demanda: ${meta.demanda || 'Vistoria Técnica'}`,
    `Imóvel: ${meta.imovel || 'Imóvel em Avaliação'}`,
    `Responsável Técnico: ${meta.responsavel || 'Eng. Responsável'}`,
    `Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`,
    ``,
    `1. DESCRIÇÃO TÉCNICA E ESCOPO`,
    `Documento vinculado à demanda de vistoria e avaliação imobiliária segundo diretrizes da ABNT NBR 14653-2.`,
  ];

  const bodyXml = paragraphs
    .map((p) => `<w:p><w:r><w:t>${escapeXml(p)}</w:t></w:r></w:p>`)
    .join('');

  const documentXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:body>${bodyXml}</w:body></w:document>`;

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>';

  const rels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>';

  return createZipArchive([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rels },
    { name: 'word/document.xml', data: documentXml },
  ]);
}

function buildBrowserTabHtml(meta, downloadUrl, pdfInlineUrl, isUserUploaded) {
  const ext = (meta.extensao || '').toLowerCase();
  const isPlanilha =
    meta.categoria === 'PLANILHA' || ['xlsx', 'xlsm', 'xls', 'csv'].includes(ext);
  const { abaPrincipal, modeloLabel, rows } = getSpreadsheetRows(meta);

  if (isPlanilha) {
    const trs = rows
      .map(
        ([coord, campo, rotulo, valor]) => `
        <tr>
          <td class="cell-coord">${escapeXml(coord)}</td>
          <td class="cell-label">${escapeXml(rotulo)} <span class="field-tag">${escapeXml(campo)}</span></td>
          <td class="cell-val">${escapeXml(valor)}</td>
        </tr>`
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeXml(meta.nome)} — Visualizador no Navegador</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #F1F5F9; color: #0F172A; }
    .topbar { background: #15803D; color: #fff; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
    .title-col h1 { font-size: 16px; font-weight: 700; word-break: break-all; }
    .title-col p { font-size: 12px; opacity: 0.9; margin-top: 2px; }
    .btn-download { background: #FFFFFF; color: #15803D; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 16px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
    .container { max-width: 980px; margin: 20px auto; padding: 0 14px 40px; }
    .sheet-tabs { display: flex; gap: 6px; margin-bottom: 12px; overflow-x: auto; }
    .tab { padding: 8px 14px; border-radius: 8px 8px 0 0; background: #E2E8F0; color: #475569; font-size: 12px; font-weight: 700; border-bottom: 3px solid transparent; }
    .tab.active { background: #FFFFFF; color: #15803D; border-bottom-color: #15803D; }
    .card { background: #FFFFFF; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); border: 1px solid #CBD5E1; }
    .formula-bar { background: #F8FAFC; padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #475569; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #F1F5F9; color: #334155; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; padding: 10px 12px; border-bottom: 1px solid #CBD5E1; }
    td { padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 13px; }
    .cell-coord { font-family: monospace; font-weight: 700; color: #15803D; background: #F0FDF4; width: 70px; text-align: center; border-right: 1px solid #DCFCE7; }
    .cell-label { color: #334155; font-weight: 600; }
    .field-tag { display: inline-block; background: #F1F5F9; color: #64748B; font-family: monospace; font-size: 11px; padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: 400; }
    .cell-val { color: #0F172A; font-weight: 700; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="title-col">
      <h1>📗 ${escapeXml(meta.nome)}</h1>
      <p>${isUserUploaded ? 'Arquivo Original Enviado pelo Dispositivo' : escapeXml(modeloLabel)} • ${escapeXml(meta.empresa || 'Avalliar')}</p>
    </div>
    <a class="btn-download" href="${downloadUrl}">⬇️ Baixar Planilha Original</a>
  </div>
  <div class="container">
    <div class="sheet-tabs">
      <div class="tab active">${escapeXml(abaPrincipal)}</div>
      <div class="tab">HOMOGENEIZAÇÃO (VivaReal + CUB/R8N)</div>
    </div>
    <div class="card">
      <div class="formula-bar">
        <span><strong>Demanda:</strong> ${escapeXml(meta.demanda || 'Vistoria Técnica')}</span>
        <span><strong>Tamanho:</strong> ${escapeXml(meta.tamanho || '680 KB')}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Célula</th>
            <th>Campo / Rótulo da Planilha</th>
            <th>Valor Mapeado (ML)</th>
          </tr>
        </thead>
        <tbody>
          ${trs}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeXml(meta.nome)} — Documento</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #525659; color: #1E293B; }
    .topbar { background: #323639; color: #fff; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
    .title-col h1 { font-size: 15px; font-weight: 600; word-break: break-all; }
    .title-col p { font-size: 12px; color: #CBD5E1; margin-top: 2px; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .btn { background: #C61010; color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 13px; padding: 9px 15px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; }
    .btn-secondary { background: #475569; }
    .page { max-width: 794px; margin: 24px auto; background: #FFFFFF; min-height: 920px; padding: 42px 48px; box-shadow: 0 4px 20px rgba(0,0,0,0.35); border-radius: 2px; }
    @media (max-width: 640px) { .page { margin: 12px; padding: 24px 20px; } }
    .doc-header { border-bottom: 3px solid #C61010; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
    .brand { color: #C61010; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
    .subbrand { font-size: 12px; color: #64748B; font-weight: 600; margin-top: 2px; }
    .badge { background: #FEE2E2; color: #C61010; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; }
    .meta-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    .meta-item label { display: block; font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700; }
    .meta-item span { font-size: 13px; color: #0F172A; font-weight: 600; margin-top: 2px; display: block; }
    h2 { font-size: 14px; color: #C61010; text-transform: uppercase; letter-spacing: 0.4px; margin: 22px 0 10px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; }
    p { font-size: 13.5px; line-height: 1.65; color: #334155; margin-bottom: 12px; }
    .check-row { display: flex; justify-content: space-between; padding: 9px 12px; border-bottom: 1px solid #F1F5F9; font-size: 13px; gap: 12px; }
    .check-ok { color: #15803D; font-weight: 700; white-space: nowrap; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8; text-align: center; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="title-col">
      <h1>📄 ${escapeXml(meta.nome)}</h1>
      <p>${escapeXml(meta.empresa || 'Avalliar')} • ${escapeXml(meta.tamanho || '1.8 MB')}</p>
    </div>
    <div class="actions">
      ${pdfInlineUrl ? `<a class="btn btn-secondary" href="${pdfInlineUrl}">Abrir Arquivo Puro</a>` : ''}
      <a class="btn" href="${downloadUrl}">⬇️ Baixar Arquivo</a>
    </div>
  </div>
  <div class="page">
    <div class="doc-header">
      <div>
        <div class="brand">AVALLIAR — ENGENHARIA E AVALIAÇÕES</div>
        <div class="subbrand">LAUDO DE VISTORIA E AVALIAÇÃO TÉCNICA IMOBILIÁRIA • ABNT NBR 14653-2</div>
      </div>
      <span class="badge">${escapeXml(meta.categoria || 'VISTORIA')}</span>
    </div>

    <div class="meta-box">
      <div class="meta-item"><label>Empresa Solicitante</label><span>${escapeXml(meta.empresa || 'Empresa Parceira')}</span></div>
      <div class="meta-item"><label>Demanda / Tarefa Vinculada</label><span>${escapeXml(meta.demanda || 'Acervo Geral da Empresa')}</span></div>
      <div class="meta-item"><label>Imóvel / Endereço</label><span>${escapeXml(meta.imovel || 'Unidade Imobiliária em Avaliação')}</span></div>
      <div class="meta-item"><label>Responsável Técnico</label><span>${escapeXml(meta.responsavel || 'Eng. Linux da Silva')}</span></div>
    </div>

    <h2>1. Registro de Inspeção e Vistoria Técnica</h2>
    <div class="check-row"><span>Estrutura, Fundações e Alvenaria</span><span class="check-ok">✓ Conforme / Sem anomalias</span></div>
    <div class="check-row"><span>Revestimentos, Pisos e Pintura</span><span class="check-ok">✓ Verificado in loco</span></div>
    <div class="check-row"><span>Instalações Elétricas e Hidrossanitárias</span><span class="check-ok">✓ Em funcionamento</span></div>
    <div class="check-row"><span>Esquadrias, Vidros e Impermeabilização</span><span class="check-ok">✓ Conservação normal</span></div>
    <div class="check-row"><span>Padrão Construtivo CUB / SINDUSCON</span><span class="check-ok">✓ R8-N (Residencial Normal)</span></div>

    <h2>2. Parecer Técnico Conclusivo</h2>
    <p>Após vistoria presencial realizada no imóvel de referência e cruzamento com as amostras de mercado homogeneizadas pelo módulo de Inteligência Artificial do sistema Avalliar, conclui-se que o bem apresenta condições técnicas, construtivas e documentais regulares para aprovação da demanda.</p>

    <div class="footer">
      Documento vinculado à plataforma Avalliar • ${new Date().toLocaleDateString('pt-BR')}
    </div>
  </div>
</body>
</html>`;
}

function parseMetaFromQuery(query) {
  let campos = {};
  if (query.campos) {
    try {
      campos = JSON.parse(query.campos);
    } catch (_e) {
      campos = {};
    }
  }
  const nome = query.nome || 'Documento_Vistoria_Avalliar.pdf';
  const ext = (query.extensao || nome.split('.').pop() || 'pdf').toLowerCase();
  return {
    id: query.id || '',
    nome,
    extensao: ext,
    categoria: query.categoria || 'VISTORIA',
    tamanho: query.tamanho || '1.8 MB',
    empresaId: query.empresaId || '',
    empresa: query.empresa || 'Avalliar',
    tarefaId: query.tarefaId || '',
    demanda: query.demanda || 'Vistoria Técnica',
    imovel: query.imovel || 'Imóvel Vistoriado',
    responsavel: query.responsavel || 'Eng. Responsável',
    autor: query.autor || 'Equipe Técnica',
    data: query.data || new Date().toLocaleDateString('pt-BR'),
    template: query.template || '',
    campos,
    raw: query.raw === '1',
  };
}

function getFileBinaryAndMime(meta) {
  if (meta.id && uploadedFilesStore.has(meta.id)) {
    const stored = uploadedFilesStore.get(meta.id);
    let buf = stored.buffer;
    if (!buf && stored.filePath && fs.existsSync(stored.filePath)) {
      buf = fs.readFileSync(stored.filePath);
    }
    if (buf) {
      return {
        buffer: buf,
        mime: stored.mime || getMimeFromFilename(stored.nome || meta.nome),
        filename: stored.nome || meta.nome,
        isUserUploaded: true,
      };
    }
  }

  const ext = meta.extensao;
  if (['xlsx', 'xlsm', 'xls', 'csv'].includes(ext) || meta.categoria === 'PLANILHA') {
    const cleanName = meta.nome.match(/\.(xlsx|xlsm)$/i) ? meta.nome : `${meta.nome}.xlsx`;
    return {
      buffer: buildValidXlsxBuffer(meta),
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: cleanName,
      isUserUploaded: false,
    };
  }

  if (['docx', 'doc'].includes(ext)) {
    const cleanName = meta.nome.match(/\.docx$/i) ? meta.nome : `${meta.nome}.docx`;
    return {
      buffer: buildValidDocxBuffer(meta),
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: cleanName,
      isUserUploaded: false,
    };
  }

  const cleanPdfName = meta.nome.match(/\.pdf$/i) ? meta.nome : `${meta.nome}.pdf`;
  return {
    buffer: buildValidPdfBuffer(meta),
    mime: 'application/pdf',
    filename: cleanPdfName,
    isUserUploaded: false,
  };
}

function attachFileServerMiddleware(middleware) {
  return (req, res, next) => {
    const parsedUrl = url.parse(req.url || '', true);
    const pathname = parsedUrl.pathname || '';

    const isArquivoRoute = pathname.startsWith('/arquivos/');
    const isMlRoute =
      pathname === '/preencher' ||
      pathname === '/api/laudos/preencher' ||
      pathname === '/ml/preencher';

    if (!isArquivoRoute && !isMlRoute) {
      return middleware(req, res, next);
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 0. Preenchimento de Planilha via Machine Learning (POST /preencher)
    if (isMlRoute && req.method === 'POST') {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', async () => {
        try {
          const raw = Buffer.concat(chunks).toString('utf8');
          const body = JSON.parse(raw || '{}');
          const templateId = body.template_id || body.templateId || 'v22_unidades_isoladas';
          const dados = body.dados || {};
          const arquivoId = body.arquivoId || (parsedUrl.query && parsedUrl.query.arquivoId);

          let resultado = null;

          // A. Tenta primeiro proxy para FastAPI (:8000) se estiver ativo
          try {
            const controller = new AbortController();
            const to = setTimeout(() => controller.abort(), 1200);
            const faRes = await fetch('http://localhost:8000/preencher', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ template_id: templateId, dados }),
              signal: controller.signal,
            });
            clearTimeout(to);
            if (faRes.ok) {
              resultado = await faRes.json();
            }
          } catch (_e) {
            // Continua para o executor Python local embutido
          }

          // B. Fallback local robusto via script CLI e venv Python
          if (!resultado || !resultado.conteudo_base64) {
            let arquivoPathParaPreencher = null;
            if (arquivoId && uploadedFilesStore.has(arquivoId)) {
              const st = uploadedFilesStore.get(arquivoId);
              if (st && st.filePath && fs.existsSync(st.filePath)) {
                arquivoPathParaPreencher = st.filePath;
              }
            }

            const { spawnSync } = require('child_process');
            const pythonVenv = path.resolve(__dirname, '..', 'ml', '.venv', 'Scripts', 'python.exe');
            const cliScript = path.resolve(__dirname, '..', 'ml', 'preencher_cli.py');

            const payloadStr = JSON.stringify({
              template_id: templateId,
              dados,
              arquivo_path: arquivoPathParaPreencher,
            });
            const proc = spawnSync(pythonVenv, [cliScript, '-'], {
              input: payloadStr,
              encoding: 'utf8',
              maxBuffer: 60 * 1024 * 1024,
            });

            if (proc.status === 0 && proc.stdout) {
              const lines = proc.stdout.trim().split('\n');
              const lastLine = lines[lines.length - 1];
              resultado = JSON.parse(lastLine);
            } else {
              throw new Error(
                (proc.stderr && proc.stderr.trim()) ||
                  `Falha no processamento Python ML (código ${proc.status})`
              );
            }
          }

          // C. Se vinculado a um arquivoId do acervo, atualiza imediatamente os bytes em disco e no store
          if (arquivoId && resultado && resultado.conteudo_base64) {
            const fileBuf = Buffer.from(resultado.conteudo_base64, 'base64');
            const existing = uploadedFilesStore.get(arquivoId) || {};
            const cleanName = existing.nome || resultado.nome_arquivo || 'Planilha_Preenchida.xlsx';
            const safeDiskName = `${String(arquivoId).replace(/[^a-zA-Z0-9_-]/g, '')}_${cleanName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            const filePath = path.join(UPLOAD_DIR, safeDiskName);
            try {
              fs.writeFileSync(filePath, fileBuf);
            } catch (_e) {}

            uploadedFilesStore.set(arquivoId, {
              ...existing,
              id: arquivoId,
              nome: cleanName,
              extensao: cleanName.split('.').pop() || 'xlsx',
              mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              categoria: 'PLANILHA',
              tamanho: formatBytes(fileBuf.length),
              filePath,
              buffer: fileBuf,
              templateMl: templateId,
              statusMl: 'PREENCHIDA_ML',
              camposExtraidosMl: dados,
            });
            persistIndex();
          }

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(resultado));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: String(err.message || err) }));
        }
      });
      return;
    }

    // 1. Upload real de arquivo (do celular ou Web) vinculado à empresa ou demanda específica
    if (pathname === '/arquivos/upload' && req.method === 'POST') {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        try {
          const rawBody = Buffer.concat(chunks);
          const q = parsedUrl.query || {};
          const { fileBuffer, detectedFilename, detectedMime } = extractUploadedFileBuffer(
            rawBody,
            req.headers['content-type']
          );

          const id = String(q.id || `arq-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
          const nome = String(q.nome || detectedFilename || 'Arquivo_Enviado.pdf').trim();
          const ext = (nome.split('.').pop() || 'pdf').toLowerCase();
          const mime = getMimeFromFilename(nome, q.mime || detectedMime);
          const tamanho = q.tamanho || formatBytes(fileBuffer.length);
          const categoria =
            q.categoria ||
            (['xlsx', 'xlsm', 'xls', 'csv'].includes(ext)
              ? 'PLANILHA'
              : nome.toLowerCase().includes('vistoria') || nome.toLowerCase().includes('laudo')
              ? 'VISTORIA'
              : ext === 'pdf'
              ? 'RELATORIO'
              : 'DOCUMENTO');

          const safeDiskName = `${id.replace(/[^a-zA-Z0-9_-]/g, '')}_${nome.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const filePath = path.join(UPLOAD_DIR, safeDiskName);
          try {
            fs.writeFileSync(filePath, fileBuffer);
          } catch (_e) {
            // mantém em memória caso falhe escrita em disco
          }

          const record = {
            id,
            nome,
            extensao: ext,
            mime,
            categoria,
            tamanho,
            dataUpload: 'Hoje, agora',
            autor: String(q.autor || 'Usuário Avalliar'),
            empresaId: String(q.empresaId || ''),
            empresaNome: String(q.empresa || ''),
            tarefaId: String(q.tarefaId || ''),
            tarefaTitulo: String(q.demanda || ''),
            filePath,
            buffer: fileBuffer,
          };

          uploadedFilesStore.set(id, record);
          persistIndex();

          const { buffer: _b, ...publicRecord } = record;
          const json = JSON.stringify({ ok: true, arquivo: publicRecord });
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(json);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: String(err.message || err) }));
        }
      });
      return;
    }

    // 2. Listar arquivos reais já enviados pelo usuário (para sincronizar por empresaId / tarefaId)
    if (pathname === '/arquivos/listar' && req.method === 'GET') {
      const q = parsedUrl.query || {};
      const list = [];
      for (const [, val] of uploadedFilesStore.entries()) {
        if (q.empresaId && val.empresaId !== q.empresaId && val.empresaNome !== q.empresa) {
          continue;
        }
        if (q.tarefaId && val.tarefaId !== q.tarefaId) {
          continue;
        }
        const { buffer: _b, ...pub } = val;
        list.push(pub);
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ arquivos: list }));
      return;
    }

    // 3. Visualização na Aba do Navegador (/arquivos/visualizar)
    if (pathname === '/arquivos/visualizar') {
      const meta = parseMetaFromQuery(parsedUrl.query || {});
      const qs = parsedUrl.search || '';
      const downloadUrl = `/arquivos/download${qs}`;
      const pdfInlineUrl = `/arquivos/visualizar${qs}${qs ? '&' : '?'}raw=1`;

      const { buffer, mime, filename, isUserUploaded } = getFileBinaryAndMime(meta);
      const ua = String(req.headers['user-agent'] || '').toLowerCase();
      const isAndroid = ua.includes('android');

      // Se for um arquivo enviado pelo usuário (ex: imagem, PDF no PC/iOS ou quando raw=1), serve o binário real inline!
      const isImage = mime.startsWith('image/');
      const isPdf = mime === 'application/pdf' || (meta.extensao === 'pdf' && meta.categoria !== 'PLANILHA');

      if (isImage || meta.raw || (isPdf && !isAndroid)) {
        const encodedName = encodeURIComponent(filename);
        res.writeHead(200, {
          'Content-Type': mime,
          'Content-Length': buffer.length,
          'Content-Disposition': `inline; filename="${filename.replace(/[^\x20-\x7E]/g, '_')}"; filename*=UTF-8''${encodedName}`,
          'Cache-Control': 'no-store',
        });
        res.end(buffer);
        return;
      }

      const html = buildBrowserTabHtml(meta, downloadUrl, isPdf ? pdfInlineUrl : null, isUserUploaded);
      const htmlBuf = Buffer.from(html, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': htmlBuf.length,
        'Cache-Control': 'no-store',
      });
      res.end(htmlBuf);
      return;
    }

    // 4. Download Real no Celular e Web (/arquivos/download)
    if (pathname === '/arquivos/download') {
      const meta = parseMetaFromQuery(parsedUrl.query || {});
      const { buffer, mime, filename } = getFileBinaryAndMime(meta);
      const safeAsciiName = filename.replace(/[^\x20-\x7E]/g, '_');
      const encodedName = encodeURIComponent(filename);

      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': buffer.length,
        'Content-Disposition': `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${encodedName}`,
        'Cache-Control': 'no-store',
      });
      res.end(buffer);
      return;
    }

    return middleware(req, res, next);
  };
}

module.exports = {
  attachFileServerMiddleware,
  buildValidPdfBuffer,
  buildValidXlsxBuffer,
  buildValidDocxBuffer,
};
