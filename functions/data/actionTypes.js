const ACTION_TYPES = [
  'document_upload',
  'payment_due',
  'info_request',
  'verification_required',
  'photo_upload',
  'appointment_required',
];

const ACTION_STATUSES = ['pending', 'in_progress', 'completed', 'overdue'];

const ACTION_PRIORITIES = ['low', 'medium', 'high'];

// Sub-state of ActionItem.schedulingRequest for the three appointment-based
// actions (verification, professional_photography, pre_listing_home_inspection).
// The user always submits a batch of 3 {date, timeOfDay} slots; 'requested'
// means the active batch was submitted by the user (awaiting the admin),
// 'countered' means the admin submitted 3 alternative slots (awaiting the
// user), and 'confirmed' is terminal, set only once the admin finalizes one
// of the user's slots (never the admin's own countered batch).
const SCHEDULING_STATES = ['requested', 'countered', 'confirmed'];

const TIME_OF_DAY = ['morning', 'afternoon'];

// A finalized appointment books the entire window as the scheduled event
// (e.g. morning -> 9:00 AM-12:00 PM, afternoon -> 12:00 PM-3:00 PM). Both
// windows are 3 hours. Half-open [start, end) -- 12:00 exactly belongs to
// 'afternoon' only.
const TIME_OF_DAY_WINDOWS = {
  morning: { start: '09:00', end: '12:00' },
  afternoon: { start: '12:00', end: '15:00' },
};

module.exports = {
  ACTION_TYPES,
  ACTION_STATUSES,
  ACTION_PRIORITIES,
  SCHEDULING_STATES,
  TIME_OF_DAY,
  TIME_OF_DAY_WINDOWS,
};
