'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Message, InterviewTemplate, QuestionMetadata, ResponseMetadata } from '@/lib/types';

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
  const [currentQuestionMetadata, setCurrentQuestionMetadata] = useState<QuestionMetadata | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [scaleValue, setScaleValue] = useState<number>(3);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [interviewTitle, setInterviewTitle] = useState('');
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [templateData, setTemplateData] = useState<InterviewTemplate | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadTemplate();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Normalize UI state when a new assistant question arrives
  useEffect(() => {
    if (!currentQuestionMetadata) return;
    if (currentQuestionMetadata.type === 'scale') {
      const min = currentQuestionMetadata.scaleMin ?? 1;
      const max = currentQuestionMetadata.scaleMax ?? 5;
      const mid = Math.round((min + max) / 2);
      setScaleValue((prev) => (prev >= min && prev <= max ? prev : mid));
      setSelectedOptions([]);
      setInput('');
    } else if (
      currentQuestionMetadata.type === 'single_choice' ||
      currentQuestionMetadata.type === 'multi_choice'
    ) {
      setSelectedOptions([]);
      setInput('');
    }
  }, [currentQuestionMetadata]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadTemplate = async () => {
    try {
      const response = await fetch(`/api/templates?lang=${encodeURIComponent(language)}`);
      const templates = await response.json();
      const template = templates.find((t: InterviewTemplate) => t.id === templateId);
      if (template) {
        setTemplateData(template);
        setInterviewTitle(template.title);
        setDuration(template.duration);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading template:', error);
      setLoading(false);
    }
  };

  const startInterview = async () => {
    setLoading(true);
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

      const initialMetadata: QuestionMetadata = { type: 'text' };
      setMessages([{ role: 'assistant', content: initData.message, metadata: initialMetadata }]);
      setCurrentQuestionMetadata(initialMetadata);
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

      setInterviewStarted(true);
      setLoading(false);
    } catch (error) {
      console.error('Error initializing interview:', error);
      setLoading(false);
    }
  };

  // Localized strings for the overview screen
  const getOverviewStrings = (lang: string) => {
    switch (lang) {
      case 'ja':
        return {
          overviewTitle: 'インタビュー概要',
          overviewDescription: 'このインタビューは、AIが対話形式で実施します。技術的な意思決定、実装上の課題、チーム運営などについて詳しくお話を伺います。',
          estimatedTimeTitle: '想定時間',
          estimatedTime: '約{minutes}分',
          extendNote: '※ 途中で時間を延長することも可能です',
          topicsTitle: '質問テーマ',
          aiInterviewTitle: 'AIインタビューについて',
          aiInterviewDescription: 'このインタビューはAIが対話形式で実施します。リラックスして、ご自身の考えや経験をお聞かせください。',
          importantNoticeTitle: '⚠️ 重要なお知らせ',
          importantNoticeMessage: '本プロダクトはまだプロトタイプのため、すべてのインタビューログが公開されます。そのため、センシティブな内容については記載しないようにしてください。個人情報や機密情報は入力しないでください。',
          startButton: 'インタビューを開始する',
        };
      case 'es':
        return {
          overviewTitle: 'Resumen de la Entrevista',
          overviewDescription: 'Esta entrevista será realizada por IA en formato de diálogo. Hablaremos en detalle sobre decisiones técnicas, desafíos de implementación, gestión de equipos, etc.',
          estimatedTimeTitle: 'Tiempo Estimado',
          estimatedTime: 'Aproximadamente {minutes} minutos',
          extendNote: '※ Es posible extender el tiempo durante la entrevista',
          topicsTitle: 'Temas de Discusión',
          aiInterviewTitle: 'Sobre la Entrevista con IA',
          aiInterviewDescription: 'Esta entrevista será realizada por IA en formato de diálogo. Relájese y comparta sus pensamientos y experiencias.',
          importantNoticeTitle: '⚠️ Aviso Importante',
          importantNoticeMessage: 'Este producto aún es un prototipo, por lo que todos los registros de entrevistas serán públicos. Por favor, no incluya información confidencial. No ingrese información personal o confidencial.',
          startButton: 'Iniciar Entrevista',
        };
      case 'fr':
        return {
          overviewTitle: 'Résumé de l\'Entretien',
          overviewDescription: 'Cet entretien sera mené par IA sous forme de dialogue. Nous parlerons en détail des décisions techniques, des défis de mise en œuvre, de la gestion d\'équipe, etc.',
          estimatedTimeTitle: 'Temps Estimé',
          estimatedTime: 'Environ {minutes} minutes',
          extendNote: '※ Il est possible de prolonger le temps pendant l\'entretien',
          topicsTitle: 'Sujets de Discussion',
          aiInterviewTitle: 'À Propos de l\'Entretien IA',
          aiInterviewDescription: 'Cet entretien sera mené par IA sous forme de dialogue. Détendez-vous et partagez vos pensées et expériences.',
          importantNoticeTitle: '⚠️ Avis Important',
          importantNoticeMessage: 'Ce produit est encore un prototype, tous les journaux d\'entretiens seront donc rendus publics. Veuillez ne pas inclure d\'informations sensibles. N\'entrez pas d\'informations personnelles ou confidentielles.',
          startButton: 'Commencer l\'Entretien',
        };
      case 'de':
        return {
          overviewTitle: 'Interview-Übersicht',
          overviewDescription: 'Dieses Interview wird von einer KI im Dialog-Format durchgeführt. Wir werden ausführlich über technische Entscheidungen, Implementierungsherausforderungen, Teammanagement usw. sprechen.',
          estimatedTimeTitle: 'Geschätzte Zeit',
          estimatedTime: 'Etwa {minutes} Minuten',
          extendNote: '※ Es ist möglich, die Zeit während des Interviews zu verlängern',
          topicsTitle: 'Diskussionsthemen',
          aiInterviewTitle: 'Über das KI-Interview',
          aiInterviewDescription: 'Dieses Interview wird von einer KI im Dialog-Format durchgeführt. Entspannen Sie sich und teilen Sie Ihre Gedanken und Erfahrungen.',
          importantNoticeTitle: '⚠️ Wichtiger Hinweis',
          importantNoticeMessage: 'Dieses Produkt ist noch ein Prototyp, daher werden alle Interviewprotokolle öffentlich gemacht. Bitte geben Sie keine vertraulichen Informationen an. Geben Sie keine persönlichen oder vertraulichen Informationen ein.',
          startButton: 'Interview Starten',
        };
      case 'zh':
        return {
          overviewTitle: '访谈概要',
          overviewDescription: '本访谈将由AI以对话形式进行。我们将详细讨论技术决策、实施挑战、团队管理等内容。',
          estimatedTimeTitle: '预计时间',
          estimatedTime: '约{minutes}分钟',
          extendNote: '※ 可在访谈过程中延长时间',
          topicsTitle: '讨论主题',
          aiInterviewTitle: '关于AI访谈',
          aiInterviewDescription: '本访谈将由AI以对话形式进行。请放松，分享您的想法和经验。',
          importantNoticeTitle: '⚠️ 重要提示',
          importantNoticeMessage: '此产品仍处于原型阶段，因此所有访谈记录都将公开。请勿包含任何敏感信息。请勿输入任何个人或机密信息。',
          startButton: '开始访谈',
        };
      case 'it':
        return {
          overviewTitle: 'Panoramica dell\'Intervista',
          overviewDescription: 'Questa intervista sarà condotta da AI in formato dialogo. Discuteremo in dettaglio di decisioni tecniche, sfide di implementazione, gestione del team, ecc.',
          estimatedTimeTitle: 'Tempo Stimato',
          estimatedTime: 'Circa {minutes} minuti',
          extendNote: '※ È possibile estendere il tempo durante l\'intervista',
          topicsTitle: 'Argomenti di Discussione',
          aiInterviewTitle: 'Informazioni sull\'Intervista AI',
          aiInterviewDescription: 'Questa intervista è condotta da AI in formato dialogo. Rilassati e condividi i tuoi pensieri ed esperienze.',
          importantNoticeTitle: '⚠️ Avviso Importante',
          importantNoticeMessage: 'Questo prodotto è ancora un prototipo, quindi tutti i registri delle interviste saranno resi pubblici. Si prega di non includere informazioni sensibili. Non inserire informazioni personali o riservate.',
          startButton: 'Inizia Intervista',
        };
      case 'rm':
        return {
          overviewTitle: 'Survista da l\'Intervista',
          overviewDescription: 'Questa intervista vegn manada da l\'AI en furma da dialog. Nus discutain detagliadamain davart decisiuns tecnicas, sfidas da realisaziun, gestiun da team, etc.',
          estimatedTimeTitle: 'Temp Calculà',
          estimatedTime: 'Radund {minutes} minutas',
          extendNote: '※ I è pussaivel da prolungar il temp durant l\'intervista',
          topicsTitle: 'Temas da Discussiun',
          aiInterviewTitle: 'Davart l\'Intervista AI',
          aiInterviewDescription: 'Questa intervista vegn manada da l\'AI en furma da dialog. Relaxescha e parta tes pensaments ed experientschas.',
          importantNoticeTitle: '⚠️ Avis Impurtant',
          importantNoticeMessage: 'Quest product è anc in prototyp, perquai vegnan tut ils protocols d\'intervistas publitgads. Per plaschair na metta betg infurmaziuns sensiblas. Na metta betg infurmaziuns persunalas u confidenzialas.',
          startButton: 'Cumenzar Intervista',
        };
      case 'gsw':
        return {
          overviewTitle: 'Interview Überblick',
          overviewDescription: 'Das Interview wird vo AI im Dialogformat dureführt. Mir wärded detailliert über technischi Entscheidige, Implementierigshürde, Teammanagement, etc. rede.',
          estimatedTimeTitle: 'Gschätzti Ziit',
          estimatedTime: 'Öppe {minutes} Minute',
          extendNote: '※ Es isch möglich d Ziit während em Interview z verlängere',
          topicsTitle: 'Diskussionsthemä',
          aiInterviewTitle: 'Über s AI Interview',
          aiInterviewDescription: 'Das Interview wird vo AI im Dialogformat dureführt. Entspann di und teil dini Gedankä und Erfahrige.',
          importantNoticeTitle: '⚠️ Wichtigi Mitdeilig',
          importantNoticeMessage: 'Das Produkt isch no en Prototyp, drum wärded alli Interviewprotokolle veröffentlicht. Bitte gib keini sensible Informatione ii. Gib keini persönliche oder vertrauliche Informatione ii.',
          startButton: 'Interview Starte',
        };
      default:
        return {
          overviewTitle: 'Interview Overview',
          overviewDescription: 'This interview will be conducted by AI in a dialogue format. We will discuss in detail about technical decisions, implementation challenges, team management, etc.',
          estimatedTimeTitle: 'Estimated Time',
          estimatedTime: 'Approximately {minutes} minutes',
          extendNote: '※ It is possible to extend the time during the interview',
          topicsTitle: 'Discussion Topics',
          aiInterviewTitle: 'About AI Interview',
          aiInterviewDescription: 'This interview is conducted by AI in a dialogue format. Please relax and share your thoughts and experiences.',
          importantNoticeTitle: '⚠️ Important Notice',
          importantNoticeMessage: 'This product is still a prototype, so all interview logs will be made public. Please do not include any sensitive information. Do not enter any personal or confidential information.',
          startButton: 'Start Interview',
        };
    }
  };
  const overviewStrings = getOverviewStrings(language);

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
      case 'it':
        return {
          endButton: 'Termina Intervista',
          title: 'Terminare l\'Intervista?',
          message: 'Sei sicuro di voler terminare l\'intervista ora? Questa azione non può essere annullata.',
          cancel: 'Annulla',
          confirm: 'Termina',
        };
      case 'rm':
        return {
          endButton: 'Finir Intervista',
          title: 'Finir l\'Intervista?',
          message: 'Es ti segir che ti vuls finir l\'intervista ussa? Questa acziun na po betg vegnir revertida.',
          cancel: 'Interrumper',
          confirm: 'Finir',
        };
      case 'gsw':
        return {
          endButton: 'Interview Beände',
          title: 'Interview Beände?',
          message: 'Bisch sicher dass d s Interview jetzt wotsch beände? Die Akziun cha nöd rückgängig gmacht wärde.',
          cancel: 'Abbreche',
          confirm: 'Beände',
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

  // Localized warning strings
  const getWarningStrings = (lang: string) => {
    switch (lang) {
      case 'ja':
        return {
          title: '⚠️ 重要なお知らせ',
          message: '本プロダクトはまだプロトタイプのため、すべてのインタビューログが公開されます。そのため、センシティブな内容については記載しないようにしてください。個人情報や機密情報は入力しないでください。',
        };
      case 'es':
        return {
          title: '⚠️ Aviso Importante',
          message: 'Este producto aún es un prototipo, por lo que todos los registros de entrevistas serán públicos. Por favor, no incluya información confidencial. No ingrese información personal o confidencial.',
        };
      case 'fr':
        return {
          title: '⚠️ Avis Important',
          message: 'Ce produit est encore un prototype, tous les journaux d\'entretiens seront donc rendus publics. Veuillez ne pas inclure d\'informations sensibles. N\'entrez pas d\'informations personnelles ou confidentielles.',
        };
      case 'de':
        return {
          title: '⚠️ Wichtiger Hinweis',
          message: 'Dieses Produkt ist noch ein Prototyp, daher werden alle Interviewprotokolle öffentlich gemacht. Bitte geben Sie keine vertraulichen Informationen an. Geben Sie keine persönlichen oder vertraulichen Informationen ein.',
        };
      case 'zh':
        return {
          title: '⚠️ 重要提示',
          message: '此产品仍处于原型阶段，因此所有访谈记录都将公开。请勿包含任何敏感信息。请勿输入任何个人或机密信息。',
        };
      case 'it':
        return {
          title: '⚠️ Avviso Importante',
          message: 'Questo prodotto è ancora un prototipo, quindi tutti i registri delle interviste saranno resi pubblici. Si prega di non includere informazioni sensibili. Non inserire informazioni personali o riservate.',
        };
      case 'rm':
        return {
          title: '⚠️ Avis Impurtant',
          message: 'Quest product è anc in prototyp, perquai vegnan tut ils protocols d\'intervistas publitgads. Per plaschair na metta betg infurmaziuns sensiblas. Na metta betg infurmaziuns persunalas u confidenzialas.',
        };
      case 'gsw':
        return {
          title: '⚠️ Wichtigi Mitdeilig',
          message: 'Das Produkt isch no en Prototyp, drum wärded alli Interviewprotokolle veröffentlicht. Bitte gib keini sensible Informatione ii. Gib keini persönliche oder vertrauliche Informatione ii.',
        };
      default:
        return {
          title: '⚠️ Important Notice',
          message: 'This product is still a prototype, so all interview logs will be made public. Please do not include any sensitive information. Do not enter any personal or confidential information.',
        };
    }
  };
  const warningStrings = getWarningStrings(language);

  const sendMessage = async () => {
    // Validate input based on question type
    if (sending) return;
    
    let userMessage = '';
    let responseMetadata: ResponseMetadata | undefined;

    if (currentQuestionMetadata) {
      switch (currentQuestionMetadata.type) {
        case 'text':
          if (!input.trim()) return;
          userMessage = input.trim();
          responseMetadata = { questionType: 'text' };
          break;
        case 'single_choice':
          if (selectedOptions.length === 0) return;
          userMessage = selectedOptions[0];
          responseMetadata = { questionType: 'single_choice', selectedOptions: [selectedOptions[0]] };
          break;
        case 'multi_choice':
          if (selectedOptions.length === 0) return;
          userMessage = selectedOptions.join(', ');
          responseMetadata = { questionType: 'multi_choice', selectedOptions: [...selectedOptions] };
          break;
        case 'scale':
          userMessage = scaleValue.toString();
          responseMetadata = { questionType: 'scale', scaleValue };
          break;
        default:
          if (!input.trim()) return;
          userMessage = input.trim();
          responseMetadata = { questionType: 'text' };
      }
    } else {
      if (!input.trim()) return;
      userMessage = input.trim();
      responseMetadata = { questionType: 'text' };
    }

    // Reset input states
    setInput('');
    setSelectedOptions([]);
    setScaleValue(3);
    setSending(true);

    setMessages((prev) => [...prev, { role: 'user', content: userMessage, metadata: responseMetadata }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id: sessionId, 
          message: userMessage,
          metadata: responseMetadata
        }),
      });
      const data = await response.json();

      const assistantMetadata = data.metadata || { type: 'text' };
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message, metadata: assistantMetadata }]);
      setCurrentQuestionMetadata(assistantMetadata);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMetadata: QuestionMetadata = { type: 'text' };
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, an error occurred. Please try again.', metadata: errorMetadata },
      ]);
      setCurrentQuestionMetadata(errorMetadata);
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

  // Interview overview screen (before starting)
  if (!interviewStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-indigo-600 dark:bg-indigo-700 px-8 py-6">
              <h1 className="text-3xl font-bold text-white text-center">{interviewTitle}</h1>
            </div>

            <div className="p-8 space-y-6">
              {/* Overview Section */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {overviewStrings.overviewTitle}
                </h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {templateData?.overview || templateData?.prompt || overviewStrings.overviewDescription}
                </p>
              </div>

              {/* Estimated Time Section */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {overviewStrings.estimatedTimeTitle}
                </h2>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                  {overviewStrings.estimatedTime.replace('{minutes}', Math.floor(duration / 60).toString())}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {overviewStrings.extendNote}
                </p>
              </div>

              {/* AI Interview Info Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {overviewStrings.aiInterviewTitle}
                </h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {overviewStrings.aiInterviewDescription}
                </p>
              </div>

              {/* Important Notice */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-6 rounded-r-lg">
                <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200 mb-3">
                  {overviewStrings.importantNoticeTitle}
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 leading-relaxed whitespace-pre-line">
                  {overviewStrings.importantNoticeMessage}
                </p>
              </div>

              {/* Start Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={startInterview}
                  className="px-10 py-4 bg-indigo-600 text-white text-lg font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                >
                  {overviewStrings.startButton}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Interview screen (after starting)
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

          {/* Warning Notice */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mx-6 mt-4">
            <div className="flex">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-200 mb-2">
                  {warningStrings.title}
                </h3>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  <p className="whitespace-pre-wrap">{warningStrings.message}</p>
                </div>
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
            {/* Render different input UI based on question type */}
            {currentQuestionMetadata && (
              <div className="mb-4">
                {currentQuestionMetadata.type === 'single_choice' && currentQuestionMetadata.options && (
                  <div className="space-y-2">
                    {currentQuestionMetadata.options.map((option, idx) => (
                      <label
                        key={idx}
                        className="flex items-center space-x-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <input
                          type="radio"
                          name="single-choice"
                          value={option}
                          checked={selectedOptions.includes(option)}
                          onChange={() => setSelectedOptions([option])}
                          disabled={sending || showExtendDialog || showThankYou || showConfirmEnd}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-gray-900 dark:text-white">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {currentQuestionMetadata.type === 'multi_choice' && currentQuestionMetadata.options && (
                  <div className="space-y-2">
                    {currentQuestionMetadata.options.map((option, idx) => (
                      <label
                        key={idx}
                        className="flex items-center space-x-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <input
                          type="checkbox"
                          value={option}
                          checked={selectedOptions.includes(option)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOptions([...selectedOptions, option]);
                            } else {
                              setSelectedOptions(selectedOptions.filter((o) => o !== option));
                            }
                          }}
                          disabled={sending || showExtendDialog || showThankYou || showConfirmEnd}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded"
                        />
                        <span className="text-gray-900 dark:text-white">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {currentQuestionMetadata.type === 'scale' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {currentQuestionMetadata.scaleMinLabel ?? (currentQuestionMetadata.scaleMin ?? 1).toString()}
                      </span>
                      <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                        {scaleValue}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {currentQuestionMetadata.scaleMaxLabel ?? (currentQuestionMetadata.scaleMax ?? 5).toString()}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={currentQuestionMetadata.scaleMin ?? 1}
                      max={currentQuestionMetadata.scaleMax ?? 5}
                      value={scaleValue}
                      onChange={(e) => setScaleValue(parseInt(e.target.value))}
                      disabled={sending || showExtendDialog || showThankYou || showConfirmEnd}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Text input or Submit button */}
            <div className="flex gap-2">
              {(!currentQuestionMetadata || currentQuestionMetadata.type === 'text') ? (
                <>
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
                </>
              ) : (
                <button
                  onClick={sendMessage}
                  disabled={
                    sending ||
                    showExtendDialog ||
                    showThankYou ||
                    showConfirmEnd ||
                    (currentQuestionMetadata.type === 'single_choice' && selectedOptions.length === 0) ||
                    (currentQuestionMetadata.type === 'multi_choice' && selectedOptions.length === 0)
                  }
                  className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                >
                  Submit
                </button>
              )}
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
