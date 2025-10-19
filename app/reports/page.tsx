'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ReportAggregation, ReportDetail } from '@/lib/types';

export default function ReportsPage() {
  const [aggregations, setAggregations] = useState<ReportAggregation[]>([]);
  const [selectedAggregationId, setSelectedAggregationId] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('ja');
  const [reportDetails, setReportDetails] = useState<ReportDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchAggregations();
  }, []);

  useEffect(() => {
    if (selectedAggregationId) {
      fetchReportDetails(selectedAggregationId, selectedLanguage);
    }
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
    return date.toLocaleString('ja-JP', {
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
          <p className="mt-4 text-gray-600 dark:text-gray-400">読み込み中...</p>
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
                ← トップに戻る
              </Link>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                集計結果
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                まだ集計データがありません。管理画面で集計を実行してください。
              </p>
              <Link
                href="/admin"
                className="mt-6 inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                管理画面へ
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
              ← トップに戻る
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              🔄 更新
            </button>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              インタビューセッション一覧
            </h1>
          </div>

          {/* Aggregation and Language Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  集計結果を選択
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  表示言語
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="zh">中文</option>
                  <option value="it">Italiano</option>
                  <option value="rm">Rumantsch</option>
                  <option value="gsw">Schwiizerdütsch</option>
                </select>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {selectedAggregation && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">全セッション</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{totalAll}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">進行中</p>
                <p className="text-4xl font-bold text-blue-600">{totalInProgress}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">完了</p>
                <p className="text-4xl font-bold text-green-600">{totalCompleted}</p>
              </div>
            </div>
          )}

          {/* Report Details Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">インタビュー種別</h2>
              {selectedAggregation && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  使用LLMモデル: <span className="font-mono font-semibold">{selectedAggregation.llm_model}</span>
                  {' | '}
                  集計実施日: {formatDate(selectedAggregation.created_at)}
                </p>
              )}
            </div>

            {detailsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            ) : reportDetails.length === 0 ? (
              <div className="p-8 text-center text-gray-600 dark:text-gray-400">
                データがありません
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        インタビュー名
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        総インタビュー数
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        完了
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        進行中
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        総メッセージ数
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        平均所要時間
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        最終実施日
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        アクション
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
                          {detail.avg_duration}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          {detail.last_conducted_at ? formatDate(detail.last_conducted_at) : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Link
                            href={`/reports/${selectedAggregationId}/${detail.template_id}?language=${selectedLanguage}`}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                          >
                            まとめを見る
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

