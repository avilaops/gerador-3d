import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ThermalBoxVisualSchema, type ThermalBoxVisualInput } from './schema';

const STYLE_ID = 'thermal-box-viewer-style';
const CSS = `
.tbv { display: grid; gap: .65rem; }
.tbv-stage { position: relative; min-height: 320px; aspect-ratio: 1 / .82; overflow: hidden; border-radius: 1rem; background: #eef2f5; touch-action: none; }
.tbv-stage canvas { display: block; width: 100%; height: 100%; cursor: grab; }
.tbv-stage canvas:active { cursor: grabbing; }
.tbv-fallback { position: absolute; inset: 0; display: grid; place-items: center; padding: 1.5rem; color: #334155; text-align: center; background: #f8fafc; }
.tbv-tools { display: flex; flex-wrap: wrap; gap: .5rem; }
.tbv-tool { min-height: 42px; border: 1px solid #cbd5e1; border-radius: 999px; padding: .55rem .85rem; color: #0f172a; background: #fff; font: inherit; cursor: pointer; }
.tbv-tool:focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }
`;

function installStyle(doc: Document) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.appendChild(style);
}

function materialStyle(material: string, finish: string) {
  const colors: Record<string, number> = {
    aco_galvanizado: 0xb8c2cc,
    aco_pintado: 0x2563eb,
    aco_inoxidavel: 0xdbe4ea,
    aluminio: 0xc8d0d8,
  };
  const color = colors[material] ?? 0xcbd5e1;
  const finishStyle = {
    natural: { roughness: 0.52, metalness: 0.68 },
    pintura_eletrostatica: { roughness: 0.38, metalness: 0.3 },
    escovado: { roughness: 0.3, metalness: 0.82 },
  }[finish] ?? { roughness: 0.5, metalness: 0.45 };
  return new THREE.MeshStandardMaterial({ color, ...finishStyle });
}

function disposeTree(root: THREE.Object3D) {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    materials.forEach((material) => {
      if (material instanceof THREE.MeshBasicMaterial) material.map?.dispose();
      material.dispose();
    });
  });
}

export interface ThermalBoxViewerOptions {
  background?: number | string;
  preserveDrawingBuffer?: boolean;
}

export class ThermalBoxViewer {
  readonly element: HTMLDivElement;
  private readonly stage: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
  private readonly controls: OrbitControls;
  private readonly renderer: THREE.WebGLRenderer | null;
  private readonly disposables: THREE.Object3D[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private fallback: HTMLDivElement | null = null;
  private readonly contextLostHandler = (event: Event) => {
    event.preventDefault();
    this.showFallback('A visualização 3D foi pausada pelo dispositivo. A ficha e o formulário continuam funcionando.');
  };
  private readonly contextRestoredHandler = () => {
    if (!this.fallback) return;
    this.fallback.remove();
    this.fallback = null;
    this.canvas.hidden = false;
    this.requestRender();
  };
  private raf = 0;
  private model: THREE.Group | null = null;

  constructor(container: HTMLElement, options: ThermalBoxViewerOptions = {}) {
    const doc = container.ownerDocument;
    installStyle(doc);
    this.element = doc.createElement('div');
    this.element.className = 'tbv';
    this.stage = doc.createElement('div');
    this.stage.className = 'tbv-stage';
    this.canvas = doc.createElement('canvas');
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Visualização 3D da caixa térmica. Arraste para girar e use dois dedos para aproximar.');
    this.stage.append(this.canvas);
    this.element.append(this.stage);
    container.append(this.element);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
      });
    } catch {
      this.renderer = null;
      this.showFallback('A visualização 3D não está disponível neste aparelho. A ficha e o formulário continuam funcionando.');
      this.controls = new OrbitControls(this.camera, this.canvas);
      return;
    }
    this.renderer = renderer;
    this.canvas.addEventListener('webglcontextlost', this.contextLostHandler);
    this.canvas.addEventListener('webglcontextrestored', this.contextRestoredHandler);
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.background = new THREE.Color(options.background ?? 0xf1f4f6);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = environment.texture;
    pmrem.dispose();

    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(3, 5, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1536, 1536);
    key.shadow.normalBias = 0.01;
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -4;
    key.shadow.camera.far = 20;
    this.scene.add(key, key.target);
    const fill = new THREE.DirectionalLight(0xfff4e6, 0.8);
    fill.position.set(-4, 3, 3);
    const rim = new THREE.DirectionalLight(0xdbeafe, 1.1);
    rim.position.set(-3, 4, -4);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x64748b, 0.32), key, fill, rim);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.2 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.disposables.push(ground);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 0.35;
    this.controls.maxDistance = 12;
    this.controls.maxPolarAngle = Math.PI / 2.03;
    this.controls.addEventListener('change', () => this.requestRender());
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.stage);
    this.resize();
  }

  setModel(input: ThermalBoxVisualInput) {
    const config = ThermalBoxVisualSchema.parse(input);
    if (this.model) {
      this.scene.remove(this.model);
      disposeTree(this.model);
    }
    this.model = buildThermalBoxModel(config);
    this.scene.add(this.model);
    const model = this.model;
    const logo = model.getObjectByName('thermal_box_front_logo');
    if (config.frontLogo && logo instanceof THREE.Mesh && this.renderer) {
      const material = logo.material as THREE.MeshBasicMaterial;
      material.map = new THREE.TextureLoader().load(config.frontLogo, (texture) => {
        if (this.model !== model) return;
        const ratio = texture.image.width / texture.image.height;
        const fit = Math.min(logo.scale.x / ratio, logo.scale.y);
        logo.scale.set(fit * ratio, fit, 1);
        logo.visible = true;
        this.requestRender();
      });
      material.map.encoding = THREE.sRGBEncoding;
    }
    const bounds = new THREE.Box3().setFromObject(this.model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const radius = Math.max(size.length() * 0.58, 0.3);
    this.camera.near = Math.max(radius / 100, 0.01);
    this.camera.far = radius * 20;
    this.camera.updateProjectionMatrix();
    this.controls.target.set(center.x, Math.max(size.y * 0.45, 0.1), center.z);
    this.camera.position.set(center.x + radius * 1.8, center.y + radius * 1.15, center.z + radius * 2.1);
    this.controls.update();
    this.requestRender();
  }

  resetView() {
    if (!this.model) return;
    const bounds = new THREE.Box3().setFromObject(this.model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const radius = Math.max(size.length() * 0.58, 0.3);
    this.controls.target.set(center.x, Math.max(size.y * 0.45, 0.1), center.z);
    this.camera.position.set(center.x + radius * 1.8, center.y + radius * 1.15, center.z + radius * 2.1);
    this.controls.update();
    this.requestRender();
  }

  zoom(factor: number) {
    const direction = this.camera.position.clone().sub(this.controls.target);
    const next = THREE.MathUtils.clamp(direction.length() * factor, this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(this.controls.target).add(direction.normalize().multiplyScalar(next));
    this.controls.update();
    this.requestRender();
  }

  renderNow() { this.controls.update(); this.renderer?.render(this.scene, this.camera); }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    this.controls.dispose();
    this.canvas.removeEventListener('webglcontextlost', this.contextLostHandler);
    this.canvas.removeEventListener('webglcontextrestored', this.contextRestoredHandler);
    if (this.model) disposeTree(this.model);
    this.model = null;
    this.disposables.forEach(disposeTree);
    this.renderer?.dispose();
    this.element.remove();
  }

  private showFallback(message: string) {
    if (this.fallback) {
      this.fallback.textContent = message;
      return;
    }
    this.canvas.hidden = true;
    this.fallback = this.element.ownerDocument.createElement('div');
    this.fallback.className = 'tbv-fallback';
    this.fallback.setAttribute('role', 'status');
    this.fallback.textContent = message;
    this.stage.append(this.fallback);
  }

  private resize() {
    if (!this.renderer) return;
    const width = Math.max(this.stage.clientWidth, 1);
    const height = Math.max(this.stage.clientHeight, 1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  private requestRender() {
    if (this.raf || !this.renderer) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.controls.update();
      this.renderer?.render(this.scene, this.camera);
    });
  }
}

export function buildThermalBoxModel(config: ReturnType<typeof ThermalBoxVisualSchema.parse>) {
  const group = new THREE.Group();
  group.name = 'thermal_box';
  const width = config.dimensionsCm.width / 100;
  const height = config.dimensionsCm.height / 100;
  const depth = config.dimensionsCm.depth / 100;
  const material = materialStyle(config.material, config.finish);
  if (config.exteriorColor) material.color.set(config.exteriorColor);
  const inner = new THREE.MeshStandardMaterial({ color: 0x9aa7b2, roughness: 0.7, metalness: 0.15, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x26323d, roughness: 0.72, metalness: 0.05 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 5, Math.min(width, height, depth) * 0.04), material);
  body.position.y = height / 2 + (config.mobility === 'sem_base' ? 0 : 0.045);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const lidThickness = Math.max(Math.min(height * 0.07, 0.06), 0.018);
  if (config.lid === 'superior') addLid(group, width, depth, lidThickness, height + 0.025, material, 0);
  if (config.lid === 'dupla') {
    addLid(group, width / 2 - 0.006, depth, lidThickness, height + 0.025, material, -width / 4);
    addLid(group, width / 2 - 0.006, depth, lidThickness, height + 0.025, material, width / 4);
  }
  if (config.lid === 'frontal') {
    const door = new THREE.Mesh(new RoundedBoxGeometry(width * 0.82, height * 0.78, lidThickness, 4, lidThickness * 0.25), material);
    door.position.set(0, height * 0.5, depth / 2 + lidThickness * 0.55);
    door.castShadow = true;
    group.add(door);
  }

  if (config.frontLogo) {
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
      transparent: true, depthWrite: false, toneMapped: false,
    }));
    logo.name = 'thermal_box_front_logo';
    logo.scale.set(width * 0.58, height * 0.55, 1);
    logo.position.set(0, config.lid === 'frontal' ? height / 2 : body.position.y,
      depth / 2 + (config.lid === 'frontal' ? lidThickness * 1.05 : 0) + 0.001);
    logo.visible = false;
    group.add(logo);
  }

  for (let index = 0; index < config.dividers; index += 1) {
    const x = -width * 0.38 + (width * 0.76 * (index + 1)) / (config.dividers + 1);
    const divider = new THREE.Mesh(new THREE.BoxGeometry(Math.max(width * 0.012, 0.006), height * 0.72, depth * 0.78), inner);
    divider.position.set(x, height * 0.5, 0);
    divider.castShadow = true;
    divider.receiveShadow = true;
    group.add(divider);
  }

  if (config.mobility === 'rodizios') {
    for (const x of [-width * 0.37, width * 0.37]) for (const z of [-depth * 0.37, depth * 0.37]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(Math.min(width, depth) * 0.045, 0.018), Math.max(Math.min(width, depth) * 0.045, 0.018), Math.max(height * 0.07, 0.025), 24), dark);
      wheel.position.set(x, 0.035, z);
      wheel.castShadow = true;
      group.add(wheel);
    }
  }
  if (config.mobility === 'pes') {
    for (const x of [-width * 0.37, width * 0.37]) for (const z of [-depth * 0.37, depth * 0.37]) {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(Math.min(width, depth) * 0.035, 0.015), Math.max(Math.min(width, depth) * 0.035, 0.015), 0.08, 20), dark);
      foot.position.set(x, 0.04, z);
      foot.castShadow = true;
      group.add(foot);
    }
  }
  return group;
}

function addLid(group: THREE.Group, width: number, depth: number, thickness: number, y: number, material: THREE.Material, x: number) {
  const lid = new THREE.Mesh(new RoundedBoxGeometry(width, depth, thickness, 4, thickness * 0.28), material);
  lid.rotation.x = Math.PI / 2;
  lid.position.set(x, y, 0);
  lid.castShadow = true;
  lid.receiveShadow = true;
  group.add(lid);
}

