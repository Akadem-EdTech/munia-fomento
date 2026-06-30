import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api } from '../../api/client';
import { FichaFondo } from './FichaFondo';
import type { RespuestaAsistente } from '../../types';

interface Msg { de: 'ia' | 'user'; texto: string; fondo?: { id: string; nombre: string } | null }

const SUGERENCIAS = ['Tengo una cocinería y necesito comprar un horno', 'Quiero capital para comprar maquinaria', 'Busco un fondo para mujeres emprendedoras'];

// Renderiza **negritas** simples del asistente.
const bold = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>);

export function Asistente() {
  const [historial, setHistorial] = useState<Msg[]>([{ de: 'ia', texto: '¡Hola! Soy tu asistente de fondos. Cuéntame a qué te dedicas y qué necesitas, y te ayudo a encontrar el fondo correcto.' }]);
  const [texto, setTexto] = useState('');
  const [ficha, setFicha] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const preguntar = useMutation({
    mutationFn: (consulta: string) => api.post<RespuestaAsistente>('/api/fondos/asistente', { consulta }),
    onSuccess: (r) => setHistorial((h) => [...h, { de: 'ia', texto: r.respuesta, fondo: r.fondoSugerido }]),
  });

  useEffect(() => { bodyRef.current?.scrollTo(0, bodyRef.current.scrollHeight); }, [historial, preguntar.isPending]);

  const enviar = (consulta: string) => {
    if (!consulta.trim()) return;
    setHistorial((h) => [...h, { de: 'user', texto: consulta }]);
    setTexto('');
    preguntar.mutate(consulta);
  };

  return (
    <>
      <div className="chat">
        <div className="chat-body" ref={bodyRef}>
          {historial.map((m, i) => (
            <div key={i} className={`msg ${m.de === 'ia' ? 'msg-ia' : 'msg-user'}`}>
              {m.de === 'ia' && <div className="msg-av"><Icon name="sparkle" /></div>}
              <div>
                <div className="msg-bubble">{bold(m.texto)}</div>
                {m.fondo && <button className="btn-p btn-sm" style={{ marginTop: 8, background: 'var(--mod-fondos)', color: '#0b1a0f' }} onClick={() => setFicha(m.fondo!.id)}><Icon name="money" /> Abrir ficha de {m.fondo.nombre}</button>}
              </div>
            </div>
          ))}
          {preguntar.isPending && <div className="msg msg-ia"><div className="msg-av"><Icon name="sparkle" /></div><div className="msg-bubble"><span className="spinner" style={{ borderTopColor: 'var(--mod-fondos)', width: 14, height: 14 }} /></div></div>}
        </div>

        {historial.length === 1 && (
          <div className="chat-quick">{SUGERENCIAS.map((s) => <button key={s} onClick={() => enviar(s)}>{s}</button>)}</div>
        )}
        <form className="chat-input" onSubmit={(e) => { e.preventDefault(); enviar(texto); }}>
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe qué necesitas…" />
          <button className="btn-p" style={{ background: 'var(--mod-fondos)', color: '#0b1a0f' }} disabled={preguntar.isPending}><Icon name="send" /></button>
        </form>
      </div>
      {ficha && <FichaFondo fondoId={ficha} onClose={() => setFicha(null)} />}
    </>
  );
}
