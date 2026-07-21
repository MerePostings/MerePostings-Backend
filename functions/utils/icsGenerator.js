// Minimal RFC5545 ICS builder for a single VEVENT — used to let listing
// owners add a confirmed appointment (verification / photography /
// inspection) to their own calendar. Intentionally does not touch
// config/googleOAuth.js or the existing Google Calendar booking flow in
// scheduleService.js, which is a separate, unrelated system.

const toIcsDate = (date) => {
    return new Date(date)
        .toISOString()
        .replace(/[-:]/g, '')
        .split('.')[0] + 'Z';
};

const escapeIcsText = (value) => String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');

const buildIcs = ({ uid, title, description, location, startDateTime, endDateTime }) => {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//MerePostings//Actions//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}@merepostings.com`,
        `DTSTAMP:${toIcsDate(new Date())}`,
        `DTSTART:${toIcsDate(startDateTime)}`,
        `DTEND:${toIcsDate(endDateTime)}`,
        `SUMMARY:${escapeIcsText(title)}`,
    ];

    if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
    if (location) lines.push(`LOCATION:${escapeIcsText(location)}`);

    lines.push('END:VEVENT', 'END:VCALENDAR');

    return lines.join('\r\n');
};

// No OAuth/API call — just the plain "render" URL Google Calendar accepts
// for pre-filling an event, so the frontend can offer an "Add to Google
// Calendar" link without any server-side calendar integration.
const buildGoogleCalendarUrl = ({ title, description, location, startDateTime, endDateTime }) => {
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: title || '',
        dates: `${toIcsDate(startDateTime)}/${toIcsDate(endDateTime)}`,
        details: description || '',
        location: location || '',
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

module.exports = { buildIcs, buildGoogleCalendarUrl };
