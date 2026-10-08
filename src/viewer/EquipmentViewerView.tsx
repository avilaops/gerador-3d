/**
 * Wrapper React do EquipmentViewer, para uso no Arxis.
 * O viewer nasce e morre no efeito; trocar o spec troca só o modelo.
 */
import { useEffect, useRef } from 'react';
import { EquipmentViewer, type EquipmentViewerOptions } from './EquipmentViewer';
import type { EquipmentSpecInput } from '../spec/schema';

export interface EquipmentViewerViewProps extends EquipmentViewerOptions {
  spec: EquipmentSpecInput;
  className?: string;
  /** Recebe a instância (para setPhase, setView, prints). */
  onReady?: (viewer: EquipmentViewer) => void;
}

export function EquipmentViewerView({
  spec,
  className,
  onReady,
  ...opts
}: EquipmentViewerViewProps) {
  const host = useRef<HTMLDivElement>(null);
  const viewer = useRef<EquipmentViewer | null>(null);

  useEffect(() => {
    if (!host.current) return;
    const v = new EquipmentViewer(host.current, opts);
    viewer.current = v;
    return () => {
      v.dispose();
      viewer.current = null;
    };
    // As opções valem na criação; mudar opções em tempo real não é suportado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = viewer.current;
    if (!v) return;
    v.setEquipment(spec);
    onReady?.(v);
  }, [spec, onReady]);

  return <div ref={host} className={className} />;
}
