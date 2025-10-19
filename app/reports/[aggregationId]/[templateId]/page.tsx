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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
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
          <p className="mt-4 text-gray-600 dark:text-gray-400">読み込み中...</p>
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
              href="/reports"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              ← 一覧に戻る
            </Link>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              表示言語: <span className="font-semibold">{language === 'ja' ? '日本語' : language === 'en' ? 'English' : language}</span>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {reportDetail.template_title} - 集約レポート
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              対象セッション数: {reportDetail.total_interviews}件 | 
              集計更新: {formatDate(aggregation.created_at)}
            </p>
          </div>

          {/* Summary Statistics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">総セッション数</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reportDetail.total_interviews}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">完了</p>
                <p className="text-2xl font-bold text-green-600">
                  {reportDetail.completed_interviews}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">進行中</p>
                <p className="text-2xl font-bold text-blue-600">
                  {reportDetail.in_progress_interviews}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">総メッセージ数</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reportDetail.total_messages}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">平均所要時間</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reportDetail.avg_duration}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                使用LLMモデル: <span className="font-mono font-semibold text-gray-900 dark:text-white">{aggregation.llm_model}</span>
              </p>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              エグゼクティブサマリー
            </h2>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {reportDetail.executive_summary || 'サマリーは生成されませんでした。'}
            </div>
          </div>

          {/* Key Findings */}
          {keyFindings.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                主要な発見
              </h2>
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                セグメント別の傾向
              </h2>
              <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {reportDetail.segment_analysis}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {recommendedActions.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                推奨アクション
              </h2>
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
              新規インタビューを開始
            </Link>
            <Link
              href="/reports"
              className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

