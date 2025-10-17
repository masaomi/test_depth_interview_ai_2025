'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Message } from '@/lib/types';

export default function InterviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const templateId = params.id as string;
  const language = searchParams.get('lang') || 'en';

  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [interviewTitle, setInterviewTitle] = useState('');
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeInterview();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeInterview = async () => {
    try {
      // Create session
      const sessionRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId, language }),
      });
      const sessionData = await sessionRes.json();
      setSessionId(sessionData.id);

      // Initialize interview
      const initRes = await fetch('/api/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionData.id }),
      });
      const initData = await initRes.json();

      setMessages([{ role: 'assistant', content: initData.message }]);
      setInterviewTitle(initData.template.title);
      setDuration(initData.template.duration);
      setTimeRemaining(initData.template.duration);

      // Start timer
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            setShowExtendDialog(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setLoading(false);
    } catch (error) {
      console.error('Error initializing interview:', error);
      setLoading(false);
    }
  };

  // Minimal localized strings for the end-interview confirmation
  const getConfirmStrings = (lang: string) => {
    switch (lang) {
      case 'ja':
        return {
          endButton: 'インタビューを終了',
          title: 'インタビューを終了しますか？',
          message: '今すぐインタビューを終了します。よろしいですか？この操作は取り消せません。',
          cancel: 'キャンセル',
          confirm: '終了する',
        };
      case 'es':
        return {
          endButton: 'Finalizar entrevista',
          title: '¿Finalizar la entrevista?',
          message: '¿Seguro que deseas terminar la entrevista ahora? Esta acción no se puede deshacer.',
          cancel: 'Cancelar',
          confirm: 'Finalizar',
        };
      case 'fr':
        return {
          endButton: 'Terminer l\'entretien',
          title: 'Terminer l\'entretien ?',
          message: 'Êtes-vous sûr de vouloir terminer l\'entretien maintenant ? Cette action est irréversible.',
          cancel: 'Annuler',
          confirm: 'Terminer',
        };
      case 'de':
        return {
          endButton: 'Interview beenden',
          title: 'Interview beenden?',
          message: 'Möchten Sie das Interview jetzt beenden? Diese Aktion kann nicht rückgängig gemacht werden.',
          cancel: 'Abbrechen',
          confirm: 'Beenden',
        };
      case 'zh':
        return {
          endButton: '结束面试',
          title: '要结束面试吗？',
          message: '确定现在结束面试吗？此操作无法撤销。',
          cancel: '取消',
          confirm: '结束',
        };
      default:
        return {
          endButton: 'End Interview',
          title: 'End Interview?',
          message: 'Are you sure you want to end the interview now? This action cannot be undone.',
          cancel: 'Cancel',
          confirm: 'End',
        };
    }
  };
  const confirmStrings = getConfirmStrings(language);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);

    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: userMessage }),
      });
      const data = await response.json();

      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, an error occurred. Please try again.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleExtend = () => {
    setShowExtendDialog(false);
    const extensionTime = 300; // 5 minutes
    setTimeRemaining(extensionTime);
    setDuration((prev) => prev + extensionTime);

    // Restart timer
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          setShowExtendDialog(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleFinish = async () => {
    setShowExtendDialog(false);
    setShowThankYou(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Update session status
    try {
      await fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, status: 'completed' }),
      });
    } catch (error) {
      console.error('Error completing session:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700 dark:text-gray-300">Initializing interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 dark:bg-indigo-700 px-6 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white">{interviewTitle}</h1>
              <div className="text-right">
                <p className="text-sm text-indigo-200">Time Remaining</p>
                <p className={`text-2xl font-bold ${timeRemaining < 60 ? 'text-red-300' : 'text-white'}`}>
                  {formatTime(timeRemaining)}
                </p>
                <button
                  onClick={() => setShowConfirmEnd(true)}
                  className="mt-2 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  {confirmStrings.endButton}
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="h-[500px] overflow-y-auto p-6 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-lg px-4 py-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t dark:border-gray-700 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your response..."
                disabled={sending || showExtendDialog || showThankYou || showConfirmEnd}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !input.trim() || showExtendDialog || showThankYou || showConfirmEnd}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Extend Dialog */}
      {showExtendDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Time's Up!</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Would you like to extend the interview?
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleExtend}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Extend 5 minutes
              </button>
              <button
                onClick={handleFinish}
                className="flex-1 px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors font-medium"
              >
                Finish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thank You Dialog */}
      {showThankYou && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Thank you for participating!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your responses have been saved.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Confirm End Interview Dialog */}
      {showConfirmEnd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{confirmStrings.title}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{confirmStrings.message}</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirmEnd(false)}
                className="flex-1 px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors font-medium"
              >
                {confirmStrings.cancel}
              </button>
              <button
                onClick={() => { setShowConfirmEnd(false); handleFinish(); }}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                {confirmStrings.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
