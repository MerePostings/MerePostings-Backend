require("dotenv").config();
const { db } = require("../config/db");
const AppError = require("../utils/AppError");

const adminService = {
  handleAdminLogin: async (email) => {
    try{
      if (!email || typeof email !== "string" || email.trim() === "") {
        return false;
      }

      const trimmedEmail = email.trim().toLowerCase();

      const snapshot = await db
        .collection("users")
        .where("email", "==", trimmedEmail)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return false;
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      const isAdmin = userData.ifAdmin === true;

      return isAdmin;
    }catch(e){
      throw new AppError(e.message || 'Failed to Login', e.statusCode || 500);
    }
  },

  getDashboardStats: async (range) => {
    try {
      const now = new Date();
      let startDate;

      if (range === 'Today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (range === 'This Week') {
        const day = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - day);
        startDate.setHours(0, 0, 0, 0);
      } else if (range === 'This Month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
      }

      const { Timestamp } = require('firebase-admin/firestore');
      const start = Timestamp.fromDate(startDate);

      const [usersSnap, propertiesSnap, transactionsSnap] = await Promise.all([
        db.collection('users').where('createdAt', '>=', start).get(),
        db.collection('properties').get(),
        db.collection('transactions').where('createdAt', '>=', start).get(),
      ]);

      const totalUsers = usersSnap.size;

      const totalRevenue = transactionsSnap.docs.reduce((sum, doc) => {
        const d = doc.data();
        return d.status === 'processed' ? sum + (d.amount || 0) : sum;
      }, 0);

      const totalProperties = propertiesSnap.docs.filter(doc => {
        const d = doc.data();
        const createdAt = d.updatedAt;
        return createdAt && createdAt.toDate() >= startDate;
      }).length;

      const monthlyListings = {};
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthlyListings[key] = { 
          label: monthNames[d.getMonth()], 
          residential: 0, 
          commercial: 0, 
          other: 0 
        };
      }

      propertiesSnap.docs.forEach(doc => {
        const d = doc.data();
        const date = d.updatedAt?.toDate();
        if (!date) return;
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        if (!monthlyListings[key]) return;
        const type = d.propertyType?.toLowerCase();
        if (type === 'residential') monthlyListings[key].residential++;
        else if (type === 'commercial') monthlyListings[key].commercial++;
        else monthlyListings[key].other++;
      });

      const statusCounts = { pending: 0, active: 0, draft: 0, finished: 0 };
      propertiesSnap.docs.forEach(doc => {
        const status = doc.data().status;
        if (statusCounts[status] !== undefined) statusCounts[status]++;
        else statusCounts['other'] = (statusCounts['other'] || 0) + 1;
      });

      const recentTransactions = transactionsSnap.docs
        .sort((a, b) => b.data().createdAt?.toMillis() - a.data().createdAt?.toMillis())
        .slice(0, 5)
        .map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            amount: d.amount,
            status: d.status,
            type: d.type,
            createdAt: d.createdAt?.toDate().toISOString(),
            listingId: d.listingId,
          };
        });

      return {
        summary: { totalUsers, totalRevenue, totalProperties },
        monthlyListings: Object.values(monthlyListings),
        statusBreakdown: statusCounts,
        recentTransactions,
      };
    } catch (e) {
      throw new AppError(e.message || 'Failed to fetch dashboard stats', 500);
    }
  },

  getUsers: async ({ search, page, limit }) => {
    try {
      const pageNum = parseInt(page) || 1;
      const pageSize = parseInt(limit) || 20;

      let snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();

      let users = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          firstName: d.firstName || '',
          lastName: d.lastName || '',
          email: d.email || '',
          createdAt: d.createdAt?.toDate().toISOString() || null,
          termsVersion: d.termsVersion || null,
        };
      });

      if (search) {
        const s = search.toLowerCase();
        users = users.filter(u =>
          u.firstName.toLowerCase().includes(s) ||
          u.lastName.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s)
        );
      }

      const total = users.length;
      const paginated = users.slice((pageNum - 1) * pageSize, pageNum * pageSize);

      return { users: paginated, total, page: pageNum, limit: pageSize };
    } catch (e) {
      throw new AppError(e.message || 'Failed to fetch users', 500);
    }
  },

  getTransactions: async ({ search, status, page, limit }) => {
    try {
      const pageNum = parseInt(page) || 1;
      const pageSize = parseInt(limit) || 20;

      let query = db.collection('transactions').orderBy('createdAt', 'desc');
      if (status) query = query.where('status', '==', status);

      const snapshot = await query.get();

      let transactions = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          amount: d.amount || 0,
          status: d.status || 'unknown',
          type: d.type || '',
          createdAt: d.createdAt?.toDate().toISOString() || null,
          listingId: d.listingId || '',
          customerId: d.customerId || '',
          paymentIntentId: d.paymentIntentId || '',
          attemptCount: d.attemptCount || 1,
        };
      });

      if (search) {
        const s = search.toLowerCase();
        transactions = transactions.filter(t =>
          t.id.toLowerCase().includes(s) ||
          t.listingId.toLowerCase().includes(s) ||
          t.paymentIntentId.toLowerCase().includes(s) ||
          t.customerId.toLowerCase().includes(s)
        );
      }

      const total = transactions.length;
      const paginated = transactions.slice((pageNum - 1) * pageSize, pageNum * pageSize);

      return { transactions: paginated, total, page: pageNum, limit: pageSize };
    } catch (e) {
      throw new AppError(e.message || 'Failed to fetch transactions', 500);
    }
  },

  getListings: async ({ search, status, page, limit }) => {
    try {
      const pageNum = parseInt(page) || 1;
      const pageSize = parseInt(limit) || 20;

      let query = db.collection('properties').orderBy('updatedAt', 'desc');
      if (status) query = query.where('status', '==', status);

      const snapshot = await query.get();

      let listings = snapshot.docs.map(doc => {
        const d = doc.data();

        const loc = d.Location || {};
        const addressParts = [
          loc.streetNumber,
          loc.streetName,
          loc.streetDirection,
          loc.apartmentUnitNumber ? `Unit ${loc.apartmentUnitNumber}` : null,
          loc.municipality,
          loc.area,
        ].filter(Boolean);
        const address = addressParts.join(' ') || '';

        const exterior = d.Exterior || {};
        const title = [d.subType, exterior.propertyType]
          .filter(Boolean)
          .join(' ') || 'Unlisted Property';

        const photos = d.media?.photos || [];
        const thumbnail = photos[0]?.url || null;

        return {
          id: doc.id,
          status: d.status || 'pending',
          title,
          address,
          propertyType: d.propertyType || '',   // residential / commercial
          subType: d.subType || '',              // Detached / Condo / Duplex etc.
          saleType: d.saleType || '',            // sell / rent
          listPrice: d.contractCommencement?.listPrice || '',
          thumbnail,
          updatedAt: d.updatedAt?.toDate().toISOString() || null,
        };
      });

      if (search) {
        const s = search.toLowerCase();
        listings = listings.filter(l =>
          l.title.toLowerCase().includes(s) ||
          l.address.toLowerCase().includes(s) ||
          l.subType.toLowerCase().includes(s) ||
          l.propertyType.toLowerCase().includes(s)
        );
      }

      const total = listings.length;
      const paginated = listings.slice((pageNum - 1) * pageSize, pageNum * pageSize);

      return { listings: paginated, total, page: pageNum, limit: pageSize };
    } catch (e) {
      console.log(e)
      throw new AppError(e.message || 'Failed to fetch listings', 500);
    }
  },

  getListingById: async (listingId) => {
    try {
      const doc = await db.collection('properties').doc(listingId).get();
      if (!doc.exists) throw new AppError('Listing not found', 404);

      const d = doc.data();
      return { id: doc.id, ...d };
    } catch (e) {
      throw new AppError(e.message || 'Failed to fetch listing', e.statusCode || 500);
    }
  },

  updateListing: async (listingId, payload) => {
    try {
      const { Timestamp } = require('firebase-admin/firestore');
      const { FieldValue } = require('firebase-admin/firestore');

      const clean = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        return Object.fromEntries(
          Object.entries(obj)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, v && typeof v === 'object' && !Array.isArray(v) ? clean(v) : v])
        );
      };

      const cleanedPayload = clean(payload);

      await db.collection('properties').doc(listingId).set(
        { ...cleanedPayload, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );

      return { success: true };
    } catch (e) {
      throw new AppError(e.message || 'Failed to update listing', 500);
    }
  },

  updateListingStatus: async (listingId, status) => {
    try {
      const { FieldValue } = require('firebase-admin/firestore');
      const validStatuses = ['draft', 'pending', 'active', 'closed'];
      if (!validStatuses.includes(status)) throw new AppError('Invalid status', 400);

      await db.collection('properties').doc(listingId).update({
        status,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { success: true };
    } catch (e) {
      throw new AppError(e.message || 'Failed to update status', 500);
    }
  },

  updateTrackingStep: async (listingId, stepId, completed) => {
    try {
      const { FieldValue } = require('firebase-admin/firestore');
      await db.collection('properties').doc(listingId).update({
        [`tracking.${stepId}`]: completed,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { success: true };
    } catch (e) {
      throw new AppError(e.message || 'Failed to update tracking step', 500);
    }
  },

}

module.exports = adminService