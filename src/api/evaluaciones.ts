import { apiClient } from './client'

export const CATEGORIAS = [
  { value: 'ofimatica',      label: 'Ofimática' },
  { value: 'erp',            label: 'ERP' },
  { value: 'crm',            label: 'CRM' },
  { value: 'educacion',      label: 'Educación' },
  { value: 'infraestructura',label: 'Infraestructura' },
  { value: 'seguridad',      label: 'Seguridad' },
  { value: 'otro',           label: 'Otro' },
] as const

export type CategoriaValue = typeof CATEGORIAS[number]['value']

export interface Evaluacion {
  id: number
  nombre: string
  software: string
  organizacion: string
  descripcion: string
  categoria: CategoriaValue
  estado: string
  recomendacion: string
  creada: string
  actualizada: string
  paso_numero: number
}

export interface EvaluacionFactor {
  id: number
  factor: number
  factor_codigo: string
  factor_nombre: string
  factor_is: number
  factor_tipo_impacto: 'interno' | 'externo'
  factor_es_soporte: boolean
  dimension_codigo: string
  ie: number | null
  importancia_relativa: number | null
  relevante: boolean
  pm: string | null
  foda: string
  soporte: boolean
  ia_sugerida: boolean
}

export interface PrecalificacionInput {
  proposito?: string
  tamano_organizacion?: string
  software_reemplaza?: string
}

export interface PrecalificacionResponse {
  valores_aplicados: number
  total_factores: number
}

export interface EvaluacionSubfactor {
  id: number
  subfactor: number
  subfactor_codigo: string
  subfactor_nombre: string
  subfactor_descripcion: string
  subfactor_origen: 'original' | 'ia'
  factor_id: number
  factor_codigo: string
  factor_nombre: string
  dimension_codigo: string
  id_valor: number | null
  ir: number | null
  ia_sugerida: boolean
}

export interface Dimension {
  id: number
  codigo: string
  nombre: string
  orden: number
  factores: Factor[]
}

export interface Factor {
  id: number
  codigo: string
  nombre: string
  descripcion: string
  orden: number
  is_valor: number
  tipo_impacto: 'interno' | 'externo'
  es_factor_soporte: boolean
  dimension_codigo: string
  subfactores: Subfactor[]
}

export interface Subfactor {
  id: number
  codigo: string
  nombre: string
  descripcion: string
  orden: number
  activo: boolean
  origen: 'original' | 'ia'
}

export interface IaFuente {
  titulo: string
  anio: number | null
  citas: number
  autores: string[]
}

export interface IaContextoResponse {
  id: number
  factor_codigo: string
  factor_nombre: string
  software: string
  resumen: string
  fuentes: IaFuente[]
  error: string
  tokens_entrada: number
  tokens_salida: number
  cache_creation_tokens: number
  cache_read_tokens: number
  cache_hit: boolean
  creada: string
}

export interface Paso6Response {
  evaluacion: Evaluacion
  factores: EvaluacionFactor[]
  foda_counts: { Fortaleza: number; Oportunidad: number; Debilidad: number; Amenaza: number }
  score: number
}

export interface CompararFactorValue {
  pm: number | null
  foda: string
}

export interface CompararFactor {
  factor_codigo: string
  factor_nombre: string
  dimension_codigo: string
  values: CompararFactorValue[]
}

export interface CompararResponse {
  evaluaciones: Evaluacion[]
  factores: CompararFactor[]
}

export interface FactorRanking {
  codigo: string
  nombre: string
  dimension: string
  avg_pm: number
  count: number
}

export interface ReporteGeneral {
  total: number
  completadas: number
  en_progreso: number
  borradores: number
  recomendaciones: { Adoptar: number; 'Con condiciones': number; 'No adoptar': number }
  foda_global: { Fortaleza: number; Oportunidad: number; Debilidad: number; Amenaza: number }
  factor_ranking: FactorRanking[]
  por_mes: Record<string, number>
  avg_tiempo_dias: number
}

export interface GitHubInfo {
  nombre: string
  descripcion: string
  estrellas: number
  forks: number
  issues_abiertos: number
  ultimo_push: string | null
  licencia: string | null
  url: string
  lenguaje: string
}

export interface WikipediaInfo {
  titulo: string
  resumen: string
  url: string
  imagen: string
  idioma: string
}

export interface SoftwareInfo {
  software: string
  github: GitHubInfo | null
  wikipedia: WikipediaInfo | null
}

export interface SubfactorProposal {
  id: number
  factor_codigo: string
  factor_nombre: string
  factor_is: number
  dimension_codigo: string
  texto: string
  justificacion: string
  confianza_llm: number
  papers_count: number
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'en_revision'
  modelo_llm: string
  fecha_creacion: string
  fecha_decision: string | null
  motivo_decision: string
}

export interface SubfactorObsolescenceReport {
  id: number
  subfactor_id: number
  subfactor_codigo: string
  subfactor_nombre: string
  subfactor_activo: boolean
  subfactor_origen: 'original' | 'ia'
  factor_codigo: string
  factor_nombre: string
  dimension_codigo: string
  confianza: number
  justificacion: string
  papers_count: number
  modelo_llm: string
  estado: 'pendiente' | 'obsoleto' | 'vigente'
  motivo_decision: string
  fecha_creacion: string
  fecha_decision: string | null
}

export const evaluacionesApi = {
  list: () =>
    apiClient.get<Evaluacion[]>('/evaluaciones/').then((r) => r.data),

  create: (data: Pick<Evaluacion, 'nombre' | 'software' | 'organizacion' | 'descripcion' | 'categoria'>) =>
    apiClient.post<Evaluacion>('/evaluaciones/', data).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Evaluacion>(`/evaluaciones/${id}/`).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/evaluaciones/${id}/`),

  paso1Get: (id: number) =>
    apiClient.get<EvaluacionFactor[]>(`/evaluaciones/${id}/paso1/`).then((r) => r.data),

  paso1Save: (id: number, factores: { factor_id: number; ie: number }[]) =>
    apiClient.post(`/evaluaciones/${id}/paso1/`, { factores }).then((r) => r.data),

  paso2Get: (id: number) =>
    apiClient.get<EvaluacionFactor[]>(`/evaluaciones/${id}/paso2/`).then((r) => r.data),

  paso2Save: (id: number, factores: { factor_id: number; relevante: number }[]) =>
    apiClient.post(`/evaluaciones/${id}/paso2/`, { factores }).then((r) => r.data),

  paso3Get: (id: number) =>
    apiClient.get<EvaluacionSubfactor[]>(`/evaluaciones/${id}/paso3/`).then((r) => r.data),

  paso3Save: (id: number, subfactores: { subfactor_id: number; id_valor: number }[]) =>
    apiClient.post(`/evaluaciones/${id}/paso3/`, { subfactores }).then((r) => r.data),

  paso4Get: (id: number) =>
    apiClient.get<EvaluacionFactor[]>(`/evaluaciones/${id}/paso4/`).then((r) => r.data),

  paso4Continue: (id: number) =>
    apiClient.post(`/evaluaciones/${id}/paso4/`, {}).then((r) => r.data),

  paso5Get: (id: number) =>
    apiClient.get<EvaluacionFactor[]>(`/evaluaciones/${id}/paso5/`).then((r) => r.data),

  paso5Save: (id: number, tipo_soporte: 'interno' | 'externo' | null) =>
    apiClient.post(`/evaluaciones/${id}/paso5/`, { tipo_soporte }).then((r) => r.data),

  paso6Get: (id: number) =>
    apiClient.get<Paso6Response>(`/evaluaciones/${id}/paso6/`).then((r) => r.data),

  paso6Pdf: (id: number) =>
    apiClient.get(`/evaluaciones/${id}/paso6/pdf/`, { responseType: 'blob' }).then((r) => r.data as Blob),

  iaContexto: (evalId: number, factorCatalogId: number) =>
    apiClient
      .get<IaContextoResponse>(`/evaluaciones/${evalId}/ia-contexto/`, {
        params: { factor_id: factorCatalogId },
      })
      .then((r) => r.data),

  catalogo: () =>
    apiClient.get<Dimension[]>('/catalogo/').then((r) => r.data),

  comparar: (ids: [number, number]) =>
    apiClient
      .get<CompararResponse>('/evaluaciones/comparar/', { params: { ids: ids.join(',') } })
      .then((r) => r.data),

  compartir: (evalId: number, correo: string) =>
    apiClient.post(`/evaluaciones/${evalId}/compartir/`, { correo }).then((r) => r.data),

  reporteGeneral: () =>
    apiClient.get<ReporteGeneral>('/evaluaciones/reporte-general/').then((r) => r.data),

  softwareInfo: (id: number) =>
    apiClient.get<SoftwareInfo>(`/evaluaciones/${id}/software-info/`).then((r) => r.data),

  proposals: () =>
    apiClient.get<SubfactorProposal[]>('/ia/proposals/').then((r) => r.data),

  proposalReview: (id: number, accion: 'aprobar' | 'rechazar', motivo?: string) =>
    apiClient.post(`/ia/proposals/${id}/review/`, { accion, motivo }).then((r) => r.data),

  generarPropuestas: (factor?: string, max = 2) =>
    apiClient
      .post<{ detail: string; factores: number }>('/ia/proposals/generar/', { factor, max })
      .then((r) => r.data),

  obsolescenceReports: () =>
    apiClient.get<SubfactorObsolescenceReport[]>('/ia/obsolescence/').then((r) => r.data),

  generateObsolescence: (subfactorId?: number) =>
    apiClient
      .post<{ detail: string; subfactores: number }>('/ia/obsolescence/generate/', subfactorId ? { subfactor_id: subfactorId } : {})
      .then((r) => r.data),

  obsolescenceReview: (id: number, accion: 'confirmar' | 'desestimar', marcarInactivo = false, motivo = '') =>
    apiClient.post(`/ia/obsolescence/${id}/review/`, { accion, marcar_inactivo: marcarInactivo, motivo }).then((r) => r.data),

  updateSubfactor: (id: number, data: { nombre?: string; descripcion?: string; activo?: boolean }) =>
    apiClient.patch<Subfactor>(`/catalogo/subfactores/${id}/`, data).then((r) => r.data),

  precalificacion: (id: number, data: PrecalificacionInput) =>
    apiClient.post<PrecalificacionResponse>(`/evaluaciones/${id}/precalificacion/`, data).then((r) => r.data),
}
