import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api } from '../../api/client';
import { FichaFondo } from './FichaFondo';
import type { FondoLista } from '../../types';

export function Descubrir() {
  const nav = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['fondos-para-mi'], queryFn: () => api.get<{ fondos: FondoLista[] }>('/api/fondos/para-mi') });
  const [ficha, setFicha] = useState<string | null>(null);
  const fondos = data?.fondos ?? [];

  return (
    <>
      <div className="grid g2" style={{ marginBottom: '1.6rem' }}>
        <button className="puerta" onClick={() => nav('/app/FONDOS/asistente')}>
          <div className="puerta-ico"><Icon name="sparkle" /></div>
          <h3>Cuéntame qué necesitas</h3>
          <p>Descríbelo en tus palabras y el asistente encuentra el fondo correcto para ti.</p>
        </button>
        <div className="puerta" style={{ cursor: 'default' }}>
          <div className="puerta-ico"><Icon name="compass" /></div>
          <h3>Ver fondos para mí</h3>
          <p>Fondos filtrados por tu perfil. Solo te mostramos los que calzan contigo.</p>
        </div>
      </div>

      <div className="section-t">Fondos para tu perfil</div>
      {isLoading ? <div className="center-screen" style={{ minHeight: 140 }}><span className="spinner" style={{ borderTopColor: 'var(--mod-fondos)' }} /></div> : !fondos.length ? (
        <div className="empty"><Icon name="money" /><h4>Aún no hay fondos para tu perfil</h4><p>Completa tu rubro y etapa en tu perfil para ver más opciones, o prueba el asistente.</p></div>
      ) : (
        <div className="grid g2">
          {fondos.map((f) => (
            <div className="card" key={f.id}>
              <div style={{ display: 'flex', alignItems: 'start', gap: 10, marginBottom: 10 }}>
                <div className="puerta-ico" style={{ margin: 0, width: 40, height: 40 }}><Icon name="money" /></div>
                <div style={{ flex: 1 }}><h3 style={{ fontSize: 15, fontWeight: 600 }}>{f.nombre}</h3><div className="ent-sub">{f.organismo} · {f.origen === 'EXTERNO' ? 'Externo' : 'Municipal'}</div></div>
                <span className={`compat ${f.compatibilidad === 'alta' ? 'compat-alta' : 'compat-media'}`}>{f.compatibilidad}</span>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>{f.descripcion}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="mono ent-sub">{f.montoMax ? `$${f.montoMax.toLocaleString('es-CL')}` : ''}{f.diasRestantes != null ? ` · ${f.diasRestantes} días` : ''}</span>
                <button className="btn-p btn-sm" style={{ marginLeft: 'auto', background: 'var(--mod-fondos)', color: '#0b1a0f' }} onClick={() => setFicha(f.id)}>Ver ficha</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {ficha && <FichaFondo fondoId={ficha} onClose={() => setFicha(null)} />}
    </>
  );
}
