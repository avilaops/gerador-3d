/**
 * Luzes do visualizador, em função do estilo de cena e do tamanho do equipamento.
 *
 * Função pura: não toca em WebGL, então os valores são testáveis. O estilo `default`
 * reproduz exatamente o visual que o visualizador sempre teve; `studio` e `dark`
 * usam três pontos de luz (principal, preenchimento e contraluz) mais sombra de contato.
 */
export type SceneStyle = 'default' | 'studio' | 'dark';
export type ViewerQuality = 'low' | 'high';

export interface LightSpec {
  position: [number, number, number];
  intensity: number;
}

export interface LightRig {
  key: LightSpec;
  /** Preenchimento sem sombra. `null` no estilo padrão, que não tem. */
  fill: LightSpec | null;
  rim: LightSpec;
  hemisphere: number;
  exposure: number;
  shadow: { extent: number; near: number; far: number; radius: number; bias: number };
  /** Sombra de contato assada sob o equipamento. */
  contactShadow: boolean;
  /** Opacidade da sombra projetada pelo mapa de sombra no piso. */
  groundShadowOpacity: number;
  /** Cor de fundo quando o chamador não escolhe uma. */
  background: number;
}

/** Valores que o visualizador usava antes deste módulo existir. */
function defaultRig(maxDim: number): LightRig {
  const ext = maxDim * 1.3;
  return {
    key: { position: [ext * 1.2, ext * 2.2, ext * 1.5], intensity: 1.1 },
    fill: null,
    rim: { position: [-3, 2.5, -2.5], intensity: 0.2 },
    hemisphere: 0.08,
    exposure: 0.72,
    shadow: { extent: ext, near: 0.5, far: ext * 8, radius: 4, bias: -0.0005 },
    contactShadow: false,
    groundShadowOpacity: 0.26,
    background: 0xeeece7,
  };
}

/**
 * Três pontos de luz. A frente do equipamento é +Z e a câmera padrão olha da direita da
 * frente, então a luz principal vem da esquerda e do alto para modelar o volume, o
 * preenchimento levanta só um pouco as sombras e o contraluz desenha a silhueta.
 */
function threePointRig(maxDim: number, dark: boolean): LightRig {
  const ext = maxDim * 1.3;
  return {
    key: { position: [-ext * 1.0, ext * 2.0, ext * 1.6], intensity: 1.05 },
    fill: { position: [ext * 1.6, ext * 0.8, ext * 1.2], intensity: 0.14 },
    rim: { position: [ext * 0.6, ext * 1.6, -ext * 2.0], intensity: dark ? 0.55 : 0.4 },
    hemisphere: 0.02,
    exposure: dark ? 0.62 : 0.66,
    shadow: { extent: ext, near: 0.5, far: ext * 8, radius: 6, bias: -0.0005 },
    contactShadow: true,
    groundShadowOpacity: dark ? 0.5 : 0.18,
    background: dark ? 0x151517 : 0xeeece7,
  };
}

export function computeLightRig(style: SceneStyle, maxDim: number): LightRig {
  const d = Number.isFinite(maxDim) && maxDim > 0 ? maxDim : 1;
  if (style === 'studio') return threePointRig(d, false);
  if (style === 'dark') return threePointRig(d, true);
  return defaultRig(d);
}

/** Tamanho do mapa de sombra: `quality` explícita manda; senão vale a regra de capacidade do aparelho. */
export function shadowMapSize(quality: ViewerQuality | undefined, cores: number, narrowLowDpi: boolean): number {
  if (quality === 'low') return 1024;
  if (quality === 'high') return 2048;
  return cores <= 4 || narrowLowDpi ? 1024 : 2048;
}
