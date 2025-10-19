'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ReportAggregation, ReportDetail } from '@/lib/types';

export default function ReportDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const aggregationId = params?.aggregationId as string;
  const templateId = params?.templateId as string;
  const language = searchParams?.get('language') || 'ja';

  const [aggregation, setAggregation] = useState<ReportAggregation | null>(null);
  const [reportDetail, setReportDetail] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportDetail();
  }, [aggregationId, templateId, language]);

  const fetchReportDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports/${aggregationId}?language=${language}`);
      const data = await response.json();
      
      setAggregation(data.aggregation);
      
      // Find the specific template detail
      const detail = data.details.find((d: ReportDetail) => d.template_id === templateId);
      setReportDetail(detail || null);
    } catch (error) {
      console.error('Error fetching report detail:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const t = (key: string): string => {
    const dict: Record<string, Record<string, string>> = {
      en: {
        loading: 'Loading...',
        backToList: '← Back to List',
        languageLabel: 'Language',
        reportTitle: 'Aggregated Report',
        targetSessions: 'Target Sessions',
        analysisDate: 'Analysis Date',
        totalSessions: 'Total Sessions',
        completed: 'Completed',
        inProgress: 'In Progress',
        totalMessages: 'Total Messages',
        avgDuration: 'Avg. Duration',
        model: 'LLM Model',
        execSummary: 'Executive Summary',
        notGenerated: 'Summary was not generated.',
        keyFindings: 'Key Findings',
        segmentAnalysis: 'Segment Analysis',
        recommendedActions: 'Recommended Actions',
        startNew: 'Start New Interview',
      },
      ja: {
        loading: '読み込み中...',
        backToList: '← 一覧に戻る',
        languageLabel: '表示言語',
        reportTitle: '集約レポート',
        targetSessions: '対象セッション数',
        analysisDate: '集計更新',
        totalSessions: '総セッション数',
        completed: '完了',
        inProgress: '進行中',
        totalMessages: '総メッセージ数',
        avgDuration: '平均所要時間',
        model: '使用LLMモデル',
        execSummary: 'エグゼクティブサマリー',
        notGenerated: 'サマリーは生成されませんでした。',
        keyFindings: '主要な発見',
        segmentAnalysis: 'セグメント別の傾向',
        recommendedActions: '推奨アクション',
        startNew: '新規インタビューを開始',
      },
    };
    const langDict = dict[language] || dict.en;
    return langDict[key] || key;
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds && seconds !== 0) return reportDetail?.avg_duration || '-';
    const minutes = Math.max(0, Math.round((seconds || 0) / 60));
    const unit = language === 'ja' ? '分' : 'min';
    return `${minutes} ${unit}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(getLocale(language), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const parseJsonArray = (jsonString?: string): string[] => {
    if (!jsonString) return [];
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!reportDetail || !aggregation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                レポートが見つかりません
              </h1>
              <Link
                href="/reports"
                className="mt-6 inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                一覧に戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const keyFindings = parseJsonArray(reportDetail.key_findings);
  const recommendedActions = parseJsonArray(reportDetail.recommended_actions);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
            <Link
              href={`/reports?language=${language}`}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {t('backToList')}
            </Link>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('languageLabel')}: <span className="font-semibold">{language === 'ja' ? '日本語' : language === 'en' ? 'English' : language}</span>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {reportDetail.template_title} - {t('reportTitle')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('targetSessions')}: {reportDetail.total_interviews} | {t('analysisDate')}: {formatDate(aggregation.created_at)}
            </p>
          </div>

          {/* Summary Statistics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('totalSessions')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reportDetail.total_interviews}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('completed')}</p>
                <p className="text-2xl font-bold text-green-600">
                  {reportDetail.completed_interviews}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('inProgress')}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {reportDetail.in_progress_interviews}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('totalMessages')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reportDetail.total_messages}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('avgDuration')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatDuration((reportDetail as any).avg_duration_seconds)}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('model')}: <span className="font-mono font-semibold text-gray-900 dark:text-white">{aggregation.llm_model}</span>
              </p>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('execSummary')}</h2>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {reportDetail.executive_summary || t('notGenerated')}
            </div>
          </div>

          {/* Key Findings */}
          {keyFindings.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('keyFindings')}</h2>
              <ul className="space-y-3">
                {keyFindings.map((finding, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 flex-1">
                      {finding}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Segment Analysis */}
          {reportDetail.segment_analysis && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('segmentAnalysis')}</h2>
              <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {reportDetail.segment_analysis}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {recommendedActions.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('recommendedActions')}</h2>
              <ul className="space-y-3">
                {recommendedActions.map((action, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-600 text-xl mr-3">•</span>
                    <span className="text-gray-700 dark:text-gray-300 flex-1">
                      {action}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <Link
              href={`/interview/${templateId}?lang=${language}`}
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              {t('startNew')}
            </Link>
            <Link
              href={`/reports?language=${language}`}
              className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              {t('backToList')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

