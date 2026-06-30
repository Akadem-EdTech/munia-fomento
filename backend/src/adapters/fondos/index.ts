import { loadEnv } from '../../env.js';
import { AppError } from '../../lib/errors.js';
import { mejorFondo, compatibilidad, type PerfilMatch, type FondoIndexable, type CriteriosMatch } from '../../domain/fondos.js';

export interface FondoContexto extends FondoIndexable {
  montoMax?: number | null;
  moneda?: string;
  fechaCierre?: string | null;
  criterios: CriteriosMatch;
}

export interface ConsultaAsistente {
  consulta: string;
  perfil: PerfilMatch;
  fondos: FondoContexto[];
}

export interface RespuestaAsistente {
  respuesta: string;
  fondoSugeridoId?: string;
}

/**
 * Adaptador del asistente de Fondos. En dev = mock por intención (misma
 * interfaz); en prod = RAG de MunIA core. Se enchufa por FONDOS_MATCH_PROVIDER
 * sin tocar las rutas: el módulo Fondos no sabe cuál está detrás.
 */
export interface FondosMatchProvider {
  readonly id: 'mock' | 'rag';
  conversar(input: ConsultaAsistente): Promise<RespuestaAsistente>;
}

const fmtMonto = (f: FondoContexto) => (f.montoMax ? `hasta $${f.montoMax.toLocaleString('es-CL')}` : 'monto por confirmar');
const fmtFecha = (f: FondoContexto) => (f.fechaCierre ? `cierra el ${new Date(f.fechaCierre).toLocaleDateString('es-CL')}` : 'con postulación abierta');

class MockMatchProvider implements FondosMatchProvider {
  readonly id = 'mock' as const;
  async conversar({ consulta, perfil, fondos }: ConsultaAsistente): Promise<RespuestaAsistente> {
    const elegido = mejorFondo(consulta, fondos, perfil);
    if (!elegido) {
      const algunoCompatible = fondos.some((f) => compatibilidad(perfil, f.criterios) !== 'no');
      return {
        respuesta: algunoCompatible
          ? 'No encontré un fondo que calce exactamente con eso. Cuéntame con otras palabras qué necesitas (por ejemplo: "comprar maquinaria", "capital de trabajo", "capacitación"), o revisa la lista "Ver fondos para mí".'
          : 'Por ahora no hay fondos que calcen con tu perfil. Te recomiendo completar tu rubro y etapa en el perfil para ampliar tus opciones.',
      };
    }
    const f = elegido.fondo as FondoContexto;
    const compat = compatibilidad(perfil, f.criterios);
    const porque = compat === 'alta' ? 'calza bien con tu rubro y etapa' : 'es elegible para tu rubro';
    return {
      respuesta: `Para lo que necesitas, el fondo que mejor te calza es **${f.nombre}** (${f.organismo}): ${porque}. Aporta ${fmtMonto(f)} y ${fmtFecha(f)}. ¿Quieres abrir su ficha para revisar los requisitos y postular?`,
      fondoSugeridoId: f.id,
    };
  }
}

/** Adaptador hacia el agente RAG de MunIA core (prod). */
class RagMatchProvider implements FondosMatchProvider {
  readonly id = 'rag' as const;
  constructor(private endpoint: string, private apiKey?: string) {}
  async conversar(input: ConsultaAsistente): Promise<RespuestaAsistente> {
    const res = await fetch(`${this.endpoint}/fondos/conversar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}) },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new AppError(502, 'El asistente no está disponible en este momento', 'rag_unavailable');
    return (await res.json()) as RespuestaAsistente;
  }
}

let cached: FondosMatchProvider | null = null;

export function getFondosMatchProvider(): FondosMatchProvider {
  if (cached) return cached;
  const env = loadEnv();
  if (env.FONDOS_MATCH_PROVIDER === 'rag') {
    if (!env.RAG_ENDPOINT) throw new AppError(503, 'FONDOS_MATCH_PROVIDER=rag requiere RAG_ENDPOINT', 'rag_no_config');
    cached = new RagMatchProvider(env.RAG_ENDPOINT, env.RAG_API_KEY);
  } else {
    cached = new MockMatchProvider();
  }
  return cached;
}
