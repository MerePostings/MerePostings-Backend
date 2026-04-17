const formatDate = (dateInput) => {
    if (!dateInput) return null;
    let date;
    if (dateInput.toDate) {
        date = dateInput.toDate();
    } else if (typeof dateInput === 'string') {
        date = new Date(dateInput);
    } else if (dateInput instanceof Date) {
        date = dateInput;
    } else if (typeof dateInput === 'number') {
        date = new Date(dateInput);
    } else {
        return null;
    }
    if (isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    }).format(date);
};

function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Toronto'
    });
}


const convertTo24Hour = (time) => {
  const [timePart, modifier] = time.split(" ");
  let [hours, minutes] = timePart.split(":").map(Number);

  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
};

const buildISODateTime = (
    year,
    month,
    day,
    timeRange,
    timezoneOffset = "-05:00"
) => {
    const startTime = timeRange.split(" - ")[0];
    const time24 = convertTo24Hour(startTime);

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0"
    )}T${time24}${timezoneOffset}`;
};

export {
    formatDate,
    formatTime,
    buildISODateTime
}