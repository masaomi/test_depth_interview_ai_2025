import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { callLLM } from '@/lib/llm-service';
import { randomUUID } from 'crypto';
import { logTokenUsage } from '@/lib/token-logger';
import { Message } from '@/lib/types';

// Helper to check if interview is complete
function isInterviewComplete(assistantMessage: string): boolean {
  const endings = [
    'thank you for your time',
    'thank you for participating',
    'ありがとうございました',
    'お時間いただきありがとう',
    'this concludes',
    'interview complete',
    'インタビューを終了',
    'これでインタビューは終了',
    '本日はありがとうございました'
  ];
  const lower = assistantMessage.toLowerCase();
  return endings.some(e => lower.includes(e));
}

// Helper to truncate message for display
function truncateMessage(msg: string, maxLen = 200): string {
  if (msg.length <= maxLen) return msg;
  return msg.slice(0, maxLen) + '...';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template_id, persona_id, run_count = 1, use_variations = false, max_turns = 15 } = body;

    if (!template_id || !persona_id) {
      return NextResponse.json({ error: 'Template ID and Persona ID are required' }, { status: 400 });
    }

    // Get Persona
    const persona = db.prepare('SELECT * FROM personas WHERE id = ?').get(persona_id) as any;
    if (!persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }

    // Prepare variations
    let variations: string[] = [];
    if (use_variations && persona.variation_params) {
      try {
        const params = JSON.parse(persona.variation_params);
        // If "auto_generate" is enabled, we should generate them via LLM.
        // For Phase 1/Simple implementation as per plan, we might just assume base prompt + small tweak or strict templates.
        // If "templates" array exists in params, use it.
        if (params.templates && Array.isArray(params.templates)) {
          variations = params.templates.map((t: any) => JSON.stringify(t));
        } else if (params.auto_generate?.enabled) {
          // Generate variations using LLM
          const prompt = `Based on this persona profile, generate ${run_count} realistic variations:

Base Persona: ${persona.base_prompt}

Variation parameters to vary: ${JSON.stringify(params.auto_generate.vary_fields || [])}

Output format: Return ONLY a JSON array with ${run_count} objects, each containing a specific context/profile.`;
          
          const variationJson = await callLLM([{ role: 'user', content: prompt }]);
          
          // Log token usage for variation generation
          logTokenUsage({
            endpoint: '/api/personas/run/variations',
            model: 'auto',
            inputTokens: Math.ceil(prompt.length / 4),
            outputTokens: Math.ceil(variationJson.length / 4),
            isVirtual: true
          });

          // Extract JSON
          const match = variationJson.match(/\[[\s\S]*\]/);
          if (match) {
            variations = JSON.parse(match[0]);
          }
        }
      } catch (e) {
        console.error('Failed to generate variations:', e);
      }
    }

    // If no variations generated or needed, fill with null
    if (variations.length < run_count) {
      const remaining = run_count - variations.length;
      for (let i = 0; i < remaining; i++) {
        // Recycle variations if available, otherwise null (base prompt)
        variations.push(variations.length > 0 ? variations[i % variations.length] : '');
      }
    }
    
    // Trim to run_count
    variations = variations.slice(0, run_count);

    // Get template info
    const template = db.prepare('SELECT * FROM interview_templates WHERE id = ?').get(template_id) as any;
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Create a stream
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Helper to send message
    const sendMessage = async (msg: object) => {
      await writer.write(encoder.encode(JSON.stringify(msg) + '\n'));
    };

    // Start processing in background (but keeping connection open for stream)
    (async () => {
      try {
        for (let i = 0; i < run_count; i++) {
          const variation = variations[i];
          const session_id = randomUUID();
          
          // 1. Create Session
          db.prepare(
            'INSERT INTO interview_sessions (id, template_id, language, persona_id, is_virtual) VALUES (?, ?, ?, ?, 1)'
          ).run(session_id, template_id, 'en', persona_id);

          await sendMessage({ 
            type: 'progress', 
            index: i, 
            total: run_count, 
            status: 'starting', 
            session_id 
          });

          // 2. Generate initial greeting (directly call LLM instead of fetch)
          const greetingPrompt = `You are conducting an interview about: ${template.prompt}

Start the interview with a warm greeting and ask the first question. Be friendly and professional.`;

          let greeting: string;
          try {
            greeting = await callLLM([
              { role: 'system', content: greetingPrompt },
              { role: 'user', content: 'Please start the interview.' }
            ]);
            
            logTokenUsage({
              sessionId: session_id,
              endpoint: '/api/personas/run/init',
              model: 'auto',
              inputTokens: Math.ceil(greetingPrompt.length / 4),
              outputTokens: Math.ceil(greeting.length / 4),
              isVirtual: true
            });
          } catch (err) {
            console.error('Failed to generate greeting:', err);
            await sendMessage({ 
              type: 'error', 
              index: i, 
              session_id, 
              message: `Failed to generate greeting: ${String(err)}` 
            });
            continue;
          }

          // Save greeting to DB
          db.prepare(
            'INSERT INTO conversation_logs (session_id, role, content) VALUES (?, ?, ?)'
          ).run(session_id, 'assistant', greeting);

          await sendMessage({ 
            type: 'conversation', 
            index: i, 
            session_id, 
            role: 'interviewer',
            content: truncateMessage(greeting)
          });

          const conversationHistory: Message[] = [
            { role: 'assistant', content: greeting }
          ];

          // 3. Loop Turns
          let turnCount = 0;
          let completed = false;

          while (turnCount < max_turns && !completed) {
            // Generate Persona Response
            const personaContext = variation 
              ? `${persona.base_prompt}\n\nSpecific Context/Variation: ${typeof variation === 'string' ? variation : JSON.stringify(variation)}`
              : persona.base_prompt;

            // For persona LLM call, we need to flip the roles:
            // - Interviewer messages (originally 'assistant') become 'user' (questions to persona)
            // - Persona messages (originally 'user') become 'assistant' (persona's own responses)
            const personaViewHistory: Message[] = conversationHistory.map(msg => ({
              role: msg.role === 'assistant' ? 'user' : 'assistant',
              content: msg.content
            }));

            const personaMessages: Message[] = [
              { role: 'system', content: `You are a research participant being interviewed. ${personaContext}

Respond naturally to the interviewer's questions. Keep answers concise but informative (2-4 sentences). 
Answer as if you are a real person with real experiences and opinions based on your persona.
Do not break character or mention that you are an AI.
Provide specific, detailed answers based on your background and expertise.` },
              ...personaViewHistory
            ];

            let personaResponse: string;
            try {
              personaResponse = await callLLM(personaMessages);
              
              // Ensure response is not empty
              if (!personaResponse || personaResponse.trim() === '') {
                personaResponse = "I appreciate the question. Let me think about that for a moment... Yes, I have some thoughts on this topic that I'd like to share.";
              }
              
              logTokenUsage({
                sessionId: session_id,
                endpoint: '/api/personas/run/response',
                model: 'auto',
                inputTokens: Math.ceil(JSON.stringify(personaMessages).length / 4),
                outputTokens: Math.ceil(personaResponse.length / 4),
                isVirtual: true
              });
            } catch (err) {
              console.error('Failed to generate persona response:', err);
              await sendMessage({ 
                type: 'error', 
                index: i, 
                session_id, 
                message: `Failed to generate persona response: ${String(err)}` 
              });
              break;
            }

            // Save persona response to DB
            db.prepare(
              'INSERT INTO conversation_logs (session_id, role, content) VALUES (?, ?, ?)'
            ).run(session_id, 'user', personaResponse);

            await sendMessage({ 
              type: 'conversation', 
              index: i, 
              session_id, 
              role: 'persona',
              content: truncateMessage(personaResponse),
              turn: turnCount + 1
            });

            conversationHistory.push({ role: 'user', content: personaResponse });

            // Generate interviewer's next question
            const interviewerMessages: Message[] = [
              { role: 'system', content: `You are an interviewer conducting a research interview about: ${template.prompt}

Ask follow-up questions based on the participant's responses. Be professional and empathetic.
After 5-8 meaningful exchanges, naturally conclude the interview by thanking the participant.
Keep your responses focused and avoid being repetitive.` },
              ...conversationHistory
            ];

            let nextQuestion: string;
            try {
              nextQuestion = await callLLM(interviewerMessages);
              
              logTokenUsage({
                sessionId: session_id,
                endpoint: '/api/personas/run/interviewer',
                model: 'auto',
                inputTokens: Math.ceil(JSON.stringify(interviewerMessages).length / 4),
                outputTokens: Math.ceil(nextQuestion.length / 4),
                isVirtual: true
              });
            } catch (err) {
              console.error('Failed to generate interviewer question:', err);
              await sendMessage({ 
                type: 'error', 
                index: i, 
                session_id, 
                message: `Failed to generate interviewer question: ${String(err)}` 
              });
              break;
            }

            // Save interviewer question to DB
            db.prepare(
              'INSERT INTO conversation_logs (session_id, role, content) VALUES (?, ?, ?)'
            ).run(session_id, 'assistant', nextQuestion);

            await sendMessage({ 
              type: 'conversation', 
              index: i, 
              session_id, 
              role: 'interviewer',
              content: truncateMessage(nextQuestion),
              turn: turnCount + 1
            });

            conversationHistory.push({ role: 'assistant', content: nextQuestion });
            turnCount++;

            // Update Progress
            await sendMessage({ 
              type: 'update', 
              index: i, 
              session_id, 
              turns: turnCount 
            });

            // Check termination
            if (isInterviewComplete(nextQuestion)) {
              completed = true;
            }
          }

          // 4. Complete Session
          db.prepare(
            'UPDATE interview_sessions SET status = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ?'
          ).run('completed', session_id);

          // Generate Summary (simplified - just mark as needing summary)
          try {
            const logs = db.prepare(
              'SELECT role, content FROM conversation_logs WHERE session_id = ? ORDER BY timestamp'
            ).all(session_id) as any[];
            
            const conversationText = logs.map(l => `${l.role}: ${l.content}`).join('\n\n');
            const summaryPrompt = `Summarize this interview in 2-3 paragraphs. Include key points and notable responses.

Interview:
${conversationText}`;
            
            const summary = await callLLM([
              { role: 'user', content: summaryPrompt }
            ]);
            
            db.prepare(
              'UPDATE interview_sessions SET summary = ? WHERE id = ?'
            ).run(summary, session_id);
            
            logTokenUsage({
              sessionId: session_id,
              endpoint: '/api/personas/run/summary',
              model: 'auto',
              inputTokens: Math.ceil(summaryPrompt.length / 4),
              outputTokens: Math.ceil(summary.length / 4),
              isVirtual: true
            });
          } catch (err) {
            console.error('Failed to generate summary:', err);
          }

          await sendMessage({ 
            type: 'completed', 
            index: i, 
            session_id, 
            turns: turnCount 
          });
        }
      } catch (err) {
        console.error('Batch run error:', err);
        await sendMessage({ type: 'error', message: String(err) });
      } finally {
        writer.close();
      }
    })();

    return new NextResponse(stream.readable, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in batch run:', error);
    return NextResponse.json({ error: 'Failed to start batch run' }, { status: 500 });
  }
}
