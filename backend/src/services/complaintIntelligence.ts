import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import mongoose from 'mongoose';
import { config } from '../config';
import {
  IntelligenceCategory,
  IntelligencePriority,
  IComplaintIntelligence,
} from '../models/Complaint';

export const ALLOWED_CATEGORIES: IntelligenceCategory[] = [
  'plumbing',
  'electrical',
  'wifi',
  'cleaning',
  'furniture',
  'appliances',
  'food',
  'security',
  'other',
];

export const ALLOWED_PRIORITIES: IntelligencePriority[] = ['low', 'medium', 'high', 'critical'];

// Safety keywords that indicate imminent life/property hazard
// Independent of AI, any occurrence forces critical escalation
export const CRITICAL_SAFETY_KEYWORDS = [
  'exposed wiring',
  'live wire',
  'open live wire',
  'sparks',
  'sparking',
  'electric shock',
  'shocking',
  'short circuit',
  'fire',
  'smoke',
  'burning smell',
  'wire burning',
  'gas leak',
  'gas smell',
  'cylinder leak',
  'flooding',
  'submerged',
  'structural crack',
  'ceiling collapse',
];

export const GeminiIntelligenceOutputSchema = z.object({
  category: z.enum([
    'plumbing',
    'electrical',
    'wifi',
    'cleaning',
    'furniture',
    'appliances',
    'food',
    'security',
    'other',
  ]),
  issueType: z.string().default('general_issue'),
  asset: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  suggestedAction: z.string().default('Inspect property and address issue'),
  requiresHumanReview: z.boolean().default(false),
});

export type GeminiIntelligenceOutput = z.infer<typeof GeminiIntelligenceOutputSchema>;

/**
 * Checks for life safety / hazard keywords in description or student input.
 * Runs instantly without network call.
 */
export function checkSafetyOverride(text: string): { isCritical: boolean; matchedKeyword?: string } {
  if (!text) return { isCritical: false };
  const lower = text.toLowerCase();
  for (const kw of CRITICAL_SAFETY_KEYWORDS) {
    if (lower.includes(kw)) {
      return { isCritical: true, matchedKeyword: kw };
    }
  }
  return { isCritical: false };
}

/**
 * Maps legacy ComplaintType to IntelligenceCategory
 */
export function mapLegacyTypeToIntelligence(type?: string): IntelligenceCategory {
  if (!type) return 'other';
  switch (type.toLowerCase()) {
    case 'plumber':
    case 'water':
      return 'plumbing';
    case 'electrician':
      return 'electrical';
    case 'wifi':
      return 'wifi';
    case 'hygiene':
    case 'pest_control':
      return 'cleaning';
    case 'furniture':
      return 'furniture';
    case 'food':
      return 'food';
    case 'security':
    case 'safety':
      return 'security';
    case 'amenity':
    case 'staff':
    case 'noise':
    default:
      return 'other';
  }
}

/**
 * Maps legacy ComplaintPriority to IntelligencePriority
 */
export function mapLegacyPriorityToIntelligence(priority?: string): IntelligencePriority {
  if (!priority) return 'medium';
  switch (priority.toLowerCase()) {
    case 'urgent':
    case 'critical':
      return 'critical';
    case 'high':
      return 'high';
    case 'low':
      return 'low';
    case 'medium':
    default:
      return 'medium';
  }
}

/**
 * Computes standard SLA target hours and target Date based on priority.
 */
export function computeTargetResolutionDate(priority: string, fromDate = new Date()): { hours: number; dueAt: Date } {
  let hours = 48; // default medium
  switch (priority.toLowerCase()) {
    case 'critical':
    case 'urgent':
      hours = 4;
      break;
    case 'high':
      hours = 24;
      break;
    case 'low':
      hours = 72;
      break;
    case 'medium':
    default:
      hours = 48;
      break;
  }
  return {
    hours,
    dueAt: new Date(fromDate.getTime() + hours * 60 * 60 * 1000),
  };
}

export interface ClassifyComplaintOptions {
  userCategory?: string;
  userPriority?: string;
  timeoutMs?: number;
}

/**
 * Calls Gemini API to classify complaint and recommend priority & actions.
 * Always passes output through rigorous validation and independent safety override.
 */
export async function classifyComplaint(
  description: string,
  options: ClassifyComplaintOptions = {}
): Promise<IComplaintIntelligence> {
  const sanitizedText = (description || '').trim().slice(0, 1000);
  const safetyCheck = checkSafetyOverride(sanitizedText);

  // Default baseline before AI
  const fallbackCategory = mapLegacyTypeToIntelligence(options.userCategory);
  const fallbackPriority = safetyCheck.isCritical
    ? 'critical'
    : mapLegacyPriorityToIntelligence(options.userPriority);

  const fallbackResult: IComplaintIntelligence = {
    category: fallbackCategory,
    issueType: safetyCheck.isCritical ? 'hazard_emergency' : 'general_maintenance',
    priority: fallbackPriority,
    confidence: safetyCheck.isCritical ? 1.0 : 0.6,
    suggestedAction: safetyCheck.isCritical
      ? 'EMERGENCY: Immediate inspection and power/water isolation required.'
      : 'Review complaint and schedule maintenance technician.',
    recurringIssue: false,
    relatedComplaintIds: [],
    modelVersion: 'rule-based-safety-v1',
    reviewedByHuman: false,
    analysisStatus: 'pending',
    asset: undefined,
    location: undefined,
    requiresHumanReview: safetyCheck.isCritical,
    immediateEscalation: safetyCheck.isCritical,
  };

  // If Gemini API is not configured, return fallback with 'skipped' status
  if (!config.geminiApiKey || config.geminiApiKey.trim().length === 0) {
    return {
      ...fallbackResult,
      analysisStatus: 'skipped',
    };
  }

  const timeoutMs = options.timeoutMs || 4500;

  try {
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    const prompt = `You are an expert accommodation maintenance triage engine for GeoNest (Student PGs & Hostels in India).
Analyze this maintenance complaint and return strict JSON with classification and recommendation.

ALLOWED CATEGORIES:
"plumbing", "electrical", "wifi", "cleaning", "furniture", "appliances", "food", "security", "other"

ALLOWED PRIORITIES:
"low" (minor cosmetic/slow issue, e.g. squeaky door, dim bulb),
"medium" (standard inconvenience, e.g. single tap dripping, chair wobbles),
"high" (major discomfort affecting stay, e.g. wifi down for whole floor, geyser not working in winter),
"critical" (safety hazard, power loss to whole room, flooding, fire/smoke risk)

SCHEMA:
{
  "category": "one of the allowed categories",
  "issueType": "concise lowercase issue code (e.g. tap_leak, ac_cooling, wifi_router_down)",
  "asset": "specific equipment if mentioned or inferred (e.g. water heater, ceiling fan, router) or null",
  "location": "room number or area if mentioned (e.g. Room 302, 2nd floor bathroom) or null",
  "priority": "one of allowed priorities",
  "suggestedAction": "1-2 sentence actionable next step for PG owner or maintenance team",
  "requiresHumanReview": true/false
}

Student Complaint Description:
"${sanitizedText}"
${options.userCategory ? `Student Selected Category: ${options.userCategory}` : ''}
${options.userPriority ? `Student Selected Urgency: ${options.userPriority}` : ''}

CRITICAL RULES:
1. Return ONLY valid JSON, no markdown formatting or commentary.
2. If hazardous conditions like exposed wires, gas leaks, or fire exist, priority MUST be "critical".`;

    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`AI classification timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const apiCall = ai.models.generateContent({
      model: config.geminiModel || 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        temperature: 0.2, // low temperature for consistent classification
        maxOutputTokens: 300,
      },
    });

    const response = (await Promise.race([apiCall, timeoutPromise])) as any;
    clearTimeout(timeoutId!);

    const rawOutput = response?.text || '';
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No valid JSON extracted from Gemini output');
    }

    const parsedJson = JSON.parse(jsonMatch[0]);
    const validated = GeminiIntelligenceOutputSchema.safeParse(parsedJson);

    if (!validated.success) {
      console.warn('[AI Complaint Validation Warning]', validated.error.issues);
      // Fallback with sanitized partials
      return {
        ...fallbackResult,
        analysisStatus: 'failed',
      };
    }

    const aiData = validated.data;

    // RULE-BASED SAFETY OVERRIDE: Runs AFTER and independent of the AI.
    // Safety keywords ALWAYS enforce critical priority and immediate escalation.
    const finalPriority: IntelligencePriority = safetyCheck.isCritical
      ? 'critical'
      : aiData.priority;

    const finalImmediateEscalation = Boolean(safetyCheck.isCritical || aiData.priority === 'critical');

    return {
      category: aiData.category,
      issueType: aiData.issueType || 'general_maintenance',
      priority: finalPriority,
      confidence: safetyCheck.isCritical ? 1.0 : 0.88,
      suggestedAction: safetyCheck.isCritical
        ? `EMERGENCY ESCALATION (${safetyCheck.matchedKeyword}): ${aiData.suggestedAction}`
        : aiData.suggestedAction,
      recurringIssue: false,
      relatedComplaintIds: [],
      modelVersion: config.geminiModel || 'gemini-3.5-flash-lite',
      reviewedByHuman: false,
      analysisStatus: 'done',
      asset: aiData.asset || undefined,
      location: aiData.location || undefined,
      requiresHumanReview: safetyCheck.isCritical || aiData.requiresHumanReview,
      immediateEscalation: finalImmediateEscalation,
    };
  } catch (err: any) {
    console.warn('[AI Complaint Intelligence Fallback]', err?.message || err);
    // Graceful degradation: never crash or block complaint submission
    return {
      ...fallbackResult,
      analysisStatus: 'failed',
    };
  }
}
