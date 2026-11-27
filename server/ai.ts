import { GoogleGenAI, Type } from '@google/genai';

export interface AiSuggestionItem {
  id: string;
  category: 'error' | 'improvement' | 'clarity';
  section: string;
  originalExcerpt: string;
  suggestion: string;
  explanation: string;
}

export function isAiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY');
}

export async function generateDocumentSuggestions(
  docType: string,
  documentText: string
): Promise<{ available: boolean; suggestions: AiSuggestionItem[]; disclaimer: string; error?: string }> {
  if (!isAiConfigured()) {
    return {
      available: false,
      suggestions: [],
      disclaimer: 'AI suggestions are unavailable because GEMINI_API_KEY is not configured. Human editor review remains fully active.',
      error: 'AI writing assistant is currently unconfigured. Your document can still be reviewed directly by a human editor.',
    };
  }

  const trimmed = documentText.trim();
  if (!trimmed || trimmed.startsWith('[')) {
    return {
      available: true,
      suggestions: [],
      disclaimer: 'AI suggestions require readable text in the document draft.',
      error: 'No readable draft text is available yet. Paste or upload text-based content to run AI proofreading.',
    };
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const sectionGuidance =
    docType === 'cv'
      ? 'For CVs, check Contact Information, Professional Summary, Education, Experience, Skills, Certifications, Projects, and formatting/date consistency.'
      : 'For cover letters or statements, check Professional Greeting, Introduction, Motivation, Relevant Skills, Evidence of Experience, and Closing Statement.';

  const systemInstruction = [
    'You are an ethical career writing advisor for Meridian Youth Internship Registry in Ghana.',
    'Review the submitted application document for spelling, grammar, punctuation, weak phrasing, repetition, unclear wording, inconsistent dates/headings, and missing structural sections.',
    sectionGuidance,
    'CRITICAL RULES:',
    '1. NEVER invent qualifications, degrees, schools, employers, certifications, awards, or work experience.',
    '2. Preserve the applicant\'s original facts and meaning.',
    '3. Provide targeted, actionable suggestions (maximum 8 items) rather than rewriting the whole document.',
    '4. Classify each item as "error" (spelling/grammar/punctuation/date conflict), "improvement" (stronger wording/formatting), or "clarity" (missing section/unclear sentence).',
  ].join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Document Type: ${docType}\n\nDocument Content:\n${trimmed.slice(0, 12000)}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING, description: 'One of: error, improvement, clarity' },
              section: { type: Type.STRING, description: 'Document section name' },
              originalExcerpt: { type: Type.STRING, description: 'Short exact excerpt from the draft or section note' },
              suggestion: { type: Type.STRING, description: 'Concrete suggested revision without inventing facts' },
              explanation: { type: Type.STRING, description: 'Brief explanation of why this helps' },
            },
            required: ['category', 'section', 'originalExcerpt', 'suggestion', 'explanation'],
          },
        },
      },
    });

    const raw = (response.text ?? '[]').trim();
    const parsed = JSON.parse(raw) as Array<Omit<AiSuggestionItem, 'id'>>;
    const normalized: AiSuggestionItem[] = (Array.isArray(parsed) ? parsed : []).slice(0, 8).map((item, idx) => ({
      id: `ai-${Date.now()}-${idx}`,
      category:
        item.category === 'error' || item.category === 'clarity' ? item.category : 'improvement',
      section: String(item.section || 'General').slice(0, 80),
      originalExcerpt: String(item.originalExcerpt || '').slice(0, 300),
      suggestion: String(item.suggestion || '').slice(0, 600),
      explanation: String(item.explanation || '').slice(0, 400),
    }));

    return {
      available: true,
      suggestions: normalized,
      disclaimer:
        'AI-generated suggestions are advisory only and must be reviewed by the applicant or human editor. Original facts are never intentionally altered.',
    };
  } catch (err: any) {
    console.error('Gemini document review failed:', err);
    return {
      available: true,
      suggestions: [],
      disclaimer: 'AI suggestions encountered a temporary error. Human editor review remains fully available.',
      error: 'Unable to generate AI suggestions right now. Please try again later or proceed with human editor review.',
    };
  }
}
