const NOTIFICATION_TYPES = [
  'status_change',
  'message',
  'system',
  'action_update',
];

const SEVERITIES = ['info', 'success', 'warning', 'urgent'];

/**
 * Whether a user should receive an email for a given notification type.
 * A missing key in users/{uid}.notificationPreferences means opted-in —
 * preferences are only ever written when a user actually changes one,
 * so this default keeps existing users opted-in with no migration.
 */
const isEmailOptedIn = (preferences, type) => {
  const value = preferences?.[type];
  return value !== false;
};

module.exports = { NOTIFICATION_TYPES, SEVERITIES, isEmailOptedIn };