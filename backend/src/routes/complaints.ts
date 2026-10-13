import { Router } from 'express';
import mongoose from 'mongoose';
import Complaint, { IComplaint } from '../models/Complaint';
import PGListing from '../models/PGListing';
import Booking from '../models/Booking';
import Owner from '../models/Owner';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import {
  classifyComplaint,
  computeTargetResolutionDate,
  checkSafetyOverride,
  ALLOWED_CATEGORIES,
  ALLOWED_PRIORITIES,
} from '../services/complaintIntelligence';
import { sendNotification } from '../utils/notifications';

const router = Router();

const AnalyzeSchema = z.object({
  body: z.object({
    description: z.string().min(5, 'Description must be at least 5 characters'),
    userCategory: z.string().optional(),
    userPriority: z.string().optional(),
  }),
});

const CreateComplaintSchema = z.object({
  body: z.object({
    pgId: z.string().optional(),
    type: z.string().optional(),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    priority: z.enum(['low', 'medium', 'high', 'urgent', 'critical']).optional(),
    photoUrls: z.array(z.string()).optional(),
    intelligence: z.record(z.any()).optional(),
  }),
});

const PatchIntelligenceSchema = z.object({
  body: z.object({
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
    ]).optional(),
    issueType: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    suggestedAction: z.string().optional(),
    asset: z.string().optional(),
    location: z.string().optional(),
    assignedTo: z.string().optional(),
    dueAt: z.string().optional(),
    status: z.enum(['open', 'assigned', 'in_progress', 'resolved', 'reopened', 'closed']).optional(),
    reviewNotes: z.string().optional(),
  }),
});

/**
 * GET /api/complaints/me
 * Retrieves complaints submitted by the authenticated student.
 */
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const complaints = await Complaint.find({ userId: req.user!._id })
      .populate('pgId', 'name city ratingPenalty')
      .sort({ createdAt: -1 });
    return res.json({ complaints });
  } catch (err) {
    console.error('[Get My Complaints Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve complaints' });
  }
});

/**
 * POST /api/complaints/analyze (preview)
 * Fast AI classification preview for the student complaint creation modal.
 * Safe to call while student is filling the form.
 */
router.post('/analyze', validate(AnalyzeSchema), async (req, res) => {
  try {
    const { description, userCategory, userPriority } = req.body;
    const safetyCheck = checkSafetyOverride(description);
    const intelligence = await classifyComplaint(description, {
      userCategory,
      userPriority,
      timeoutMs: 3500, // fast timeout for preview
    });

    const sla = computeTargetResolutionDate(intelligence.priority);

    return res.json({
      ok: true,
      intelligence,
      targetResolutionHours: sla.hours,
      dueAt: sla.dueAt,
      isSafetyHazard: safetyCheck.isCritical,
      safetyHazardKeyword: safetyCheck.matchedKeyword,
    });
  } catch (err: any) {
    console.error('[Analyze Preview Error]', err);
    return res.status(500).json({ error: 'Failed to analyze complaint' });
  }
});

/**
 * POST /api/complaints
 * Save complaint with AI intelligence analysis and rule-based safety escalation.
 */
router.post('/', requireAuth, validate(CreateComplaintSchema), async (req: AuthRequest, res) => {
  try {
    const { pgId, type, description, priority, photoUrls, intelligence: clientIntelligence } = req.body;
    let targetPgId = typeof pgId === 'object' && pgId?._id ? String(pgId._id) : (pgId ? String(pgId) : '');

    // Check for registered booking
    const bookingFilter: any = { userId: req.user!._id };
    if (targetPgId) {
      bookingFilter.pgId = targetPgId;
    }

    let booking = await Booking.findOne(bookingFilter);
    if (!booking) {
      booking = await Booking.findOne({ userId: req.user!._id });
    }

    if (!booking && req.user!.role !== 'admin') {
      return res.status(403).json({
        error: 'You can only file a complaint for a PG where you have registered or stayed.',
      });
    }

    if (!targetPgId && booking) {
      targetPgId = String(booking.pgId);
    }

    const pg = await PGListing.findById(targetPgId).populate<{ ownerId: any }>('ownerId');
    if (!pg) {
      return res.status(404).json({ error: 'PG accommodation not found' });
    }

    // Run intelligence triage
    let intelligenceData = clientIntelligence;
    if (!intelligenceData || !intelligenceData.analysisStatus || intelligenceData.analysisStatus === 'pending') {
      intelligenceData = await classifyComplaint(description, {
        userCategory: type,
        userPriority: priority,
      });
    } else {
      // Independent safety re-check on final description even if client supplied intelligence
      const safety = checkSafetyOverride(description);
      if (safety.isCritical) {
        intelligenceData.priority = 'critical';
        intelligenceData.immediateEscalation = true;
        intelligenceData.requiresHumanReview = true;
      }
    }

    const effectivePriority = intelligenceData.priority || priority || 'medium';
    const sla = computeTargetResolutionDate(effectivePriority);

    const complaint = await Complaint.create({
      userId: req.user!._id,
      pgId: targetPgId,
      type: type || (intelligenceData.category as any) || 'other',
      description,
      priority: effectivePriority,
      photoUrls: photoUrls || [],
      status: 'open',
      intelligence: intelligenceData,
      estimatedResolutionHours: sla.hours,
      estimatedResolutionDate: sla.dueAt,
      dueAt: sla.dueAt,
    });

    // Notify Owner with safety awareness
    const ownerUserId = pg.ownerId?.userId;
    if (ownerUserId) {
      const isCritical = effectivePriority === 'critical' || intelligenceData.immediateEscalation;
      const title = isCritical ? '🚨 CRITICAL COMPLAINT ESCALATION' : 'New Complaint Filed';
      const body = isCritical
        ? `EMERGENCY ALERT: ${req.user!.name} raised a critical safety complaint for "${pg.name}". Immediate action required!`
        : `${req.user!.name} raised a ${effectivePriority} priority complaint (${intelligenceData.category}) for "${pg.name}".`;

      await sendNotification(
        ownerUserId,
        'complaint_status',
        title,
        body,
        { type: 'complaint', id: complaint._id },
        `/owner/complaints#${complaint._id}`
      );
    }

    return res.status(201).json({ complaint });
  } catch (err: any) {
    console.error('[Create Complaint Error]', err);
    return res.status(500).json({ error: err.message || 'Failed to file complaint' });
  }
});

/**
 * GET /api/complaints/:id/intelligence
 * Retrieve intelligence sub-document.
 * Accessible only by: ticket author (student), property owner, or admin.
 */
router.get('/:id/intelligence', requireAuth, async (req: AuthRequest, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    // Role check:
    const isAuthor = String(complaint.userId) === String(req.user!._id);
    const isAdmin = req.user!.role === 'admin';

    let isOwner = false;
    if (req.user!.role === 'owner') {
      const ownerRecord = await Owner.findOne({ userId: req.user!._id });
      const pg = await PGListing.findById(complaint.pgId);
      if (ownerRecord && pg && String(pg.ownerId) === String(ownerRecord._id)) {
        isOwner = true;
      }
    }

    if (!isAuthor && !isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to view intelligence for this complaint.' });
    }

    return res.json({
      complaintId: complaint._id,
      intelligence: complaint.intelligence || null,
      status: complaint.status,
      assignedTo: complaint.assignedTo,
      dueAt: complaint.dueAt,
      reopenCount: complaint.reopenCount,
    });
  } catch (err: any) {
    console.error('[Get Intelligence Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve complaint intelligence' });
  }
});

/**
 * PATCH /api/complaints/:id/intelligence
 * Allows PG owner or Admin to review and correct AI classification fields.
 * Students CANNOT modify priority, assignment, or classification.
 */
router.patch('/:id/intelligence', requireAuth, validate(PatchIntelligenceSchema), async (req: AuthRequest, res) => {
  try {
    if (req.user!.role === 'student') {
      return res.status(403).json({
        error: 'Students are not permitted to modify complaint intelligence, priority, or assignments.',
      });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    // Owner authorization check
    if (req.user!.role !== 'admin') {
      const ownerRecord = await Owner.findOne({ userId: req.user!._id });
      const pg = await PGListing.findById(complaint.pgId);
      if (!ownerRecord || !pg || String(pg.ownerId) !== String(ownerRecord._id)) {
        return res.status(403).json({ error: 'You can only update complaints for your own properties.' });
      }
    }

    const {
      category,
      issueType,
      priority,
      suggestedAction,
      asset,
      location,
      assignedTo,
      dueAt,
      status,
      reviewNotes,
    } = req.body;

    if (!complaint.intelligence) {
      complaint.intelligence = {
        category: category || 'other',
        issueType: issueType || 'general_maintenance',
        priority: priority || 'medium',
        confidence: 1.0,
        suggestedAction: suggestedAction || '',
        recurringIssue: false,
        relatedComplaintIds: [],
        modelVersion: 'manual-override',
        reviewedByHuman: true,
        analysisStatus: 'done',
        asset,
        location,
      };
    } else {
      if (category) complaint.intelligence.category = category;
      if (issueType) complaint.intelligence.issueType = issueType;
      if (priority) complaint.intelligence.priority = priority;
      if (suggestedAction) complaint.intelligence.suggestedAction = suggestedAction;
      if (asset !== undefined) complaint.intelligence.asset = asset;
      if (location !== undefined) complaint.intelligence.location = location;
      complaint.intelligence.reviewedByHuman = true;
    }

    if (priority) {
      complaint.priority = priority;
      // If priority changed and no explicit dueAt provided, update SLA target
      if (!dueAt) {
        const sla = computeTargetResolutionDate(priority, complaint.createdAt);
        complaint.dueAt = sla.dueAt;
        complaint.estimatedResolutionHours = sla.hours;
        complaint.estimatedResolutionDate = sla.dueAt;
      }
    }

    if (assignedTo !== undefined) {
      complaint.assignedTo = assignedTo;
      if (complaint.status === 'open' && assignedTo.trim().length > 0) {
        complaint.status = 'assigned';
      }
    }

    if (dueAt) {
      complaint.dueAt = new Date(dueAt);
      complaint.estimatedResolutionDate = new Date(dueAt);
    }

    if (status) {
      complaint.status = status;
      if (status === 'resolved' || status === 'closed') {
        complaint.resolvedAt = new Date();
      }
    }

    if (reviewNotes && reviewNotes.trim().length > 0) {
      complaint.responses.push({
        role: req.user!.role === 'admin' ? 'admin' : 'owner',
        message: `[Intelligence Review] ${reviewNotes.trim()}`,
        createdAt: new Date(),
      });
    }

    await complaint.save();

    // Notify student about important updates (assigned, priority, resolution)
    if (status || assignedTo || priority) {
      await sendNotification(
        complaint.userId,
        'complaint_status',
        'Complaint Updated by Property Staff',
        `Your complaint #${complaint._id.toString().slice(-6)} is now ${complaint.status} (Priority: ${complaint.priority}).`,
        { type: 'complaint', id: complaint._id },
        `/student/complaints#${complaint._id}`
      );
    }

    return res.json({ ok: true, complaint });
  } catch (err: any) {
    console.error('[Patch Intelligence Error]', err);
    return res.status(500).json({ error: err.message || 'Failed to update complaint intelligence' });
  }
});

/**
 * POST /api/complaints/:id/confirm-resolved
 * Student confirms that the maintenance repair was successful.
 */
router.post('/:id/confirm-resolved', requireAuth, async (req: AuthRequest, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    // Only ticket creator or admin can confirm
    if (String(complaint.userId) !== String(req.user!._id) && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only the student who raised this complaint can confirm its resolution.' });
    }

    complaint.status = 'resolved';
    complaint.resolvedAt = new Date();
    complaint.responses.push({
      role: 'student',
      message: 'Student confirmed resolution: Issue has been resolved satisfactorily.',
      createdAt: new Date(),
    });

    await complaint.save();

    // Notify owner
    const pg = await PGListing.findById(complaint.pgId);
    if (pg) {
      const owner = await Owner.findById(pg.ownerId);
      if (owner) {
        await sendNotification(
          owner.userId,
          'complaint_status',
          'Complaint Confirmed Resolved',
          `Student ${req.user!.name} confirmed resolution for ticket #${complaint._id.toString().slice(-6)}.`,
          { type: 'complaint', id: complaint._id },
          `/owner/complaints#${complaint._id}`
        );
      }
    }

    return res.json({ ok: true, complaint });
  } catch (err: any) {
    console.error('[Confirm Resolved Error]', err);
    return res.status(500).json({ error: 'Failed to confirm resolution' });
  }
});

/**
 * POST /api/complaints/:id/reopen
 * Student reopens a ticket after repair if issue persists or recurs.
 */
router.post('/:id/reopen', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    // Only ticket creator or admin can reopen
    if (String(complaint.userId) !== String(req.user!._id) && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only the student who raised this complaint can reopen it.' });
    }

    if (complaint.status !== 'resolved' && complaint.status !== 'closed') {
      return res.status(400).json({ error: 'Only resolved or closed complaints can be reopened.' });
    }

    complaint.status = 'reopened';
    complaint.reopenCount = (complaint.reopenCount || 0) + 1;
    complaint.responses.push({
      role: 'student',
      message: `[Ticket Reopened (x${complaint.reopenCount})]: ${reason || 'Issue still persists after repair.'}`,
      createdAt: new Date(),
    });

    // Reset resolution date & compute refreshed SLA
    complaint.resolvedAt = undefined;
    const sla = computeTargetResolutionDate(complaint.priority);
    complaint.dueAt = sla.dueAt;
    complaint.estimatedResolutionDate = sla.dueAt;

    await complaint.save();

    // Alert Owner
    const pg = await PGListing.findById(complaint.pgId);
    if (pg) {
      const owner = await Owner.findById(pg.ownerId);
      if (owner) {
        await sendNotification(
          owner.userId,
          'complaint_status',
          '⚠️ Complaint Reopened by Student',
          `Student ${req.user!.name} reopened ticket #${complaint._id.toString().slice(-6)}: "${reason || 'Issue still persists'}"`,
          { type: 'complaint', id: complaint._id },
          `/owner/complaints#${complaint._id}`
        );
      }
    }

    return res.json({ ok: true, complaint });
  } catch (err: any) {
    console.error('[Reopen Complaint Error]', err);
    return res.status(500).json({ error: 'Failed to reopen complaint' });
  }
});

export default router;
