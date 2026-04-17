require("dotenv").config();
const { db } = require("../config/db");
const AppError = require("../utils/AppError");
const { calendar, calendarId } = require("../config/googleOAuth");
const { formatTime } = require("../utils/formatDate");
const { meetingScheduled } = require("./mailService");
const { DateTime } = require("luxon");

const timeZone = "America/Toronto";

const googleFunctionsService = {
  
	getGoogleCalendar: async (req, res) => {
    try {
      const response = await calendar.events.list({
        calendarId: calendarId,
        timeMin: new Date().toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: "startTime",
      });

      if (!response || !response.data) {
        console.error("No response data from Google Calendar API");
        throw new AppError("Invalid response from Google Calendar", 500);
      }

      console.log("Calendar response:", response.data);
      res.json(response.data);
    } catch (err) {
      console.error("Calendar API error:", err);
      console.error("Error details:", err.message);
      console.error("Error code:", err.code);
      throw new AppError("Failed to fetch calendars", 500);
    }
  },

  createCalendarEvent: async (startDateTime, date, time, month, year, userID) => {
    try {
      const userRef = db.collection("users").doc(userID);
      const userDoc = await userRef.get();

      if (!userDoc.exists) throw new AppError("User not found", 400);

      if (userDoc.data().lastMeeting) {
        const lastMeetingDate = DateTime.fromJSDate(userDoc.data().lastMeeting.toDate());
        const oneDayAgo = DateTime.now().minus({ days: 1 });

        if (lastMeetingDate > oneDayAgo) {
          throw new AppError(
            "You have already booked a meeting with us today. If you would like to book another meeting, please contact us at support@commercialxclusive.com",
            400
          );
        }
      }

      const startDate = DateTime.fromISO(startDateTime, { zone: timeZone });

      if (startDate < DateTime.now().setZone(timeZone)) {
        throw new AppError("Cannot book a time slot in the past", 400);
      }

      const endDate = startDate.plus({ hours: 1 });

      const email = userDoc.data().email;
      const name = userDoc.data().firstName;
      const link = "https://us05web.zoom.us/j/84438162721?pwd=nCQ79HCGtLcWAGRaldLwNJCN4ZDQaK.1";
      const humanDate = `${month}/${date}/${year}`;

      const existingEvents = await calendar.events.list({
        calendarId,
        timeMin: startDate.toISO(),
        timeMax: endDate.toISO(),
        singleEvents: true,
        orderBy: "startTime",
      });

      if (existingEvents.data.items.length > 0) {
        throw new AppError("Time slot already booked", 409);
      }

      const event = {
        summary: `Commercial Xclusive meeting with ${email}`,
        start: {
          dateTime: startDate.toISO(),
          timeZone,
        },
        end: {
          dateTime: endDate.toISO(),
          timeZone,
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 1440 },
            { method: "popup", minutes: 10 },
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
        conferenceDataVersion: 1,
        sendUpdates: "all",
      });

      await userRef.update({ lastMeeting: DateTime.now().toJSDate() });
      await meetingScheduled(email, name, humanDate, time, link);
      return response.data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.log(error);
      throw new AppError("Failed to add booking. Please try again later.", 500);
    }
  },

  checkMonthAvailability: async (year, month) => {
    try {
      if (!year || !month) {
        throw new AppError("Year and month are required", 400);
      }

      const startOfMonth = DateTime.fromObject({ year, month, day: 1 }, { zone: timeZone });
      const endOfMonth = startOfMonth.endOf("month");

      const response = await calendar.events.list({
        calendarId,
        timeMin: startOfMonth.toISO(),
        timeMax: endOfMonth.toISO(),
        singleEvents: true,
        orderBy: "startTime",
      });

      if (!response || !response.data) {
        throw new AppError("Invalid response from Google Calendar", 500);
      }

      const events = response.data.items || [];
      const daysInMonth = endOfMonth.day;
      const unbookableDays = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = DateTime.fromObject({ year, month, day }, { zone: timeZone });
        const dateString = currentDate.toISODate();

        const dayEvents = events.filter((event) => {
          const eventStart = DateTime.fromISO(event.start.dateTime || event.start.date, { zone: timeZone });
          return eventStart.toISODate() === dateString;
        });

        if (dayEvents.length > 7) {
          unbookableDays.push({
            date: dateString,
            day,
            dayOfWeek: currentDate.toFormat("cccc"),
            bookable: false,
          });
        }
      }

      return {
        year: parseInt(year),
        month: parseInt(month),
        monthName: startOfMonth.toFormat("LLLL"),
        days: unbookableDays,
      };
    } catch (err) {
      console.error("Month availability check error:", err);
      throw new AppError("Failed to check month availability", 500);
    }
  },

  checkDayAvailability: async (year, month, day) => {
    try {
      if (!year || !month || !day) {
        throw new AppError("Year, month, and day are required", 400);
      }

      const startOfDay = DateTime.fromObject({ year, month, day, hour: 9 }, { zone: timeZone });
      const endOfDay = DateTime.fromObject({ year, month, day, hour: 17 }, { zone: timeZone });

      const response = await calendar.events.list({
        calendarId,
        timeMin: startOfDay.toISO(),
        timeMax: endOfDay.toISO(),
        singleEvents: true,
        orderBy: "startTime",
      });

      if (!response || !response.data) {
        throw new AppError("Invalid response from Google Calendar", 500);
      }

      const events = response.data.items || [];

      const bookedSlots = events.map((event) => ({
        start: DateTime.fromISO(event.start.dateTime || event.start.date, { zone: timeZone }),
        end: DateTime.fromISO(event.end.dateTime || event.end.date, { zone: timeZone }),
      }));

      const allPossibleSlots = [];
      for (let hour = 9; hour < 17; hour++) {
        const slotStart = DateTime.fromObject({ year, month, day, hour }, { zone: timeZone });
        const slotEnd = DateTime.fromObject({ year, month, day, hour: hour + 1 }, { zone: timeZone });
        allPossibleSlots.push({ start: slotStart, end: slotEnd });
      }

      const now = DateTime.now().setZone(timeZone);

      const availableSlots = allPossibleSlots
        .filter((slot) => {
          const isPast = slot.start < now;
          return (
            !isPast &&
            !bookedSlots.some((booked) => slot.start < booked.end && slot.end > booked.start)
          );
        })
        .map((slot) => ({
          start: slot.start.toISO(),
          end: slot.end.toISO(),
          startTime: formatTime(slot.start.toJSDate()),
          endTime: formatTime(slot.end.toJSDate()),
        }));

      return {
        date: startOfDay.toISODate(),
        dayOfWeek: startOfDay.toFormat("cccc"),
        businessHours: { start: "9:00 AM", end: "5:00 PM" },
        availableSlots,
        totalAvailableSlots: availableSlots.length,
        fullyBooked: availableSlots.length === 0,
      };
    } catch (err) {
      console.error("Day availability check error:", err);
      throw new AppError("Failed to check day availability", 500);
    }
  },
};

module.exports = googleFunctionsService;