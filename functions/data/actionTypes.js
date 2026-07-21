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
const SCHEDULING_STATES = ['requested', 'proposed', 'confirmed'];

const TIME_OF_DAY = ['morning', 'afternoon'];

module.exports = {
  ACTION_TYPES,
  ACTION_STATUSES,
  ACTION_PRIORITIES,
  SCHEDULING_STATES,
  TIME_OF_DAY,
};
