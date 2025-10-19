'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { InterviewTemplate } from '@/lib/types';

export default function AdminPage() {
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(600);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aggregating, setAggregating] = useState(false);
  const [aggregationMessage, setAggregationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

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
      fetchTemplates();
    }
  }, [isAuthenticated]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleEdit = (template: InterviewTemplate) => {
    setEditingId(template.id);
    setTitle(template.title);
    setPrompt(template.prompt);
    setDuration(template.duration);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setPrompt('');
    setDuration(600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/templates?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleRunAggregation = async () => {
    if (!confirm('集計を実行しますか？完了まで時間がかかる場合があります。')) {
      return;
    }

    setAggregating(true);
    setAggregationMessage(null);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setAggregationMessage({
          type: 'success',
          text: `集計が完了しました（集計ID: ${data.aggregation_id}）`
        });
      } else {
        setAggregationMessage({
          type: 'error',
          text: '集計に失敗しました'
        });
      }
    } catch (error) {
      console.error('Error running aggregation:', error);
      setAggregationMessage({
        type: 'error',
        text: '集計中にエラーが発生しました'
      });
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
      setAuthError('Invalid password');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_authed');
    setIsAuthenticated(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800" />
    );
  }

  if (enabled === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <Link
              href="/"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold mt-6 text-gray-900 dark:text-white">Admin Panel Disabled</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Set ADMIN_PASSWORD to enable.</p>
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Admin Login</h1>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {authError && <p className="text-sm text-red-600">{authError}</p>}
              <button
                type="submit"
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Sign In
              </button>
              <p className="text-xs text-gray-500">Note: Session is stored in localStorage.</p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link
              href="/"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              ← Back to Home
            </Link>
            <button
              onClick={handleLogout}
              className="ml-4 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
              Logout
            </button>
          </div>

          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Admin Panel
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Create and manage interview templates
            </p>
            <div className="mt-6">
              <button
                onClick={handleRunAggregation}
                disabled={aggregating}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aggregating ? '集計処理中...' : '🔄 集計実行'}
              </button>
            </div>
            {aggregationMessage && (
              <div className={`mt-4 p-4 rounded-lg ${
                aggregationMessage.type === 'success' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {aggregationMessage.text}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingId ? 'Edit Interview Template' : 'Create Interview Template'}
              </h2>
              {editingId && (
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel Edit
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Interview Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g., Product Feedback Interview"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Interview Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  required
                  rows={6}
                  placeholder="Describe what you want to ask users. For example: 'Interview users about their experience with our product. Ask about what they like, what they don't like, and what improvements they would suggest.'"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  required
                  min="60"
                  step="60"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {Math.floor(duration / 60)} minutes
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
              >
                {loading 
                  ? 'Generating translations and saving...' 
                  : editingId 
                    ? 'Update Template' 
                    : 'Save Template'}
              </button>
              {loading && (
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-2">
                  ⏳ Generating translations for 9 languages (en, ja, es, fr, de, zh, it, rm, gsw)... This may take a moment.
                </p>
              )}
            </form>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Interview Templates
            </h2>
            {templates.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                No templates created yet.
              </p>
            ) : (
              <div className="space-y-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {template.title}
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(template)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      Duration: {Math.floor(template.duration / 60)} minutes
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {template.prompt}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
