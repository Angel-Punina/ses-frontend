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

export interface ContextoPrecalificacion {
  proposito?: string
  tamano_organizacion?: string
  software_reemplaza?: string
  tipo_organizacion?: string
  madurez_ti?: string
  prioridad_clave?: string
}

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
  usar_plantilla: boolean
  usar_precalificacion: boolean
  contexto_precalificacion: ContextoPrecalificacion | null
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
  tipo_organizacion?: string
  madurez_ti?: string
  prioridad_clave?: string
}

export interface IePreviewItem {
  factor_id: string
  nombre: string
  ie_propuesto: number
}

export interface PrecalificacionResponse {
  propuestas_ie: number
  total_factores: number
  subfactores_sugeridos: number
  total_subfactores: number
  preview: IePreviewItem[]
}

export interface InconsistenciaIA {
  factor: string
  severidad: 'alta' | 'media' | 'baja'
  descripcion: string
  sugerencia: string
}

export interface RiesgoAdopcion {
  factor: string
  severidad: 'alta' | 'media' | 'baja'
  descripcion: string
  mitigacion: string
}

export interface OportunidadAdopcion {
  factor: string
  descripcion: string
}

export interface AnalisisRiesgosResponse {
  riesgos: RiesgoAdopcion[]
  oportunidades: OportunidadAdopcion[]
  resumen_ejecutivo: string
}

export interface PlantillaEvaluacion {
  id: number
  nombre: string
  descripcion: string
  tipo_organizacion: string
  categoria_software: string
  configuracion_ie: Record<string, number>
  publica: boolean
  creada_por: string | null
  creada: string
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
  score_ponderado: number
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

export interface FactorComparativo {
  codigo: string
  nombre: string
  dimension: string
  avg_pm: number
  pm_range: number
  foda_distribucion: Record<string, number>
  consistencia: 'alta' | 'media' | 'baja'
  n_evaluaciones: number
}

export interface ComparativoSoftwareResponse {
  evaluaciones: { id: number; nombre: string; organizacion: string; recomendacion: string; creada: string }[]
  factores_clave: FactorComparativo[]
  resumen_ia: string
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
  subfactor_creado_codigo: string | null
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

export interface ObsolescenceListResponse {
  results: SubfactorObsolescenceReport[]
  summary: {
    total_analizados: number
    pendientes: number
    vigentes_ia: number
  }
}

export const evaluacionesApi = {
  list: () =>
    apiClient.get<Evaluacion[]>('/evaluaciones/').then((r) => r.data),

  create: (data: Pick<Evaluacion, 'nombre' | 'software' | 'organizacion' | 'descripcion' | 'categoria' | 'usar_plantilla'>) =>
    apiClient.post<Evaluacion>('/evaluaciones/', data).then((r) => r.data),

  update: (id: number, data: Partial<Pick<Evaluacion, 'nombre' | 'software' | 'organizacion' | 'descripcion' | 'categoria'>>) =>
    apiClient.patch<Evaluacion>(`/evaluaciones/${id}/`, data).then((r) => r.data),

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

  generarPropuestas: (factor?: string, max = 2, dimension?: string) =>
    apiClient
      .post<{ detail: string; factores: number }>('/ia/proposals/generar/', {
        ...(factor ? { factor } : {}),
        ...(dimension ? { dimension } : {}),
        max,
      })
      .then((r) => r.data),

  limpiarPropuestas: (dimension?: string) =>
    apiClient
      .delete<{ detail: string; eliminadas: number }>('/ia/proposals/limpiar/', {
        data: dimension ? { dimension } : {},
      })
      .then((r) => r.data),

  proposalProgress: () =>
    apiClient
      .get<{ running: boolean; total: number; completed: number; porcentaje: number }>('/ia/proposals/progress/')
      .then((r) => r.data),

  obsolescenceReports: (verTodos = false) =>
    apiClient
      .get<ObsolescenceListResponse>('/ia/obsolescence/', { params: verTodos ? { ver_todos: '1' } : {} })
      .then((r) => r.data),

  generateObsolescence: (subfactorId?: number, dimension?: string) =>
    apiClient
      .post<{ detail: string; subfactores: number }>('/ia/obsolescence/generate/', {
        ...(subfactorId ? { subfactor_id: subfactorId } : {}),
        ...(dimension ? { dimension } : {}),
      })
      .then((r) => r.data),

  limpiarObsolescencia: (dimension?: string) =>
    apiClient
      .delete<{ detail: string; eliminadas: number }>('/ia/obsolescence/limpiar/', {
        data: dimension ? { dimension } : {},
      })
      .then((r) => r.data),

  obsolescenceProgress: () =>
    apiClient
      .get<{ running: boolean; total: number; completed: number; porcentaje: number }>('/ia/obsolescence/progress/')
      .then((r) => r.data),

  obsolescenceReview: (id: number, accion: 'confirmar' | 'desestimar', marcarInactivo = false, motivo = '') =>
    apiClient.post(`/ia/obsolescence/${id}/review/`, { accion, marcar_inactivo: marcarInactivo, motivo }).then((r) => r.data),

  updateSubfactor: (id: number, data: { nombre?: string; descripcion?: string; activo?: boolean }) =>
    apiClient.patch<Subfactor>(`/catalogo/subfactores/${id}/`, data).then((r) => r.data),

  precalificacion: (id: number, data: PrecalificacionInput) =>
    apiClient.post<PrecalificacionResponse>(`/evaluaciones/${id}/precalificacion/`, data).then((r) => r.data),

  precalificacionPreview: (id: number) =>
    apiClient.get<{ preview: IePreviewItem[] }>(`/evaluaciones/${id}/precalificacion-preview/`).then((r) => r.data),

  precalificacionAccept: (id: number) =>
    apiClient.post<{ aplicados: number }>(`/evaluaciones/${id}/precalificacion-accept/`, {}).then((r) => r.data),

  compartidas: () =>
    apiClient.get<Evaluacion[]>('/evaluaciones/compartidas/').then((r) => r.data),

  compartirList: (evalId: number) =>
    apiClient.get<{ id: number; nombre: string; apellido: string; correo: string }[]>(`/evaluaciones/${evalId}/compartir/`).then((r) => r.data),

  compartirRemove: (evalId: number, uid: number) =>
    apiClient.delete(`/evaluaciones/${evalId}/compartir/${uid}/`),

  plantillas: () =>
    apiClient.get<PlantillaEvaluacion[]>('/evaluaciones/plantillas/').then((r) => r.data),

  createPlantilla: (data: Omit<PlantillaEvaluacion, 'id' | 'creada_por' | 'creada'>) =>
    apiClient.post<{ id: number; nombre: string }>('/evaluaciones/plantillas/', data).then((r) => r.data),

  deletePlantilla: (id: number) =>
    apiClient.delete(`/evaluaciones/plantillas/${id}/`),

  aplicarPlantilla: (evalId: number, plantillaId: number) =>
    apiClient.post<{ aplicados: number }>(`/evaluaciones/${evalId}/aplicar-plantilla/`, { plantilla_id: plantillaId }).then((r) => r.data),

  snapshots: (evalId: number) =>
    apiClient.get<Array<{ paso: string; datos: unknown; creado: string }>>(`/evaluaciones/${evalId}/snapshots/`).then((r) => r.data),

  analizarConsistencia: (evalId: number) =>
    apiClient.post<{ inconsistencias: InconsistenciaIA[] }>(`/evaluaciones/${evalId}/analizar-consistencia/`, {}).then((r) => r.data),

  analizarRiesgos: (evalId: number) =>
    apiClient.get<AnalisisRiesgosResponse>(`/evaluaciones/${evalId}/analizar-riesgos/`).then((r) => r.data),

  compararSoftware: (software: string) =>
    apiClient.get<ComparativoSoftwareResponse>(`/evaluaciones/comparar-software/`, { params: { software } }).then((r) => r.data),
}
