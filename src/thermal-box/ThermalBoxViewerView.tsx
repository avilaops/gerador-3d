import { useEffect, useRef } from 'react';
import { ThermalBoxViewer, type ThermalBoxViewerOptions } from './ThermalBoxViewer';
import type { ThermalBoxVisualInput } from './schema';

export interface ThermalBoxViewerViewProps extends ThermalBoxViewerOptions {
  config: ThermalBoxVisualInput;
  className?: string;
}

export function ThermalBoxViewerView({ config, className, ...options }: ThermalBoxViewerViewProps) {
  const host = useRef<HTMLDivElement>(null);
  const viewer = useRef<ThermalBoxViewer | null>(null);

  useEffect(() => {
    if (!host.current) return;
    const instance = new ThermalBoxViewer(host.current, options);
    viewer.current = instance;
    return () => {
      instance.dispose();
      viewer.current = null;
    };
    // As opções do renderer valem na criação do contexto WebGL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    viewer.current?.setModel(config);
  }, [config]);

  return <div ref={host} className={className} />;
}

