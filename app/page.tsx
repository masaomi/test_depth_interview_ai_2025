'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { InterviewTemplate } from '@/lib/types';

export default function Home() {
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates(selectedLanguage);
  }, [selectedLanguage]);

  const fetchTemplates = async (lang: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/templates?lang=${encodeURIComponent(lang)}`);
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'zh', name: '中文' },
  ];

  const getLocalizedText = (lang: string) => {
    const texts: Record<string, any> = {
      en: {
        title: 'AI Interview System',
        subtitle: 'Create and conduct AI-powered interviews',
        selectLanguage: 'Select Language',
        languageNote: '💬 The interview will be conducted in the selected language',
        adminPanel: 'Admin Panel',
        availableInterviews: 'Available Interviews',
        loading: 'Loading interviews...',
        noInterviews: 'No interviews available. Create one in the Admin Panel.',
        duration: 'Duration',
        minutes: 'minutes',
      },
      ja: {
        title: 'AIインタビューシステム',
        subtitle: 'AI搭載のインタビューを作成・実施',
        selectLanguage: '言語を選択',
        languageNote: '💬 インタビューは選択された言語で実施されます',
        adminPanel: '管理パネル',
        availableInterviews: '利用可能なインタビュー',
        loading: 'インタビューを読み込み中...',
        noInterviews: 'インタビューがありません。管理パネルで作成してください。',
        duration: '所要時間',
        minutes: '分',
      },
      es: {
        title: 'Sistema de Entrevistas IA',
        subtitle: 'Crea y realiza entrevistas con IA',
        selectLanguage: 'Seleccionar Idioma',
        languageNote: '💬 La entrevista se realizará en el idioma seleccionado',
        adminPanel: 'Panel de Administración',
        availableInterviews: 'Entrevistas Disponibles',
        loading: 'Cargando entrevistas...',
        noInterviews: 'No hay entrevistas disponibles. Crea una en el Panel de Administración.',
        duration: 'Duración',
        minutes: 'minutos',
      },
      fr: {
        title: 'Système d\'Entretien IA',
        subtitle: 'Créer et mener des entretiens assistés par IA',
        selectLanguage: 'Sélectionner la Langue',
        languageNote: '💬 L\'entretien sera mené dans la langue sélectionnée',
        adminPanel: 'Panneau d\'Administration',
        availableInterviews: 'Entretiens Disponibles',
        loading: 'Chargement des entretiens...',
        noInterviews: 'Aucun entretien disponible. Créez-en un dans le Panneau d\'Administration.',
        duration: 'Durée',
        minutes: 'minutes',
      },
      de: {
        title: 'KI-Interview-System',
        subtitle: 'Erstellen und führen Sie KI-gestützte Interviews',
        selectLanguage: 'Sprache wählen',
        languageNote: '💬 Das Interview wird in der ausgewählten Sprache durchgeführt',
        adminPanel: 'Admin-Panel',
        availableInterviews: 'Verfügbare Interviews',
        loading: 'Interviews werden geladen...',
        noInterviews: 'Keine Interviews verfügbar. Erstellen Sie eines im Admin-Panel.',
        duration: 'Dauer',
        minutes: 'Minuten',
      },
      zh: {
        title: 'AI访谈系统',
        subtitle: '创建和进行AI驱动的访谈',
        selectLanguage: '选择语言',
        languageNote: '💬 访谈将以所选语言进行',
        adminPanel: '管理面板',
        availableInterviews: '可用访谈',
        loading: '正在加载访谈...',
        noInterviews: '没有可用的访谈。请在管理面板中创建。',
        duration: '时长',
        minutes: '分钟',
      },
    };
    return texts[lang] || texts.en;
  };

  const localizedText = getLocalizedText(selectedLanguage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              {localizedText.title}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              {localizedText.subtitle}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-8">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {localizedText.selectLanguage}
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {localizedText.languageNote}
              </p>
            </div>

            <div className="flex justify-center gap-4 mb-8">
              <Link
                href="/admin"
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                {localizedText.adminPanel}
              </Link>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {localizedText.availableInterviews}
              </h2>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">{localizedText.loading}</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  <p>{localizedText.noInterviews}</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {templates.map((template) => (
                    <Link
                      key={template.id}
                      href={`/interview/${template.id}?lang=${selectedLanguage}`}
                      className="block p-6 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {template.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-2">
                        {localizedText.duration}: {Math.floor(template.duration / 60)} {localizedText.minutes}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {template.prompt}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
