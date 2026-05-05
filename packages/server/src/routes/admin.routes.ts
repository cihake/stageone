/**
 * /api/admin/* — admin-only operations.
 *
 * Routes:
 *   GET   /api/admin/artists          list pending (isApproved=false) artists
 *   PATCH /api/admin/artists/:id/approve  flip isApproved to true
 *
 * All routes require role=admin. Per spec §5.1.3.
 */
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { Artist } from '../models/index.js';
import { Types } from 'mongoose';

export const adminRouter = Router();

// Apply auth guard to the whole router.
adminRouter.use(requireAuth, requireRole('admin'));

// ─── List pending artists ─────────────────────────────────────────────
adminRouter.get('/artists', async (_req, res, next) => {
	try {
		const pending = await Artist.find({ isApproved: false })
			.sort({ createdAt: 1 }) // oldest first — FIFO review queue
			.lean();
		res.json({ items: pending, total: pending.length });
	} catch (err) {
		next(err);
	}
});

// ─── Approve an artist ────────────────────────────────────────────────
adminRouter.patch('/artists/:id/approve', async (req, res, next) => {
	try {
		const { id } = req.params;
		if (!id || !Types.ObjectId.isValid(id)) throw new HttpError(400, 'Invalid artist id');

		const artist = await Artist.findByIdAndUpdate(
			id,
			{ isApproved: true },
			{ new: true },
		);
		if (!artist) throw new HttpError(404, 'Artist not found');

		res.json({ artist });
	} catch (err) {
		next(err);
	}
});

// ─── Revoke approval (nice-to-have for completeness) ─────────────────
adminRouter.patch('/artists/:id/revoke', async (req, res, next) => {
	try {
		const { id } = req.params;
		if (!id || !Types.ObjectId.isValid(id)) throw new HttpError(400, 'Invalid artist id');

		const artist = await Artist.findByIdAndUpdate(
			id,
			{ isApproved: false },
			{ new: true },
		);
		if (!artist) throw new HttpError(404, 'Artist not found');

		res.json({ artist });
	} catch (err) {
		next(err);
	}
});
