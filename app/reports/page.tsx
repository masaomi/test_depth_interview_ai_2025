'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ReportAggregation, ReportDetail } from '@/lib/types';

// Locale and text helpers
const getLocale = (lang: string) => {
  const map: Record<string, string> = {
    en: 'en-US',
    ja: 'ja-JP',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    zh: 'zh-CN',
    it: 'it-IT',
    rm: 'rm-CH',
    gsw: 'de-CH',
  };
  return map[lang] || 'en-US';
};

const getTexts = (lang: string) => {
  const dict = {
    en: {
      loading: 'Loading...',
      backToHome: '← Back to Home',
      reportsTitle: 'Reports',
      noDataYet: 'No aggregation data yet. Please run aggregation from the admin panel.',
      goToAdmin: 'Go to Admin',
      sessionsListTitle: 'Interview Sessions',
      refresh: 'Refresh',
      selectAggregation: 'Select Aggregation',
      displayLanguage: 'Display Language',
      allSessions: 'All Sessions',
      inProgress: 'In Progress',
      completed: 'Completed',
      interviewTypes: 'Interview Types',
      llmModel: 'LLM Model',
      aggregationDate: 'Aggregation Date',
      noData: 'No data',
      interviewName: 'Interview Name',
      totalInterviews: 'Total Interviews',
      completedCount: 'Completed',
      inProgressCount: 'In Progress',
      totalMessages: 'Total Messages',
      avgDuration: 'Avg. Duration',
      lastConducted: 'Last Conducted',
      actions: 'Actions',
      viewSummary: 'View Summary',
      minutesUnitShort: 'min',
    },
    ja: {
      loading: '読み込み中...',
      backToHome: '← トップに戻る',
      reportsTitle: '集計結果',
      noDataYet: 'まだ集計データがありません。管理画面で集計を実行してください。',
      goToAdmin: '管理画面へ',
      sessionsListTitle: 'インタビューセッション一覧',
      refresh: '更新',
      selectAggregation: '集計結果を選択',
      displayLanguage: '表示言語',
      allSessions: '全セッション',
      inProgress: '進行中',
      completed: '完了',
      interviewTypes: 'インタビュー種別',
      llmModel: '使用LLMモデル',
      aggregationDate: '集計実施日',
      noData: 'データがありません',
      interviewName: 'インタビュー名',
      totalInterviews: '総インタビュー数',
      completedCount: '完了',
      inProgressCount: '進行中',
      totalMessages: '総メッセージ数',
      avgDuration: '平均所要時間',
      lastConducted: '最終実施日',
      actions: 'アクション',
      viewSummary: 'まとめを見る',
      minutesUnitShort: '分',
    },
    es: {
      loading: 'Cargando...',
      backToHome: '← Volver a Inicio',
      reportsTitle: 'Resultados',
      noDataYet: 'Aún no hay datos de agregación. Ejecuta la agregación en el panel de administración.',
      goToAdmin: 'Ir al Panel',
      sessionsListTitle: 'Sesiones de Entrevista',
      refresh: 'Actualizar',
      selectAggregation: 'Seleccionar Agregación',
      displayLanguage: 'Idioma de Visualización',
      allSessions: 'Todas las Sesiones',
      inProgress: 'En Progreso',
      completed: 'Completadas',
      interviewTypes: 'Tipos de Entrevista',
      llmModel: 'Modelo LLM',
      aggregationDate: 'Fecha de Agregación',
      noData: 'Sin datos',
      interviewName: 'Nombre de Entrevista',
      totalInterviews: 'Entrevistas Totales',
      completedCount: 'Completadas',
      inProgressCount: 'En Progreso',
      totalMessages: 'Mensajes Totales',
      avgDuration: 'Duración Prom.',
      lastConducted: 'Última Realización',
      actions: 'Acciones',
      viewSummary: 'Ver Resumen',
      minutesUnitShort: 'min',
    },
    fr: {
      loading: 'Chargement...',
      backToHome: '← Retour à l’accueil',
      reportsTitle: 'Résultats',
      noDataYet: 'Pas encore de données. Exécutez l’agrégation depuis l’administration.',
      goToAdmin: 'Aller à l’Admin',
      sessionsListTitle: 'Sessions d’entretien',
      refresh: 'Actualiser',
      selectAggregation: 'Sélectionner l’agrégation',
      displayLanguage: 'Langue d’affichage',
      allSessions: 'Toutes les sessions',
      inProgress: 'En cours',
      completed: 'Terminées',
      interviewTypes: 'Types d’entretien',
      llmModel: 'Modèle LLM',
      aggregationDate: 'Date d’agrégation',
      noData: 'Aucune donnée',
      interviewName: 'Nom de l’entretien',
      totalInterviews: 'Entretiens totaux',
      completedCount: 'Terminées',
      inProgressCount: 'En cours',
      totalMessages: 'Messages totaux',
      avgDuration: 'Durée moy.',
      lastConducted: 'Dernière réalisation',
      actions: 'Actions',
      viewSummary: 'Voir le résumé',
      minutesUnitShort: 'min',
    },
    de: {
      loading: 'Laden...',
      backToHome: '← Zur Startseite',
      reportsTitle: 'Berichte',
      noDataYet: 'Noch keine Aggregationsdaten. Führen Sie die Aggregation im Adminbereich aus.',
      goToAdmin: 'Zum Admin',
      sessionsListTitle: 'Interview-Sitzungen',
      refresh: 'Aktualisieren',
      selectAggregation: 'Aggregation auswählen',
      displayLanguage: 'Anzeigesprache',
      allSessions: 'Alle Sitzungen',
      inProgress: 'Laufend',
      completed: 'Abgeschlossen',
      interviewTypes: 'Interviewtypen',
      llmModel: 'LLM-Modell',
      aggregationDate: 'Aggregationsdatum',
      noData: 'Keine Daten',
      interviewName: 'Interviewname',
      totalInterviews: 'Gesamtinterviews',
      completedCount: 'Abgeschlossen',
      inProgressCount: 'Laufend',
      totalMessages: 'Gesamtnachrichten',
      avgDuration: 'Durchschn. Dauer',
      lastConducted: 'Zuletzt durchgeführt',
      actions: 'Aktionen',
      viewSummary: 'Zusammenfassung ansehen',
      minutesUnitShort: 'Min',
    },
    zh: {
      loading: '正在加载...',
      backToHome: '← 返回首页',
      reportsTitle: '报告',
      noDataYet: '尚无汇总数据。请在管理面板运行汇总。',
      goToAdmin: '前往管理',
      sessionsListTitle: '访谈会话',
      refresh: '刷新',
      selectAggregation: '选择汇总',
      displayLanguage: '显示语言',
      allSessions: '所有会话',
      inProgress: '进行中',
      completed: '已完成',
      interviewTypes: '访谈类型',
      llmModel: 'LLM模型',
      aggregationDate: '汇总日期',
      noData: '没有数据',
      interviewName: '访谈名称',
      totalInterviews: '访谈总数',
      completedCount: '完成',
      inProgressCount: '进行中',
      totalMessages: '消息总数',
      avgDuration: '平均时长',
      lastConducted: '最后进行时间',
      actions: '操作',
      viewSummary: '查看摘要',
      minutesUnitShort: '分钟',
    },
    it: {
      loading: 'Caricamento...',
      backToHome: '← Torna alla Home',
      reportsTitle: 'Report',
      noDataYet: 'Nessun dato di aggregazione. Esegui l’aggregazione dal pannello.',
      goToAdmin: 'Vai all’Admin',
      sessionsListTitle: 'Sessioni di Intervista',
      refresh: 'Aggiorna',
      selectAggregation: 'Seleziona Aggregazione',
      displayLanguage: 'Lingua di visualizzazione',
      allSessions: 'Tutte le sessioni',
      inProgress: 'In corso',
      completed: 'Completate',
      interviewTypes: 'Tipi di intervista',
      llmModel: 'Modello LLM',
      aggregationDate: 'Data di aggregazione',
      noData: 'Nessun dato',
      interviewName: 'Nome intervista',
      totalInterviews: 'Interviste totali',
      completedCount: 'Completate',
      inProgressCount: 'In corso',
      totalMessages: 'Messaggi totali',
      avgDuration: 'Durata media',
      lastConducted: 'Ultima esecuzione',
      actions: 'Azioni',
      viewSummary: 'Vedi riepilogo',
      minutesUnitShort: 'min',
    },
    rm: {
      loading: 'Chargiament...',
      backToHome: '← Turnar a la Home',
      reportsTitle: 'Rapports',
      noDataYet: 'Anc nagins datas d’aggregaziun. Fas l’aggregaziun en l’admin.',
      goToAdmin: 'A l’Admin',
      sessionsListTitle: 'Sessziuns d’intervista',
      refresh: 'Actualisar',
      selectAggregation: 'Tscherner aggregaziun',
      displayLanguage: 'Lingua da visualisaziun',
      allSessions: 'Tut las sessziuns',
      inProgress: 'En lavur',
      completed: 'Terminadas',
      interviewTypes: 'Tips d’intervista',
      llmModel: 'Model LLM',
      aggregationDate: 'Data d’aggregaziun',
      noData: 'Nagins datas',
      interviewName: 'Num d’intervista',
      totalInterviews: 'Total d’intervistas',
      completedCount: 'Terminadas',
      inProgressCount: 'En lavur',
      totalMessages: 'Total da messadis',
      avgDuration: 'Durada media',
      lastConducted: 'Ultima realisaziun',
      actions: 'Acziuns',
      viewSummary: 'Vesair resumaziun',
      minutesUnitShort: 'minutas',
    },
    gsw: {
      loading: 'Am Lade...',
      backToHome: '← Zrugg zur Home',
      reportsTitle: 'Rapporte',
      noDataYet: 'Kei Sammledate. Mach d Aggregation im Verwaltigspanal.',
      goToAdmin: 'Zum Verwaltigspanal',
      sessionsListTitle: 'Interview-Sitzige',
      refresh: 'Aktualisiere',
      selectAggregation: 'Aggregation wähle',
      displayLanguage: 'Aazeigesproch',
      allSessions: 'Alli Sitzige',
      inProgress: 'Am Laufe',
      completed: 'Abgschlosse',
      interviewTypes: 'Interview-Typene',
      llmModel: 'LLM-Model',
      aggregationDate: 'Aggregationsdatum',
      noData: 'Kei Date',
      interviewName: 'Interview-Name',
      totalInterviews: 'Total Interviews',
      completedCount: 'Abgschlosse',
      inProgressCount: 'Am Laufe',
      totalMessages: 'Total Nahrichte',
      avgDuration: 'Durchschn. Duur',
      lastConducted: 'Letschti Duregfüehrig',
      actions: 'Aktione',
      viewSummary: 'Zämesfassig aaluege',
      minutesUnitShort: 'Minute',
    },
  } as Record<string, any>;
  return dict[lang] || dict.en;
};

const formatDuration = (seconds: number | undefined | null, lang: string, fallback?: string) => {
  if (!seconds && seconds !== 0) return fallback || '-';
  const minutes = Math.max(0, Math.round((seconds || 0) / 60));
  const unitMap: Record<string, string> = {
    en: 'min', ja: '分', es: 'min', fr: 'min', de: 'Min', zh: '分钟', it: 'min', rm: 'minutas', gsw: 'Minute'
  };
  const unit = unitMap[lang] || 'min';
  return `${minutes} ${unit}`;
};

function ReportsPageContent() {
  const searchParams = useSearchParams();
  const [aggregations, setAggregations] = useState<ReportAggregation[]>([]);
  const [selectedAggregationId, setSelectedAggregationId] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [reportDetails, setReportDetails] = useState<ReportDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const t = getTexts(selectedLanguage);

  // Load language from URL parameter first, then fallback to localStorage
  useEffect(() => {
    const langParam = searchParams.get('lang');
    const savedLang = localStorage.getItem('app_language') || 'en';
    setSelectedLanguage(langParam || savedLang);
  }, [searchParams]);

  useEffect(() => {
    fetchAggregations();
  }, []);

  useEffect(() => {
    if (selectedAggregationId && selectedLanguage) {
      fetchReportDetails(selectedAggregationId, selectedLanguage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAggregationId, selectedLanguage]);

  const fetchAggregations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports');
      const data = await response.json();
      setAggregations(data);
      
      // Auto-select the latest aggregation
      if (data.length > 0 && !selectedAggregationId) {
        setSelectedAggregationId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching aggregations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportDetails = async (aggregationId: string, language: string) => {
    try {
      setDetailsLoading(true);
      const response = await fetch(`/api/reports/${aggregationId}?language=${language}`);
      const data = await response.json();
      setReportDetails(data.details || []);
    } catch (error) {
      console.error('Error fetching report details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(getLocale(selectedLanguage), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const selectedAggregation = aggregations.find(a => a.id === selectedAggregationId);

  const totalCompleted = reportDetails.reduce((sum, d) => sum + d.completed_interviews, 0);
  const totalInProgress = reportDetails.reduce((sum, d) => sum + d.in_progress_interviews, 0);
  const totalAll = reportDetails.reduce((sum, d) => sum + d.total_interviews, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (aggregations.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <Link
                href="/"
                className="text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {t.backToHome}
              </Link>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {t.reportsTitle}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t.noDataYet}
              </p>
              <Link
                href="/admin"
                className="mt-6 inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                {t.goToAdmin}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
            <Link
              href="/"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {t.backToHome}
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              🔄 {t.refresh}
            </button>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {t.sessionsListTitle}
            </h1>
          </div>

          {/* Aggregation Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.selectAggregation}
              </label>
              <select
                value={selectedAggregationId || ''}
                onChange={(e) => setSelectedAggregationId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {aggregations.map((agg) => (
                  <option key={agg.id} value={agg.id}>
                    {formatDate(agg.created_at)} - {agg.llm_model} ({agg.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary Cards */}
          {selectedAggregation && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t.allSessions}</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{totalAll}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t.inProgress}</p>
                <p className="text-4xl font-bold text-blue-600">{totalInProgress}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t.completed}</p>
                <p className="text-4xl font-bold text-green-600">{totalCompleted}</p>
              </div>
            </div>
          )}

          {/* Report Details Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t.interviewTypes}</h2>
              {selectedAggregation && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {t.llmModel}: <span className="font-mono font-semibold">{selectedAggregation.llm_model}</span>
                  {' | '}
                  {t.aggregationDate}: {formatDate(selectedAggregation.created_at)}
                </p>
              )}
            </div>

            {detailsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            ) : reportDetails.length === 0 ? (
              <div className="p-8 text-center text-gray-600 dark:text-gray-400">
                {t.noData}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.interviewName}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.totalInterviews}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.completedCount}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.inProgressCount}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.totalMessages}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.avgDuration}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.lastConducted}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t.actions}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {reportDetails.map((detail) => (
                      <tr key={detail.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {detail.template_title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {detail.template_id}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                          {detail.total_interviews}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-semibold text-green-600">
                            {detail.completed_interviews}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-semibold text-blue-600">
                            {detail.in_progress_interviews}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                          {detail.total_messages}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                          {formatDuration((detail as any).avg_duration_seconds, selectedLanguage, detail.avg_duration)}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          {detail.last_conducted_at ? formatDate(detail.last_conducted_at) : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Link
                            href={`/reports/${selectedAggregationId}/${detail.template_id}?lang=${selectedLanguage}`}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                          >
                            {t.viewSummary}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <ReportsPageContent />
    </Suspense>
  );
}

