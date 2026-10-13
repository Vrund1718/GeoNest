import mongoose from 'mongoose';
import {
  checkSafetyOverride,
  classifyComplaint,
  computeTargetResolutionDate,
  mapLegacyTypeToIntelligence,
  mapLegacyPriorityToIntelligence,
} from '../services/complaintIntelligence';
import Complaint from '../models/Complaint';

describe('Phase 1: AI Complaint Intelligence & Safety Escalation', () => {
  describe('Rule-Based Safety Override', () => {
    it('forces priority to critical immediately when life-safety hazard keywords are present', () => {
      const hazardCases = [
        'There is exposed wiring hanging from the ceiling fan',
        'Saw electrical sparks near the switchboard in room 102',
        'Smell of gas leak from the kitchen stove cylinder',
        'Flooding in the corridor from a broken pipe',
        'Short circuit tripped the entire floor breaker',
      ];

      for (const text of hazardCases) {
        const check = checkSafetyOverride(text);
        expect(check.isCritical).toBe(true);
        expect(check.matchedKeyword).toBeDefined();
      }
    });

    it('does not trigger critical safety override for routine non-hazardous issues', () => {
      const nonHazards = [
        'Washbasin tap is dripping slightly at night',
        'Wi-Fi signal is weak in the corner room',
        'Wardrobe door handle came loose',
        'Room needs sweeping and cleaning',
      ];

      for (const text of nonHazards) {
        const check = checkSafetyOverride(text);
        expect(check.isCritical).toBe(false);
      }
    });

    it('ensures safety override runs independent of AI and cannot be downgraded', async () => {
      const complaintText = 'There is exposed wiring near my study desk and sparks when turning on light';
      const intelligence = await classifyComplaint(complaintText, {
        userCategory: 'electrician',
        userPriority: 'low', // student selected low by mistake
      });

      expect(intelligence.priority).toBe('critical');
      expect(intelligence.immediateEscalation).toBe(true);
      expect(intelligence.requiresHumanReview).toBe(true);
      expect(intelligence.suggestedAction).toContain('EMERGENCY');
    });
  });

  describe('Legacy Mapping & SLA Calculation', () => {
    it('maps legacy complaint types to intelligence categories accurately', () => {
      expect(mapLegacyTypeToIntelligence('plumber')).toBe('plumbing');
      expect(mapLegacyTypeToIntelligence('water')).toBe('plumbing');
      expect(mapLegacyTypeToIntelligence('electrician')).toBe('electrical');
      expect(mapLegacyTypeToIntelligence('wifi')).toBe('wifi');
      expect(mapLegacyTypeToIntelligence('hygiene')).toBe('cleaning');
      expect(mapLegacyTypeToIntelligence('furniture')).toBe('furniture');
      expect(mapLegacyTypeToIntelligence('security')).toBe('security');
      expect(mapLegacyTypeToIntelligence('unknown')).toBe('other');
    });

    it('computes correct SLA target hours based on priority', () => {
      const criticalSla = computeTargetResolutionDate('critical');
      expect(criticalSla.hours).toBe(4);

      const highSla = computeTargetResolutionDate('high');
      expect(highSla.hours).toBe(24);

      const mediumSla = computeTargetResolutionDate('medium');
      expect(mediumSla.hours).toBe(48);

      const lowSla = computeTargetResolutionDate('low');
      expect(lowSla.hours).toBe(72);
    });
  });

  describe('Graceful Degradation when AI is Offline', () => {
    it('gracefully creates valid intelligence fallback when Gemini fails or is unconfigured', async () => {
      const text = 'Bathroom tap is leaking constantly and making noise';
      const intelligence = await classifyComplaint(text, {
        userCategory: 'plumber',
        userPriority: 'medium',
        timeoutMs: 1, // immediate timeout trigger
      });

      expect(intelligence).toBeDefined();
      expect(intelligence.category).toBe('plumbing');
      expect(['done', 'failed', 'skipped']).toContain(intelligence.analysisStatus);
      expect(intelligence.priority).toBe('medium');
      expect(intelligence.suggestedAction.length).toBeGreaterThan(0);
    });
  });

  describe('Complaint Data Model Backward Compatibility', () => {
    it('allows complaints with or without intelligence subdocument', () => {
      const legacyDoc = new Complaint({
        userId: new mongoose.Types.ObjectId(),
        pgId: new mongoose.Types.ObjectId(),
        type: 'plumber',
        description: 'Tap leak in bathroom 2',
        priority: 'medium',
        status: 'open',
      });

      expect(legacyDoc.reopenCount).toBe(0);
      expect(legacyDoc.intelligence).toBeUndefined();

      const modernDoc = new Complaint({
        userId: new mongoose.Types.ObjectId(),
        pgId: new mongoose.Types.ObjectId(),
        type: 'electrician',
        description: 'Live wire hanging from socket',
        priority: 'critical',
        status: 'assigned',
        assignedTo: 'Metro Electrician Vendor',
        dueAt: new Date(Date.now() + 4 * 3600 * 1000),
        reopenCount: 0,
        intelligence: {
          category: 'electrical',
          issueType: 'exposed_wire',
          priority: 'critical',
          confidence: 1.0,
          suggestedAction: 'Cut power and repair',
          recurringIssue: false,
          relatedComplaintIds: [],
          modelVersion: 'test-v1',
          reviewedByHuman: false,
          analysisStatus: 'done',
          immediateEscalation: true,
        },
      });

      expect(modernDoc.status).toBe('assigned');
      expect(modernDoc.priority).toBe('critical');
      expect(modernDoc.intelligence?.category).toBe('electrical');
      expect(modernDoc.intelligence?.immediateEscalation).toBe(true);
    });
  });
});
