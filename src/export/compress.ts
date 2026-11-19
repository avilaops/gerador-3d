/**
 * Compressão de malha (meshopt) de um GLB. **Só roda em Node**: usa `@gltf-transform` e o
 * codificador WASM do `meshoptimizer`. Não é importado pelo restante de `src/export`, para o
 * pacote continuar servindo ao navegador.
 *
 * Quem lê o GLB comprimido precisa registrar o decodificador meshopt (`MeshoptDecoder` do
 * Three.js ou do `meshoptimizer`) e suportar `KHR_mesh_quantization` (o `GLTFLoader` do Three
 * suporta). O site atual **não** registra o decodificador: por isso a compressão é uma opção, e o
 * GLB padrão continua sem ela.
 *
 * Textura KTX2 não é feita aqui: exige a ferramenta `toktx`, que não é dependência do projeto.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

async function io(): Promise<NodeIO> {
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
  // Todas as extensões padrão. A compressão também quantiza a malha e isso exige registrar
  // `KHR_mesh_quantization`; sem ela, o gltf-transform grava os acessores quantizados sem declarar
  // a extensão (aviso "extensions were not registered") e o GLB sai inválido para o validador.
  return new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
}

/** Comprime a malha do GLB com meshopt. Animação, materiais e nomes de nó são preservados. */
export async function compressMeshopt(glb: ArrayBuffer, level: 'medium' | 'high' = 'high'): Promise<ArrayBuffer> {
  const nodeIo = await io();
  const doc = await nodeIo.readBinary(new Uint8Array(glb));
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level }));
  const bytes = await nodeIo.writeBinary(doc);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** Lê um GLB (comprimido ou não) e devolve o documento, para conferir o conteúdo em testes. */
export async function readGlb(glb: ArrayBuffer) {
  return (await io()).readBinary(new Uint8Array(glb));
}
