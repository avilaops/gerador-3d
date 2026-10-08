/**
 * Visualizador de equipamento (extraído do protótipo do Peck Deck).
 *
 * Sem framework: recebe um contêiner e um EquipmentSpec (ou um modelo já
 * gerado). Serve à página de produto do site (HTML puro) e ao Arxis (via o
 * wrapper React `EquipmentViewerView`). Palco claro, sombra no piso,
 * OrbitControls, e os quatro botões: Movimento, Área de treino, Pessoa 1,75 m
 * e Medidas.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { generateEquipment, type GeneratedEquipment } from '../generate';
import type { EquipmentSpec, EquipmentSpecInput } from '../spec/schema';
import { applyPhase, captureRestPose, phaseAt, DEFAULT_CYCLE_SECONDS } from '../animation';
import { Figure } from './figure';

export type ViewerToggle = 'motion' | 'area' | 'human' | 'dims';

export interface EquipmentViewerOptions {
  /** Cor do palco. */
  background?: number | string;
  /** Cor de destaque (área de treino). */
  accent?: number | string;
  /** Gira sozinho até o primeiro toque. Padrão: sim, salvo prefers-reduced-motion. */
  autoRotate?: boolean;
  /** Renderiza a barra de botões embaixo do canvas. Padrão: true. */
  toolbar?: boolean;
  /** Estado inicial dos botões. */
  initial?: Partial<Record<ViewerToggle, boolean>>;
  /** Necessário para prints/miniaturas (lê o canvas depois do render). */
  preserveDrawingBuffer?: boolean;
  /**
   * Opções de cor que o visitante pode trocar no modelo: uma linha de amostras por
   * papel do material (estrutura, braços, estofado). Cada opção é [nome, #rrggbb].
   */
  palette?: Partial<Record<ColorRole, { label: string; options: readonly (readonly [string, string])[] }>>;
}

export type ColorRole = 'frame' | 'accent' | 'upholstery';

const LABELS: Record<ViewerToggle, string> = {
  motion: 'Movimento',
  area: 'Área de treino',
  human: 'Pessoa 1,75 m',
  dims: 'Medidas',
};

/** Peso do reflexo do ambiente por material (o padrão é 0,4). */
const ENV_INTENSITY: Record<string, number> = { chrome: 1, upholstery: 0.18, rubber: 0.15, plate: 0.5 };

const STYLE_ID = 'eqv-style';
const CSS = `
.eqv { display: grid; gap: 10px; }
.eqv-stage { position: relative; border-radius: 14px; overflow: hidden; aspect-ratio: 1 / 1.05; touch-action: none; background: var(--eqv-stage, #eeece7); }
.eqv-stage canvas { width: 100%; height: 100%; display: block; cursor: grab; }
.eqv-stage canvas:active { cursor: grabbing; }
.eqv-hint { position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); font: 12px/1.4 Barlow, Inter, Arial, sans-serif; color: #5f5c55; background: rgba(255,255,255,.75); border-radius: 99px; padding: 4px 12px; white-space: nowrap; pointer-events: none; transition: opacity .4s; }
.eqv-fallback { position: absolute; inset: 0; display: grid; place-items: center; color: #5f5c55; font: 13px Barlow, Inter, Arial, sans-serif; text-align: center; padding: 16px; }
.eqv-tools { display: flex; flex-wrap: wrap; gap: 8px; }
.eqv-tg { font: 14px Barlow, Inter, Arial, sans-serif; color: var(--eqv-ink, #141413); background: var(--eqv-surface, #fff); border: 1px solid var(--eqv-line, #e2dfd8); border-radius: 99px; padding: 7px 14px; cursor: pointer; }
.eqv-tg[aria-pressed="true"] { background: var(--eqv-ink, #141413); color: var(--eqv-surface, #fff); border-color: var(--eqv-ink, #141413); }
.eqv-colors { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font: 13px Barlow, Inter, Arial, sans-serif; color: var(--eqv-muted, #6d6a63); }
.eqv-colors[hidden] { display: none; }
.eqv-colors span { min-width: 68px; }
.eqv-sw { width: 28px; height: 28px; border-radius: 50%; border: 1px solid rgba(0,0,0,.25); cursor: pointer; padding: 0; }
.eqv-sw[aria-pressed="true"] { outline: 2px solid var(--eqv-ink, #141413); outline-offset: 2px; }
.eqv-sw:focus-visible { outline: 3px solid var(--eqv-accent, #96764a); outline-offset: 2px; }
.eqv-tg:focus-visible { outline: 3px solid var(--eqv-accent, #96764a); outline-offset: 2px; }
`;

function ensureStyle(doc: Document) {
  if (doc.getElementById(STYLE_ID)) return;
  const s = doc.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  doc.head.appendChild(s);
}

const fmt = (n: number, d = 1) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

export class EquipmentViewer {
  readonly element: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly hint: HTMLElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(34, 1, 0.05, 60);
  private controls: OrbitControls | null = null;
  private keyLight: THREE.DirectionalLight | null = null;
  private readonly clock = new THREE.Clock();
  private readonly buttons = new Map<ViewerToggle, HTMLButtonElement>();
  private readonly state: Record<ViewerToggle, boolean>;
  private readonly accent: THREE.Color;
  private ro: ResizeObserver | null = null;
  private raf = 0;
  private time = 0;
  private equipment: GeneratedEquipment | null = null;
  private ownsEquipment = false;
  private rest: ReturnType<typeof captureRestPose> = new Map();
  private overlays: { area: THREE.Group; human: THREE.Group; dims: THREE.Group } | null = null;
  private readonly overlayDisposables: Array<{ dispose(): void }> = [];
  private readonly colorRows: HTMLElement[] = [];
  /** Pessoa posada no equipamento (quando a família marca onde ela fica). */
  private figure: Figure | null = null;
  private readonly colors: Partial<Record<ColorRole, string>> = {};

  constructor(container: HTMLElement, opts: EquipmentViewerOptions = {}) {
    const doc = container.ownerDocument;
    ensureStyle(doc);
    const reduce =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.state = {
      motion: opts.initial?.motion ?? !reduce,
      area: opts.initial?.area ?? false,
      human: opts.initial?.human ?? false,
      dims: opts.initial?.dims ?? false,
    };
    this.accent = new THREE.Color(opts.accent ?? 0x96764a);

    this.element = doc.createElement('div');
    this.element.className = 'eqv';
    this.stage = doc.createElement('div');
    this.stage.className = 'eqv-stage';
    this.canvas = doc.createElement('canvas');
    this.canvas.setAttribute(
      'aria-label',
      'Modelo 3D do equipamento. Arraste para girar, use dois dedos ou a roda do mouse para aproximar.'
    );
    this.hint = doc.createElement('div');
    this.hint.className = 'eqv-hint';
    this.hint.textContent = 'Arraste para girar · pinça para aproximar';
    this.stage.append(this.canvas, this.hint);
    this.element.append(this.stage);

    if (opts.toolbar !== false) {
      const tools = doc.createElement('div');
      tools.className = 'eqv-tools';
      (Object.keys(LABELS) as ViewerToggle[]).forEach((k) => {
        const b = doc.createElement('button');
        b.type = 'button';
        b.className = 'eqv-tg';
        b.dataset.toggle = k;
        b.textContent = LABELS[k];
        b.setAttribute('aria-pressed', String(this.state[k]));
        b.addEventListener('click', () => this.set(k, !this.state[k]));
        this.buttons.set(k, b);
        tools.append(b);
      });
      this.element.append(tools);
    }
    for (const role of ['frame', 'accent', 'upholstery'] as ColorRole[]) {
      const group = opts.palette?.[role];
      if (!group?.options.length) continue;
      const row = doc.createElement('div');
      row.className = 'eqv-colors';
      row.dataset.role = role;
      const label = doc.createElement('span');
      label.textContent = group.label;
      row.append(label);
      for (const [name, hex] of group.options) {
        const b = doc.createElement('button');
        b.type = 'button';
        b.className = 'eqv-sw';
        b.title = name;
        b.setAttribute('aria-label', `${group.label}: ${name}`);
        b.style.background = hex;
        b.addEventListener('click', () => {
          this.setColor(role, hex);
          row.querySelectorAll('.eqv-sw').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        });
        row.append(b);
      }
      this.colorRows.push(row);
      this.element.append(row);
    }
    container.append(this.element);

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        preserveDrawingBuffer: opts.preserveDrawingBuffer ?? false,
      });
    } catch {
      this.showFallback();
      return;
    }
    const r = this.renderer;
    r.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.72;
    // Ambiente de estúdio para os reflexos do cromado e do metal pintado.
    const pmrem = new THREE.PMREMGenerator(r);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = env.texture;
    pmrem.dispose();
    this.overlayDisposables.push(env);

    this.scene.background = new THREE.Color(opts.background ?? 0xeeece7);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb9b3a6, 0.08));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 4;
    key.shadow.bias = -0.0005;
    this.scene.add(key, key.target);
    this.keyLight = key;
    const rim = new THREE.DirectionalLight(0xffffff, 0.2);
    rim.position.set(-3, 2.5, -2.5);
    this.scene.add(rim);
    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.26 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.overlayDisposables.push(groundGeo, groundMat);

    const c = new OrbitControls(this.camera, this.canvas);
    c.enableDamping = true;
    c.enablePan = false;
    c.maxPolarAngle = Math.PI / 2.04;
    c.autoRotate = opts.autoRotate ?? !reduce;
    c.autoRotateSpeed = 0.9;
    c.addEventListener('start', () => {
      c.autoRotate = false;
      this.hint.style.opacity = '0';
    });
    this.controls = c;

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.stage);
    this.resize();
    this.loop();
  }

  /** Mostra um equipamento. Aceita spec (gera aqui) ou modelo já gerado (o chamador continua dono dele). */
  setEquipment(input: EquipmentSpecInput | EquipmentSpec | GeneratedEquipment): GeneratedEquipment {
    this.clearEquipment();
    const owns = !('object' in input);
    const eq = owns
      ? generateEquipment(input as EquipmentSpecInput)
      : (input as GeneratedEquipment);
    this.equipment = eq;
    this.ownsEquipment = owns;
    this.rest = captureRestPose(eq.object, eq.articulations);
    // O ambiente de estúdio serve ao cromado; na pintura e no estofado ele lava o preto.
    eq.object.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (mat && 'envMapIntensity' in mat) mat.envMapIntensity = ENV_INTENSITY[mat.name] ?? 0.4;
    });
    (Object.entries(this.colors) as [ColorRole, string][]).forEach(([role, hex]) => this.setColor(role, hex));
    // Só mostra a linha de cor de um material que o modelo realmente usa.
    const used = new Set<string>();
    eq.object.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (mat?.name) used.add(mat.name);
    });
    this.colorRows.forEach((row) => (row.hidden = !used.has(row.dataset.role!)));
    this.scene.add(eq.object);
    this.buildOverlays(eq);
    this.frame(eq);
    this.applyState();
    return eq;
  }

  /** Troca a cor de um papel de material (estrutura, braços ou estofado) no modelo atual e nos próximos. */
  setColor(role: ColorRole, hex: string): void {
    this.colors[role] = hex;
    this.equipment?.object.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (mat && mat.name === role) mat.color.set(hex);
    });
  }

  get current(): GeneratedEquipment | null {
    return this.equipment;
  }

  set(toggle: ViewerToggle, value: boolean): void {
    this.state[toggle] = value;
    const b = this.buttons.get(toggle);
    if (b) b.setAttribute('aria-pressed', String(value));
    this.applyState();
  }

  get(toggle: ViewerToggle): boolean {
    return this.state[toggle];
  }

  /** Congela o movimento numa fase (0..1). Útil para prints. */
  setPhase(phase: number): void {
    this.set('motion', false);
    if (this.equipment)
      applyPhase(this.equipment.object, this.equipment.articulations, this.rest, phase);
  }

  /** Renderiza um quadro agora (para prints/miniaturas). */
  renderNow(): void {
    if (this.state.human) this.figure?.update();
    this.controls?.update();
    this.renderer?.render(this.scene, this.camera);
  }

  /** Posiciona a câmera por ângulos (graus), mantendo o enquadramento automático. */
  setView(azimuthDeg: number, elevationDeg: number, distanceFactor = 1): void {
    if (!this.equipment || !this.controls) return;
    this.controls.autoRotate = false;
    this.hint.style.opacity = '0';
    const size = this.equipment.bbox.getSize(new THREE.Vector3());
    const r = Math.max(size.x, size.y, size.z) * 2.05 * distanceFactor;
    const az = THREE.MathUtils.degToRad(azimuthDeg);
    const el = THREE.MathUtils.degToRad(elevationDeg);
    const t = this.controls.target;
    this.camera.position.set(
      t.x + r * Math.cos(el) * Math.sin(az),
      t.y + r * Math.sin(el),
      t.z + r * Math.cos(el) * Math.cos(az)
    );
    this.controls.update();
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.clearEquipment();
    this.controls?.dispose();
    this.overlayDisposables.forEach((d) => d.dispose());
    this.renderer?.dispose();
    this.element.remove();
  }

  // ── interno ──────────────────────────────────────────────────────────

  private showFallback() {
    this.canvas.hidden = true;
    this.hint.hidden = true;
    const f = this.element.ownerDocument.createElement('div');
    f.className = 'eqv-fallback';
    f.textContent = 'O 3D não carregou neste aparelho.';
    this.stage.append(f);
  }

  private clearEquipment() {
    if (!this.equipment) return;
    this.scene.remove(this.equipment.object);
    if (this.overlays) {
      const { area, human, dims } = this.overlays;
      for (const g of [area, human, dims]) {
        this.scene.remove(g);
        disposeTree(g);
      }
      this.overlays = null;
    }
    if (this.ownsEquipment) this.equipment.dispose();
    this.equipment = null;
  }

  private applyState() {
    if (this.overlays) {
      this.overlays.area.visible = this.state.area;
      this.overlays.human.visible = this.state.human;
      this.overlays.dims.visible = this.state.dims;
    }
    if (!this.state.motion && this.equipment && this.time === 0) {
      applyPhase(this.equipment.object, this.equipment.articulations, this.rest, 0);
    }
  }

  private frame(eq: GeneratedEquipment) {
    const size = eq.bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const target = new THREE.Vector3(0, size.y * 0.46, 0);
    if (this.controls) {
      this.controls.target.copy(target);
      this.controls.minDistance = maxDim * 0.9;
      this.controls.maxDistance = maxDim * 3.8;
    }
    const dir = new THREE.Vector3(2.7, 0.9, 3.1).normalize();
    this.camera.position.copy(target).addScaledVector(dir, maxDim * 2.05);
    if (this.keyLight) {
      const k = this.keyLight;
      const ext = maxDim * 1.3;
      k.position.set(ext * 1.2, ext * 2.2, ext * 1.5);
      Object.assign(k.shadow.camera, {
        left: -ext,
        right: ext,
        top: ext,
        bottom: -ext,
        near: 0.5,
        far: ext * 8,
      });
      k.shadow.camera.updateProjectionMatrix();
    }
    this.controls?.update();
  }

  private buildOverlays(eq: GeneratedEquipment) {
    const ta = eq.footprint.trainingArea;
    const b = eq.bbox;
    const accentHex = `#${this.accent.getHexString()}`;

    // Área de treino
    const area = new THREE.Group();
    area.name = 'overlay_training_area';
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(ta.widthM, ta.lengthM),
      new THREE.MeshBasicMaterial({
        color: this.accent,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.set((ta.minX + ta.maxX) / 2, 0.003, (ta.minZ + ta.maxZ) / 2);
    area.add(plane);
    const pts = [
      [ta.minX, ta.minZ],
      [ta.maxX, ta.minZ],
      [ta.maxX, ta.maxZ],
      [ta.minX, ta.maxZ],
      [ta.minX, ta.minZ],
    ].map(([x, z]) => new THREE.Vector3(x, 0.004, z));
    const outline = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineDashedMaterial({ color: this.accent, dashSize: 0.08, gapSize: 0.05 })
    );
    outline.computeLineDistances();
    area.add(outline);
    const al = this.label(`área de treino ${fmt(ta.areaM2)} m²`, 0.62, accentHex);
    al.position.set(0, 0.06, ta.maxZ + 0.17);
    area.add(al);

    // Pessoa de 1,75 m para escala
    const human = new THREE.Group();
    human.name = 'overlay_human';
    this.figure?.dispose();
    this.figure = null;
    const anchor = Figure.find(eq.object);
    if (anchor) {
      // A família disse onde a pessoa fica: ela aparece usando o equipamento e acompanha o movimento.
      this.figure = new Figure(eq.object, anchor, eq.articulations.map((a) => a.node));
      human.add(this.figure.group);
    } else {
      // Sem marca de pose: a pessoa fica em pé ao lado, só para dar escala.
      human.position.set(b.max.x + 0.75, 0, 0);
      const skin = new THREE.MeshStandardMaterial({ color: 0xb7b1a6, roughness: 0.9 });
      const add = (g: THREE.BufferGeometry, x: number, y: number, z = 0) => {
        const m = new THREE.Mesh(g, skin);
        m.castShadow = true;
        m.position.set(x, y, z);
        human.add(m);
        return m;
      };
      [-0.09, 0.09].forEach((x) => add(new THREE.CylinderGeometry(0.065, 0.055, 0.86, 16), x, 0.43));
      add(new THREE.CylinderGeometry(0.17, 0.14, 0.6, 20), 0, 1.15).scale.z = 0.6;
      add(new THREE.CylinderGeometry(0.045, 0.05, 0.1, 12), 0, 1.5);
      add(new THREE.SphereGeometry(0.105, 24, 16), 0, 1.645);
      [-1, 1].forEach((s) => {
        add(new THREE.CylinderGeometry(0.045, 0.04, 0.66, 12), 0.215 * s, 1.11).rotation.z = 0.06 * s;
      });
      const hl = this.label('1,75 m', 0.34);
      hl.position.set(0, 1.92, 0);
      human.add(hl);
    }

    // Medidas (cotas do catálogo, desenhadas sobre a envolvente real)
    const dims = new THREE.Group();
    dims.name = 'overlay_dimensions';
    const lm = new THREE.LineBasicMaterial({ color: 0x55524c });
    const dm = eq.spec.dimensionsMm;
    const dimLine = (
      a: THREE.Vector3,
      c: THREE.Vector3,
      tick: THREE.Vector3,
      text: string,
      at: THREE.Vector3
    ) => {
      const g = new THREE.BufferGeometry().setFromPoints([
        a,
        c,
        a.clone().add(tick),
        a.clone().sub(tick),
        c.clone().add(tick),
        c.clone().sub(tick),
      ]);
      g.setIndex([0, 1, 2, 3, 4, 5]);
      dims.add(new THREE.LineSegments(g, lm));
      const l = this.label(text, 0.42);
      l.position.copy(at);
      dims.add(l);
    };
    const zf = b.max.z + 0.17;
    dimLine(
      new THREE.Vector3(b.min.x, 0.01, zf),
      new THREE.Vector3(b.max.x, 0.01, zf),
      new THREE.Vector3(0, 0, 0.05),
      `L ${dm.width} mm`,
      new THREE.Vector3(0, 0.1, zf)
    );
    const xr = b.max.x + 0.18;
    dimLine(
      new THREE.Vector3(xr, 0.01, b.min.z),
      new THREE.Vector3(xr, 0.01, b.max.z),
      new THREE.Vector3(0.05, 0, 0),
      `C ${dm.length} mm`,
      new THREE.Vector3(xr, 0.1, 0)
    );
    const xl = b.min.x - 0.12;
    dimLine(
      new THREE.Vector3(xl, 0, b.min.z),
      new THREE.Vector3(xl, b.max.y, b.min.z),
      new THREE.Vector3(0.05, 0, 0),
      `A ${dm.height} mm`,
      new THREE.Vector3(xl, b.max.y * 0.54, b.min.z)
    );

    this.scene.add(area, human, dims);
    this.overlays = { area, human, dims };
  }

  private label(text: string, width = 0.5, color = '#141413'): THREE.Sprite {
    const c = this.element.ownerDocument.createElement('canvas');
    c.width = 320;
    c.height = 80;
    const x = c.getContext('2d');
    if (x) {
      x.fillStyle = 'rgba(255,255,255,0.92)';
      x.beginPath();
      if (typeof x.roundRect === 'function') x.roundRect(4, 8, 312, 64, 32);
      else x.rect(4, 8, 312, 64);
      x.fill();
      x.fillStyle = color;
      let size = 38;
      x.font = `600 ${size}px Barlow, Inter, Arial, sans-serif`;
      while (x.measureText(text).width > 290 && size > 16) {
        size -= 2;
        x.font = `600 ${size}px Barlow, Inter, Arial, sans-serif`;
      }
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(text, 160, 41);
    }
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false }));
    s.scale.set(width, width / 4, 1);
    s.renderOrder = 10;
    return s;
  }

  private resize() {
    if (!this.renderer) return;
    const w = this.stage.clientWidth;
    const h = this.stage.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.equipment && this.state.motion) {
      this.time += dt;
      applyPhase(
        this.equipment.object,
        this.equipment.articulations,
        this.rest,
        phaseAt(this.time / DEFAULT_CYCLE_SECONDS)
      );
    }
    if (this.state.human) this.figure?.update();
    this.controls?.update();
    this.renderer?.render(this.scene, this.camera);
  };
}

function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((mm) => {
      const map = (mm as THREE.SpriteMaterial).map;
      if (map) map.dispose();
      mm.dispose();
    });
  });
}
