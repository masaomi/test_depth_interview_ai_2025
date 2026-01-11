'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { InterviewTemplate, Persona } from '@/lib/types';

// Helper function to get translated texts
const getTexts = (lang: string) => {
  const dict = {
    en: {
      backToHome: '← Back to Home',
      logout: 'Logout',
      adminPanel: 'Admin Panel',
      createManageTemplates: 'Create and manage interview templates',
      runAggregation: 'Run Aggregation',
      aggregating: 'Aggregating...',
      aggregationConfirm: 'Do you want to run aggregation? It may take some time to complete.',
      aggregationCompleteWithId: 'Aggregation completed successfully (ID: {id})',
      aggregationFailed: 'Aggregation failed',
      aggregationError: 'An error occurred during aggregation',
      panelDisabled: 'Admin Panel Disabled',
      panelDisabledMessage: 'Set ADMIN_PASSWORD to enable.',
      adminLogin: 'Admin Login',
      enterPassword: 'Enter admin password',
      signIn: 'Sign In',
      sessionNote: 'Note: Session is stored in localStorage.',
      invalidPassword: 'Invalid password',
      editTemplate: 'Edit Interview Template',
      createTemplate: 'Create Interview Template',
      cancelEdit: 'Cancel Edit',
      interviewTitle: 'Interview Title',
      titlePlaceholder: 'e.g., Product Feedback Interview',
      interviewPrompt: 'Interview Prompt',
      promptPlaceholder: 'Describe what you want to ask users.',
      durationSeconds: 'Duration (seconds)',
      durationMinutes: '{minutes} minutes',
      saveTemplate: 'Save Template',
      updateTemplate: 'Update Template',
      saving: 'Saving...',
      generatingTranslations: '⏳ Generating translations for 9 languages (en, ja, es, fr, de, zh, it, rm, gsw)... This may take a moment.',
      interviewTemplates: 'Interview Templates',
      noTemplates: 'No templates created yet.',
      edit: 'Edit',
      delete: 'Delete',
      durationLabel: 'Duration',
      generatedOverview: '📋 Generated Overview (displayed to participants):',
      viewOriginalPrompt: 'View original prompt',
      deleteConfirm: 'Are you sure you want to delete this template?',
      activate: 'Show',
      deactivate: 'Hide',
      inactive: '(Hidden)',
      downloadLogs: 'Download Logs',
      tabs: {
        templates: 'Templates',
        personas: 'Personas',
        batch: 'Batch Run',
        tokens: 'Token Usage'
      },
      personas: {
        title: 'Virtual Personas',
        create: 'Create Persona',
        edit: 'Edit Persona',
        name: 'Name',
        basePrompt: 'Base Prompt',
        variations: 'Variation Parameters (JSON)',
        save: 'Save Persona',
        update: 'Update Persona',
        noPersonas: 'No personas created yet.',
        placeholderPrompt: 'You are a bioinformatics researcher with expertise in genomics...',
        downloadLogs: 'Download Logs'
      },
      batch: {
        title: 'Run Virtual Interviews',
        template: 'Template',
        persona: 'Persona',
        count: 'Run Count',
        maxTurns: 'Max Turns',
        useVariations: 'Use Variations',
        start: 'Start Batch Run',
        running: 'Running...',
        progress: 'Progress',
        logs: 'Session Logs'
      },
      tokens: {
        title: 'Token Usage Dashboard',
        total: 'Total Tokens',
        virtual: 'Virtual Tokens',
        human: 'Human Tokens',
        byModel: 'By Model',
        byEndpoint: 'By Endpoint',
        recent: 'Recent Logs'
      }
    },
    ja: {
      backToHome: '← ホームに戻る',
      logout: 'ログアウト',
      adminPanel: '管理パネル',
      createManageTemplates: 'インタビューテンプレートの作成と管理',
      runAggregation: '集計実行',
      aggregating: '集計処理中...',
      aggregationConfirm: '集計を実行しますか？完了まで時間がかかる場合があります。',
      aggregationCompleteWithId: '集計が完了しました（集計ID: {id}）',
      aggregationFailed: '集計に失敗しました',
      aggregationError: '集計中にエラーが発生しました',
      panelDisabled: '管理パネル無効',
      panelDisabledMessage: '有効にするにはADMIN_PASSWORDを設定してください。',
      adminLogin: '管理者ログイン',
      enterPassword: '管理者パスワードを入力',
      signIn: 'サインイン',
      sessionNote: 'セッションはlocalStorageに保存されます。',
      invalidPassword: 'パスワードが無効です',
      editTemplate: 'テンプレート編集',
      createTemplate: 'インタビューテンプレート作成',
      cancelEdit: '編集をキャンセル',
      interviewTitle: 'インタビュータイトル',
      titlePlaceholder: '例：製品フィードバックインタビュー',
      interviewPrompt: 'インタビュープロンプト',
      promptPlaceholder: 'ユーザーに聞きたいことを記述してください。',
      durationSeconds: '所要時間（秒）',
      durationMinutes: '{minutes}分',
      saveTemplate: 'テンプレート保存',
      updateTemplate: 'テンプレート更新',
      saving: '保存中...',
      generatingTranslations: '⏳ 9言語（en, ja, es, fr, de, zh, it, rm, gsw）の翻訳を生成中... しばらくお待ちください。',
      interviewTemplates: 'インタビューテンプレート',
      noTemplates: 'まだテンプレートが作成されていません。',
      edit: '編集',
      delete: '削除',
      durationLabel: '所要時間',
      generatedOverview: '📋 生成された概要（参加者に表示）：',
      viewOriginalPrompt: '元のプロンプトを見る',
      deleteConfirm: 'このテンプレートを削除してもよろしいですか？',
      activate: '表示',
      deactivate: '非表示',
      inactive: '（非表示中）',
      downloadLogs: 'ログをダウンロード',
      tabs: {
        templates: 'テンプレート',
        personas: 'ペルソナ',
        batch: 'バッチ実行',
        tokens: 'トークン使用量'
      },
      personas: {
        title: '仮想ペルソナ',
        create: 'ペルソナ作成',
        edit: 'ペルソナ編集',
        name: '名前',
        basePrompt: 'ベースプロンプト',
        variations: 'バリエーション設定 (JSON)',
        save: 'ペルソナ保存',
        update: 'ペルソナ更新',
        noPersonas: 'まだペルソナが作成されていません。',
        placeholderPrompt: 'あなたはゲノム科学の専門知識を持つバイオインフォマティクス研究者です...',
        downloadLogs: 'ログをダウンロード'
      },
      batch: {
        title: '仮想インタビュー実行',
        template: 'テンプレート',
        persona: 'ペルソナ',
        count: '実行回数',
        maxTurns: '最大ターン数',
        useVariations: 'バリエーション使用',
        start: 'バッチ実行開始',
        running: '実行中...',
        progress: '進捗',
        logs: 'セッションログ'
      },
      tokens: {
        title: 'トークン使用量ダッシュボード',
        total: '総トークン数',
        virtual: '仮想トークン',
        human: '人間トークン',
        byModel: 'モデル別',
        byEndpoint: 'エンドポイント別',
        recent: '最近のログ'
      }
    },
  } as Record<string, any>;
  return dict[lang] || dict.en;
};

type Tab = 'templates' | 'personas' | 'batch' | 'tokens';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('templates');
  
  // Templates State
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(600);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Personas State
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personaName, setPersonaName] = useState('');
  const [personaPrompt, setPersonaPrompt] = useState('');
  const [variationParams, setVariationParams] = useState('');
  const [editingPersonaId, setEditingPersonaId] = useState<string | null>(null);

  // Batch State
  const [batchTemplateId, setBatchTemplateId] = useState('');
  const [batchPersonaId, setBatchPersonaId] = useState('');
  const [runCount, setRunCount] = useState(1);
  const [useVariations, setUseVariations] = useState(false);
  const [maxTurns, setMaxTurns] = useState(15);
  const [batchLogs, setBatchLogs] = useState<Array<{ type: string; content: string; role?: string; turn?: number }>>([]);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  
  // Persona Stats State
  const [personaStats, setPersonaStats] = useState<any[]>([]);

  // Token State
  const [tokenStats, setTokenStats] = useState<any>(null);

  // Common State
  const [loading, setLoading] = useState(false);
  const [aggregating, setAggregating] = useState(false);
  const [aggregationMessage, setAggregationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('app_language') || 'en';
    setSelectedLanguage(savedLang);
  }, []);

  const t = getTexts(selectedLanguage);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/auth');
        const data = await res.json();
        if (!mounted) return;
        setEnabled(!!data.enabled);
        if (data.enabled) {
          const authed = localStorage.getItem('admin_authed') === '1';
          if (authed) setIsAuthenticated(true);
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'templates') fetchTemplates();
      if (activeTab === 'personas' || activeTab === 'batch') fetchPersonas();
      if (activeTab === 'tokens') fetchTokenStats();
      // Batch also needs templates
      if (activeTab === 'batch') fetchTemplates();
    }
  }, [isAuthenticated, activeTab]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates?include_inactive=true');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchPersonas = async () => {
    try {
      const response = await fetch('/api/personas');
      const data = await response.json();
      setPersonas(data);
      // Also fetch stats
      fetchPersonaStats();
    } catch (error) {
      console.error('Error fetching personas:', error);
    }
  };

  const fetchPersonaStats = async () => {
    try {
      const response = await fetch('/api/personas/stats');
      const data = await response.json();
      setPersonaStats(data);
    } catch (error) {
      console.error('Error fetching persona stats:', error);
    }
  };

  const fetchTokenStats = async () => {
    try {
      const response = await fetch('/api/admin/tokens');
      const data = await response.json();
      setTokenStats(data);
    } catch (error) {
      console.error('Error fetching token stats:', error);
    }
  };

  // Template Handlers
  const handleEdit = (template: InterviewTemplate) => {
    setEditingId(template.id);
    setTitle(template.title);
    setPrompt(template.prompt);
    setDuration(template.duration);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setPrompt('');
    setDuration(600);
  };

  const handleSubmitTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId
        ? JSON.stringify({ id: editingId, title, prompt, duration })
        : JSON.stringify({ title, prompt, duration });

      const response = await fetch('/api/templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (response.ok) {
        setTitle('');
        setPrompt('');
        setDuration(600);
        setEditingId(null);
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm(t.deleteConfirm)) return;
    try {
      const response = await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
      if (response.ok) fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: number | undefined) => {
    try {
      const newStatus = currentStatus === 0 ? 1 : 0;
      const response = await fetch('/api/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: newStatus }),
      });
      if (response.ok) fetchTemplates();
    } catch (error) {
      console.error('Error toggling template status:', error);
    }
  };

  // Persona Handlers
  const handleEditPersona = (persona: Persona) => {
    setEditingPersonaId(persona.id);
    setPersonaName(persona.name);
    setPersonaPrompt(persona.base_prompt);
    setVariationParams(persona.variation_params || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditPersona = () => {
    setEditingPersonaId(null);
    setPersonaName('');
    setPersonaPrompt('');
    setVariationParams('');
  };

  const handleSubmitPersona = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = editingPersonaId ? 'PUT' : 'POST';
      let parsedParams = null;
      if (variationParams.trim()) {
        try {
          parsedParams = JSON.parse(variationParams);
        } catch (e) {
          alert('Invalid JSON for variation params');
          setLoading(false);
          return;
        }
      }

      const body = editingPersonaId
        ? JSON.stringify({ id: editingPersonaId, name: personaName, base_prompt: personaPrompt, variation_params: parsedParams })
        : JSON.stringify({ name: personaName, base_prompt: personaPrompt, variation_params: parsedParams });

      const response = await fetch('/api/personas', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (response.ok) {
        setPersonaName('');
        setPersonaPrompt('');
        setVariationParams('');
        setEditingPersonaId(null);
        fetchPersonas();
      }
    } catch (error) {
      console.error('Error saving persona:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePersona = async (id: string) => {
    if (!confirm(t.deleteConfirm)) return;
    try {
      const response = await fetch(`/api/personas?id=${id}`, { method: 'DELETE' });
      if (response.ok) fetchPersonas();
    } catch (error) {
      console.error('Error deleting persona:', error);
    }
  };

  // Batch Handlers
  const handleStartBatch = async () => {
    if (!batchTemplateId || !batchPersonaId) return;
    setIsBatchRunning(true);
    setBatchLogs([]);
    setBatchProgress({ current: 0, total: runCount });

    try {
      const response = await fetch('/api/personas/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: batchTemplateId,
          persona_id: batchPersonaId,
          run_count: runCount,
          use_variations: useVariations,
          max_turns: maxTurns
        }),
      });

      if (!response.ok) throw new Error('Failed to start batch');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === 'progress') {
              setBatchProgress(prev => ({ ...prev, current: msg.index }));
              setBatchLogs(prev => [{ type: 'status', content: `--- Session ${msg.index + 1} Starting ---` }, ...prev]);
            } else if (msg.type === 'conversation') {
              setBatchLogs(prev => [{ 
                type: 'conversation', 
                content: msg.content, 
                role: msg.role,
                turn: msg.turn 
              }, ...prev]);
            } else if (msg.type === 'update') {
              // Just update progress, no log needed for each turn update
            } else if (msg.type === 'completed') {
              setBatchProgress(prev => ({ ...prev, current: msg.index + 1 }));
              setBatchLogs(prev => [{ type: 'status', content: `✅ Session ${msg.index + 1}: Completed (${msg.turns} turns)` }, ...prev]);
            } else if (msg.type === 'error') {
              setBatchLogs(prev => [{ type: 'error', content: `❌ Error: ${msg.message}` }, ...prev]);
            }
          } catch (e) {
            console.error('Error parsing batch stream:', e);
          }
        }
      }
      // Refresh persona stats after batch completes
      fetchPersonaStats();
    } catch (error) {
      console.error('Batch run error:', error);
      setBatchLogs(prev => [{ type: 'error', content: `Fatal Error: ${String(error)}` }, ...prev]);
    } finally {
      setIsBatchRunning(false);
    }
  };

  const handleDownloadLogs = (personaId: string) => {
    window.location.href = `/api/personas/sessions?persona_id=${personaId}&format=markdown`;
  };

  const handleDownloadTemplateLogs = (templateId: string) => {
    window.location.href = `/api/templates/sessions?template_id=${templateId}&format=markdown`;
  };

  const handleRunAggregation = async () => {
    if (!confirm(t.aggregationConfirm)) return;
    setAggregating(true);
    setAggregationMessage(null);
    try {
      const response = await fetch('/api/reports', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setAggregationMessage({ type: 'success', text: t.aggregationCompleteWithId.replace('{id}', data.aggregation_id) });
      } else {
        setAggregationMessage({ type: 'error', text: t.aggregationFailed });
      }
    } catch (error) {
      setAggregationMessage({ type: 'error', text: t.aggregationError });
    } finally {
      setAggregating(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error('Unauthorized');
      localStorage.setItem('admin_authed', '1');
      setIsAuthenticated(true);
    } catch {
      setAuthError(t.invalidPassword);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_authed');
    setIsAuthenticated(false);
  };

  if (authLoading) return <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800" />;

  if (enabled === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <Link href="/" className="text-indigo-600 dark:text-indigo-400 hover:underline">{t.backToHome}</Link>
            <h1 className="text-3xl font-bold mt-6 text-gray-900 dark:text-white">{t.panelDisabled}</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">{t.panelDisabledMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t.adminLogin}</h1>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.enterPassword}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {authError && <p className="text-sm text-red-600">{authError}</p>}
              <button type="submit" className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">{t.signIn}</button>
              <p className="text-xs text-gray-500">{t.sessionNote}</p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex justify-between items-center">
            <Link href="/" className="text-indigo-600 dark:text-indigo-400 hover:underline">{t.backToHome}</Link>
            <button onClick={handleLogout} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">{t.logout}</button>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8 text-center">{t.adminPanel}</h1>

          {/* Aggregation Control */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mb-8 text-center">
            <button
              onClick={handleRunAggregation}
              disabled={aggregating}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aggregating ? t.aggregating : `🔄 ${t.runAggregation}`}
            </button>
            {aggregationMessage && (
              <div className={`mt-4 p-4 rounded-lg ${aggregationMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {aggregationMessage.text}
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            {(['templates', 'personas', 'batch', 'tokens'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {t.tabs[tab]}
              </button>
            ))}
          </div>

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editingId ? t.editTemplate : t.createTemplate}</h2>
                {editingId && (
                  <button onClick={handleCancelEdit} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg">{t.cancelEdit}</button>
                )}
              </div>
              <form onSubmit={handleSubmitTemplate} className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.interviewTitle}</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder={t.titlePlaceholder} className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.interviewPrompt}</label>
                  <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} required rows={6} placeholder={t.promptPlaceholder} className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.durationSeconds}</label>
                  <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} required min="60" step="60" className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-white" />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.durationMinutes.replace('{minutes}', String(Math.floor(duration / 60)))}</p>
                </div>
                <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {loading ? t.saving : editingId ? t.updateTemplate : t.saveTemplate}
                </button>
                {loading && <p className="text-sm text-center text-gray-500">{t.generatingTranslations}</p>}
              </form>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t.interviewTemplates}</h2>
              {templates.length === 0 ? <p className="text-center text-gray-500">{t.noTemplates}</p> : (
                <div className="space-y-4">
                  {templates.map((template) => {
                    const isActive = template.is_active !== 0;
                    return (
                      <div key={template.id} className={`p-6 rounded-lg ${isActive ? 'bg-gray-50 dark:bg-gray-700' : 'bg-gray-200 dark:bg-gray-800 opacity-60'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {template.title}
                            {!isActive && <span className="ml-2 text-sm font-normal text-orange-600 dark:text-orange-400">{t.inactive}</span>}
                          </h3>
                          <div className="flex gap-2">
                            <button onClick={() => handleDownloadTemplateLogs(template.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">{t.downloadLogs}</button>
                            <button onClick={() => handleToggleActive(template.id, template.is_active)} className={`px-4 py-2 rounded-lg text-sm ${isActive ? 'bg-orange-500 text-white' : 'bg-green-600 text-white'}`}>
                              {isActive ? t.deactivate : t.activate}
                            </button>
                            <button onClick={() => handleEdit(template)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{t.edit}</button>
                            <button onClick={() => handleDeleteTemplate(template.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">{t.delete}</button>
                          </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-2">{t.durationLabel}: {t.durationMinutes.replace('{minutes}', String(Math.floor(template.duration / 60)))}</p>
                        {template.overview && (
                          <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">{t.generatedOverview}</p>
                            <p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-line">{template.overview}</p>
                          </div>
                        )}
                        <details className="text-sm">
                          <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">{t.viewOriginalPrompt}</summary>
                          <p className="mt-2 text-gray-500 dark:text-gray-400 whitespace-pre-line">{template.prompt}</p>
                        </details>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Personas Tab */}
          {activeTab === 'personas' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editingPersonaId ? t.personas.edit : t.personas.create}</h2>
                {editingPersonaId && (
                  <button onClick={handleCancelEditPersona} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg">{t.cancelEdit}</button>
                )}
              </div>
              <form onSubmit={handleSubmitPersona} className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.personas.name}</label>
                  <input type="text" value={personaName} onChange={(e) => setPersonaName(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.personas.basePrompt}</label>
                  <textarea value={personaPrompt} onChange={(e) => setPersonaPrompt(e.target.value)} required rows={4} placeholder={t.personas.placeholderPrompt} className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.personas.variations}</label>
                  <textarea value={variationParams} onChange={(e) => setVariationParams(e.target.value)} rows={3} placeholder='{"auto_generate": {"enabled": true}}' className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-white font-mono text-sm" />
                </div>
                <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {loading ? t.saving : editingPersonaId ? t.personas.update : t.personas.save}
                </button>
              </form>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t.personas.title}</h2>
              {personas.length === 0 ? <p className="text-center text-gray-500">{t.personas.noPersonas}</p> : (
                <div className="space-y-4">
                  {personas.map((persona) => {
                    const stats = personaStats.find((s: any) => s.persona_id === persona.id);
                    return (
                      <div key={persona.id} className="p-6 rounded-lg bg-gray-50 dark:bg-gray-700">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{persona.name}</h3>
                            {stats && stats.total_runs > 0 && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                📊 {stats.total_runs} {selectedLanguage === 'ja' ? '回実行' : 'runs'} 
                                {stats.template_count > 0 && ` (${stats.template_count} ${selectedLanguage === 'ja' ? '種類のインタビュー' : 'templates'})`}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleDownloadLogs(persona.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">{t.personas.downloadLogs}</button>
                            <button onClick={() => handleEditPersona(persona)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{t.edit}</button>
                            <button onClick={() => handleDeletePersona(persona.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">{t.delete}</button>
                          </div>
                        </div>
                        
                        {/* Stats breakdown by template */}
                        {stats && stats.by_template && stats.by_template.length > 0 && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                              {selectedLanguage === 'ja' ? 'インタビュー別実行回数:' : 'Runs by Interview:'}
                            </p>
                            <div className="space-y-1">
                              {stats.by_template.map((t: any) => (
                                <div key={t.template_id} className="flex justify-between text-sm">
                                  <span className="text-blue-800 dark:text-blue-300">{t.template_title}</span>
                                  <span className="font-mono text-blue-900 dark:text-blue-100">{t.run_count} {selectedLanguage === 'ja' ? '回' : 'runs'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <details className="text-sm mt-3">
                          <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">{t.viewOriginalPrompt}</summary>
                          <p className="mt-2 text-gray-500 dark:text-gray-400 whitespace-pre-line">{persona.base_prompt}</p>
                        </details>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Batch Run Tab */}
          {activeTab === 'batch' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t.batch.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.batch.template}</label>
                  <select value={batchTemplateId} onChange={(e) => setBatchTemplateId(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-white">
                    <option value="">Select Template</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.batch.persona}</label>
                  <select value={batchPersonaId} onChange={(e) => setBatchPersonaId(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-white">
                    <option value="">Select Persona</option>
                    {personas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.batch.count}</label>
                  <input type="number" value={runCount} onChange={(e) => setRunCount(parseInt(e.target.value))} min="1" max="50" className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.batch.maxTurns}</label>
                  <input type="number" value={maxTurns} onChange={(e) => setMaxTurns(parseInt(e.target.value))} min="1" max="50" className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-white" />
                </div>
                <div className="md:col-span-2 flex items-center">
                  <input type="checkbox" checked={useVariations} onChange={(e) => setUseVariations(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                  <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">{t.batch.useVariations}</label>
                </div>
              </div>
              <button 
                onClick={handleStartBatch} 
                disabled={isBatchRunning || !batchTemplateId || !batchPersonaId}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {isBatchRunning ? t.batch.running : t.batch.start}
              </button>

              {batchProgress.total > 0 && (
                <div className="mt-8">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.batch.progress}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{batchProgress.current} / {batchProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div className="bg-purple-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}></div>
                  </div>
                </div>
              )}

              {batchLogs.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t.batch.logs}</h3>
                  <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg h-96 overflow-y-auto text-sm">
                    {batchLogs.map((log, i) => {
                      if (log.type === 'status') {
                        return (
                          <div key={i} className="py-2 font-bold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-700">
                            {log.content}
                          </div>
                        );
                      } else if (log.type === 'conversation') {
                        const isPersona = log.role === 'persona';
                        return (
                          <div key={i} className={`py-2 pl-4 border-l-4 ${isPersona ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'} my-1 rounded-r`}>
                            <span className={`font-semibold ${isPersona ? 'text-purple-700 dark:text-purple-300' : 'text-blue-700 dark:text-blue-300'}`}>
                              {isPersona ? '🧑 Persona' : '🎤 Interviewer'}
                              {log.turn && ` (Turn ${log.turn})`}:
                            </span>
                            <p className="mt-1 text-gray-700 dark:text-gray-300">{log.content}</p>
                          </div>
                        );
                      } else if (log.type === 'error') {
                        return (
                          <div key={i} className="py-2 text-red-600 dark:text-red-400 font-medium">
                            {log.content}
                          </div>
                        );
                      }
                      return <div key={i}>{log.content}</div>;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Token Usage Tab */}
          {activeTab === 'tokens' && tokenStats && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t.tokens.title}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">{t.tokens.total}</h3>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">{tokenStats.summary.total_tokens.toLocaleString()}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
                  <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200">{t.tokens.virtual}</h3>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-2">{tokenStats.summary.virtual_tokens.toLocaleString()}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-200">{t.tokens.human}</h3>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">{tokenStats.summary.human_tokens.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t.tokens.byModel}</h3>
                  <div className="space-y-3">
                    {tokenStats.by_model.map((m: any) => (
                      <div key={m.model} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-gray-700 dark:text-gray-300">{m.model}</span>
                        <span className="font-mono text-gray-900 dark:text-white">{m.tokens.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t.tokens.byEndpoint}</h3>
                  <div className="space-y-3">
                    {tokenStats.by_endpoint.map((e: any) => (
                      <div key={e.endpoint} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-gray-700 dark:text-gray-300">{e.endpoint}</span>
                        <span className="font-mono text-gray-900 dark:text-white">{e.tokens.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t.tokens.recent}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Endpoint</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Model</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tokens</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {tokenStats.recent_logs.map((log: any) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{log.api_endpoint}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{log.model_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">{log.total_tokens}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{log.is_virtual ? 'Virtual' : 'Human'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
