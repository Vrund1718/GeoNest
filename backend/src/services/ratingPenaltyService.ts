import Complaint from '../models/Complaint';
import PGListing from '../models/PGListing';
import { sendNotification } from '../utils/notifications';

/**
 * Checks for open/in_progress complaints that are older than 7 days
 * or past their estimated resolution date, and applies a -0.5 rating deduction
 * to the associated PG if not already deducted.
 */
export async function processOverdueComplaintPenalties(): Promise<number> {
  let count = 0;
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Find complaints that are open or in_progress, not yet ratingDeducted
    const overdueComplaints = await Complaint.find({
      status: { $in: ['open', 'in_progress'] },
      ratingDeducted: { $ne: true },
      $or: [
        { createdAt: { $lte: sevenDaysAgo } },
        { estimatedResolutionDate: { $exists: true, $ne: null, $lte: now } }
      ]
    });

    for (const complaint of overdueComplaints) {
      const pg = await PGListing.findById(complaint.pgId).populate<{ ownerId: any }>('ownerId');
      if (!pg) continue;

      const penaltyAmount = 0.5;
      const currentPenalty = pg.ratingPenalty || 0;
      pg.ratingPenalty = Math.min(4.0, currentPenalty + penaltyAmount);

      pg.ratingLogs.push({
        complaintId: complaint._id,
        amount: penaltyAmount,
        reason: `Complaint #${complaint._id.toString().slice(-6)} remained unresolved past resolution timeline`,
        date: now
      });

      await pg.save();

      complaint.ratingDeducted = true;
      complaint.ratingDeductionAmount = penaltyAmount;
      await complaint.save();

      count++;

      // Notify the owner about the rating penalty
      const ownerUserId = pg.ownerId?.userId;
      if (ownerUserId) {
        await sendNotification(
          ownerUserId,
          'general',
          '⚠️ PG Rating Deducted',
          `Your PG "${pg.name}" rating has been reduced by ${penaltyAmount} pts due to an unresolved complaint #${complaint._id.toString().slice(-6)}.`,
          { type: 'complaint', id: complaint._id },
          `/owner/complaints#${complaint._id}`
        );
      }
    }
  } catch (err) {
    console.error('[Overdue Complaint Penalty Processing Error]', err);
  }
  return count;
}
