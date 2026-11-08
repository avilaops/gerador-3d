import fs from 'node:fs';
import path from 'node:path';

const repo = process.cwd();
const workspace = path.resolve(repo, '..');
const vedashowRoot = path.join(
  workspace,
  'marketing',
  'materiais',
  'Material',
  'vedashow-2026-09-08'
);

function csvRows(text) {
  return text
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const match = line.match(/^"(.*)","(\d+)","(.*)"$/);
      return match ? { name: match[1], bytes: Number(match[2]), extension: match[3] } : null;
    })
    .filter(Boolean);
}

function numberFromToken(token) {
  const normalized = token.replace(/-/g, '.');
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function dimensionsFromName(name) {
  const stem = name.replace(/\.(png|jpe?g|webp)$/i, '');
  if (!/^\d/.test(stem)) return null;
  const parts = stem.split('x');
  if (parts.length !== 3) return null;
  const values = parts.map(numberFromToken);
  return values.every((value) => value !== null) ? values : null;
}

function sourceRef(...parts) {
  return `workspace:${parts.join('/')}`;
}

function writeJson(relativePath, value) {
  const output = path.join(repo, relativePath);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const rows = csvRows(
  fs.readFileSync(path.join(vedashowRoot, 'vedashow-inventario.csv'), 'utf8')
).filter((row) => !row.name.endsWith('.w480.webp'));

const vedashowAssets = rows.map((row, index) => {
  const dimensions = dimensionsFromName(row.name);
  return {
    assetId: `VS-ASSET-${String(index + 1).padStart(4, '0')}`,
    sourceFile: row.name,
    sourceRef: sourceRef(
      'marketing',
      'materiais',
      'Material',
      'vedashow-2026-09-08',
      'vedashow-extraidas',
      'vedashow',
      row.name
    ),
    bytes: row.bytes,
    role: dimensions ? 'product_candidate' : 'site_or_category_asset',
    identityStatus: 'unresolved_asset_identity',
    modelStatus: 'not_modeled',
    dimensionCandidateMm: dimensions,
    dimensionStatus: dimensions ? 'filename_candidate_needs_review' : 'not_available',
    notes: dimensions
      ? 'Dimensões extraídas do nome do arquivo; confirmar ordem, unidade e correspondência com SKU/ficha técnica.'
      : 'Não usar como produto sem vincular a SKU ou ficha técnica.'
  };
});

const vedashowProductCandidates = vedashowAssets.filter(
  (asset) => asset.role === 'product_candidate'
);

writeJson('catalogs/vedashow/inventory.json', {
  schemaVersion: 1,
  companyId: 'vedashow',
  companyName: 'VedaShow',
  status: 'review_only',
  source: {
    inventory: sourceRef(
      'marketing',
      'materiais',
      'Material',
      'vedashow-2026-09-08',
      'vedashow-inventario.csv'
    ),
    extraction: 'CSV de inventário local; arquivos de imagem não são tratados como prova de identidade ou dimensão aprovada.'
  },
  summary: {
    sourceAssets: vedashowAssets.length,
    productCandidates: vedashowProductCandidates.length,
    siteOrCategoryAssets: vedashowAssets.length - vedashowProductCandidates.length,
    modeled: 0,
    approvedDimensions: 0
  },
  assets: vedashowAssets
});

writeJson('catalogs/vedashow/dimensional-contract.json', {
  schemaVersion: 1,
  companyId: 'vedashow',
  companyName: 'VedaShow',
  status: 'draft',
  unit: 'mm',
  requiredBeforeModeling: [
    'sku_or_official_code',
    'official_name',
    'category',
    'dimensions_mm_length_width_height_or_diameter_thickness',
    'approved_source_reference',
    'primary_image_linked_to_same_sku'
  ],
  rules: [
    'A filename candidate is not an approved dimension.',
    'Do not convert a candidate into an EquipmentSpec until identity and unit are confirmed.',
    'Do not reuse images, SKUs or dimensions from PK Vedações.',
    'Only approved records may enter the 3D catalog and AVX-tools manifest.'
  ],
  approval: {
    owner: null,
    approvedAt: null,
    evidence: []
  }
});

const pkSource = sourceRef('lojas.avilaops.com', 'modelo-pkvedacoes.jpg');
writeJson('catalogs/pk-vedacoes/inventory.json', {
  schemaVersion: 1,
  companyId: 'pk-vedacoes',
  companyName: 'PK Vedações',
  status: 'blocked_missing_product_export',
  source: {
    referenceImage: pkSource,
    documentation: sourceRef('lojas.avilaops.com', 'README.md'),
    finding: 'A fonte local disponível descreve busca dimensional, mas não fornece uma exportação de produtos com SKU, imagens vinculadas e medidas.'
  },
  summary: {
    sourceAssets: 1,
    productCandidates: 0,
    modeled: 0,
    approvedDimensions: 0
  },
  assets: [
    {
      assetId: 'PK-REFERENCE-0001',
      sourceFile: 'modelo-pkvedacoes.jpg',
      sourceRef: pkSource,
      role: 'brand_or_layout_reference',
      identityStatus: 'not_product_data',
      modelStatus: 'not_modeled',
      dimensionCandidateMm: null,
      dimensionStatus: 'not_available',
      notes: 'Não usar esta imagem para inferir medidas, SKU ou geometria de produtos.'
    }
  ]
});

writeJson('catalogs/pk-vedacoes/dimensional-contract.json', {
  schemaVersion: 1,
  companyId: 'pk-vedacoes',
  companyName: 'PK Vedações',
  status: 'draft',
  unit: 'mm',
  requiredBeforeModeling: [
    'sku_or_official_code',
    'official_name',
    'seal_family',
    'internal_diameter_mm',
    'external_diameter_mm',
    'height_or_thickness_mm',
    'material',
    'approved_source_reference',
    'primary_image_linked_to_same_sku'
  ],
  rules: [
    'The dimensional search fields are a contract target, not product data by themselves.',
    'Do not infer compatibility, material or dimensions from the reference image.',
    'Do not reuse images, SKUs or dimensions from VedaShow.',
    'Only approved records may enter the 3D catalog and AVX-tools manifest.'
  ],
  approval: {
    owner: null,
    approvedAt: null,
    evidence: []
  }
});

console.log(
  JSON.stringify(
    {
      pkVedacoes: { assets: 1, productCandidates: 0 },
      vedashow: {
        assets: vedashowAssets.length,
        productCandidates: vedashowProductCandidates.length
      }
    },
    null,
    2
  )
);
