import { useEffect, useRef, useState } from 'react';
import { ThermalBoxViewer, type ThermalBoxViewerOptions } from './ThermalBoxViewer';
import type { ThermalBoxVisualInput } from './schema';

export interface ThermalBoxViewerViewProps extends ThermalBoxViewerOptions {
  config: ThermalBoxVisualInput;
  className?: string;
}

export function ThermalBoxViewerView({ config, className, ...options }: ThermalBoxViewerViewProps) {
  const host = useRef<HTMLDivElement>(null);
  const viewer = useRef<ThermalBoxViewer | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    const instance = new ThermalBoxViewer(host.current, options);
    viewer.current = instance;
    setReady(true);
    return () => {
      instance.dispose();
      viewer.current = null;
      setReady(false);
    };
    // As opções do renderer valem na criação do contexto WebGL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    viewer.current?.setModel(config);
  }, [config]);

  return (
    <div className={className}>
      <div ref={host} />
      {ready && (
        <div className="tbv-tools" aria-label="Controles da visualização 3D">
          <button className="tbv-tool" type="button" onClick={() => viewer.current?.resetView()}>Restaurar vista</button>
          <button className="tbv-tool" type="button" onClick={() => viewer.current?.zoom(0.82)}>Aproximar</button>
          <button className="tbv-tool" type="button" onClick={() => viewer.current?.zoom(1.22)}>Afastar</button>
        </div>
      )}
    </div>
  );
}

