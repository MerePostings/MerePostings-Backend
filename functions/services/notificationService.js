const { db } = require("../config/db");
const AppError = require("../utils/AppError");
const { FieldValue } = require('firebase-admin/firestore');
const { NOTIFICATION_TYPES, SEVERITIES, isEmailOptedIn } = require('../data/notificationTypes');
const { sendNotificationEmail } = require('./mailService');

// notification content can originate from admin/user-influenced fields
// (title, message, listingAddress, actionLabel) — escape before
// interpolating into the HTML email body to avoid markup/link injection.
const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderNotificationEmail = (notification) => {
    const safeActionUrl = /^https?:\/\//i.test(notification.actionUrl || '') ? notification.actionUrl : null;

    const actionHtml = safeActionUrl && notification.actionLabel
        ? `<tr><td align="center" style="padding:25px 30px;">
            <a href="${escapeHtml(safeActionUrl)}" style="display:inline-block;background:transparent;color:#154360;border:2px solid #154360;font-family:'Open Sans', Helvetica, Arial, sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:10px 30px;border-radius:5px;" target="_blank">${escapeHtml(notification.actionLabel)}</a>
          </td></tr>`
        : '';

    const listingLine = notification.listingAddress
        ? `<div style="font-family:'Open Sans', sans-serif;font-size:14px;color:#777777;margin-top:6px;">${escapeHtml(notification.listingAddress)}</div>`
        : '';

    return {
        subject: notification.title,
        htmlBody: `
          <!doctype html>
          <html>
            <body style="word-spacing:normal;background-color:#F4F4F4;margin:0;padding:0;">
              <div style="background-color:#F4F4F4;">
                <table align="center" width="100%" style="max-width:600px;margin:0 auto;background:#7a8c6e;">
                  <tr><td align="center" style="padding:20px 0;">
                    <a href="${process.env.FRONTEND_URL}" style="text-decoration:none;color:#ffffff;font-family:'Playfair Display', serif;font-size:35px;font-weight:600;">
                      <span style="color:#154360;">Mere</span>Postings
                    </a>
                  </td></tr>
                </table>
                <table align="center" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;">
                  <tr><td style="padding:30px 25px;">
                    <div style="font-family:sans-serif;font-size:20px;color:#333333;">${escapeHtml(notification.title)}</div>
                    <div style="font-family:'Open Sans', sans-serif;font-size:14px;line-height:1.6;color:#555555;margin-top:12px;">${escapeHtml(notification.message)}</div>
                    ${listingLine}
                  </td></tr>
                  ${actionHtml}
                </table>
                <table align="center" width="100%" style="max-width:600px;margin:0 auto;background:#7a8c6e;">
                  <tr><td align="center" style="padding:20px;">
                    <div style="font-family:'Open Sans', sans-serif;font-size:12px;color:#e9e9e9;">This is an auto-generated email. Please do not reply to this message.</div>
                    <div style="font-family:'Open Sans', sans-serif;font-size:12px;color:#e9e9e9;margin-top:6px;">&copy; ${new Date().getFullYear()} Mere Postings. All rights reserved.</div>
                  </td></tr>
                </table>
              </div>
            </body>
          </html>`,
    };
};

const notificationService = {

    createNotification: async ({
        userId,
        type,
        severity = 'info',
        title,
        message,
        listingId = null,
        listingAddress = null,
        actionUrl = null,
        actionLabel = null,
        sendEmail = true,
    }) => {
        if (!userId) throw new AppError('userId is required', 400);
        if (!NOTIFICATION_TYPES.includes(type)) throw new AppError(`Unknown notification type: ${type}`, 400);
        if (!SEVERITIES.includes(severity)) throw new AppError(`Unknown notification severity: ${severity}`, 400);
        if (!title || !message) throw new AppError('title and message are required', 400);

        const userSnap = await db.collection('users').doc(userId).get();
        if (!userSnap.exists) throw new AppError('User not found', 404);
        const userData = userSnap.data();

        const notification = {
            userId,
            type,
            severity,
            title,
            message,
            listingId,
            listingAddress,
            isRead: false,
            readAt: null,
            actionUrl,
            actionLabel,
        };

        const notifRef = db.collection('notifications').doc();

        try {
            await notifRef.set({
                ...notification,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        } catch (e) {
            console.error('[notif] Error creating notification:', e);
            throw new AppError('Failed to create notification', 500);
        }

        const shouldEmail = sendEmail && Boolean(userData.email) && isEmailOptedIn(userData.notificationPreferences, type);

        if (shouldEmail) {
            try {
                const { subject, htmlBody } = renderNotificationEmail(notification);
                await sendNotificationEmail(userData.email, subject, htmlBody);
            } catch (e) {
                console.error('[notif] Error sending notification email:', e);
            }
        }

        console.log(`[notif] created ${notifRef.id} for user ${userId} (type=${type}, email=${shouldEmail})`);

        return { id: notifRef.id, ...notification };
    },

    /**
     * Cursor-based pagination (by notification id, not an offset), so the
     * list stays cheap as a user's notification history grows unbounded
     * over months — unlike the in-memory offset-slice pattern used for the
     * (bounded, admin-only) lists in adminService.js.
     */
    listNotifications: async (userId, { cursorId, limit } = {}) => {
        const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

        let query = db.collection('notifications')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc');

        if (cursorId) {
            const cursorSnap = await db.collection('notifications').doc(cursorId).get();
            if (cursorSnap.exists && cursorSnap.data().userId === userId) {
                query = query.startAfter(cursorSnap);
            }
        }

        const snapshot = await query.limit(pageSize + 1).get();
        const docs = snapshot.docs.slice(0, pageSize);
        const hasMore = snapshot.docs.length > pageSize;

        const notifications = docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || data.createdAt,
                readAt: data.readAt?.toDate?.() || data.readAt,
            };
        });

        return {
            notifications,
            nextCursor: hasMore ? docs[docs.length - 1].id : null,
        };
    },

    getUnreadCount: async (userId) => {
        const snapshot = await db.collection('notifications')
            .where('userId', '==', userId)
            .where('isRead', '==', false)
            .count()
            .get();

        return snapshot.data().count;
    },

    markAsRead: async (userId, notificationId) => {
        const docRef = db.collection('notifications').doc(notificationId);
        const snap = await docRef.get();

        if (!snap.exists) throw new AppError('Notification not found', 404);
        if (snap.data().userId !== userId) throw new AppError('Unauthorized access to this notification', 403);

        if (!snap.data().isRead) {
            await docRef.update({
                isRead: true,
                readAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        }

        return { id: notificationId, isRead: true };
    },

    markAllAsRead: async (userId) => {
        const batchSize = 400;
        let updatedCount = 0;

        for (;;) {
            const snapshot = await db.collection('notifications')
                .where('userId', '==', userId)
                .where('isRead', '==', false)
                .limit(batchSize)
                .get();

            if (snapshot.empty) break;

            const batch = db.batch();
            snapshot.docs.forEach((doc) => {
                batch.update(doc.ref, {
                    isRead: true,
                    readAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
            });
            await batch.commit();
            updatedCount += snapshot.docs.length;

            if (snapshot.docs.length < batchSize) break;
        }

        return { updatedCount };
    },

    getPreferences: async (userId) => {
        const snap = await db.collection('users').doc(userId).get();
        if (!snap.exists) throw new AppError('User not found', 404);

        const stored = snap.data().notificationPreferences || {};
        const preferences = {};
        NOTIFICATION_TYPES.forEach((type) => {
            preferences[type] = stored[type] !== false;
        });

        return preferences;
    },

    /**
     * `patch` is a partial { type: boolean } map. Written via dot-path
     * keys through .update() (not .set(..., {merge:true}), which does NOT
     * interpret dotted string keys as nested paths) — same pattern as
     * propertyService.saveDraftField / adminService.updateTrackingStep.
     */
    updatePreferences: async (userId, patch) => {
        const invalidKeys = Object.keys(patch).filter((key) => !NOTIFICATION_TYPES.includes(key));
        if (invalidKeys.length > 0) {
            throw new AppError(`Unknown notification type(s): ${invalidKeys.join(', ')}`, 400);
        }

        const dotPathUpdate = {};
        Object.entries(patch).forEach(([type, enabled]) => {
            dotPathUpdate[`notificationPreferences.${type}`] = Boolean(enabled);
        });
        dotPathUpdate.updatedAt = FieldValue.serverTimestamp();

        try {
            await db.collection('users').doc(userId).update(dotPathUpdate);
        } catch (e) {
            console.error('[notif] Error updating notification preferences:', e);
            throw new AppError('Failed to update notification preferences', 500);
        }

        return notificationService.getPreferences(userId);
    },

};

module.exports = notificationService;
