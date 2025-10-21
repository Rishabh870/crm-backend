import Event from '../models/Event.js';
import { calendar } from "../utils/googleClient.js";
// export const createEvent = async (req, res) => {
//   try {
//     const event = new Event(req.body);
//     await event.save();
//     res.status(201).json(event);
//   } catch (error) {
//     res.status(400).json({ error: 'Failed to create event' });
//   }
// };

export const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      start,
      end,
      color,
      allDay,
      userId,
      generateMeet,
    } = req.body;

    let meetingLink = null;

    if (generateMeet) {
      const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: title,
          description,
          start: {
            dateTime: new Date(start).toISOString(),
            timeZone: "Asia/Kolkata"
          },
          end: {
            dateTime: new Date(end).toISOString(),
            timeZone: "Asia/Kolkata"
          },

          conferenceData: {
            createRequest: {
              requestId: `${Date.now()}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        },
        conferenceDataVersion: 1,
      });

      meetingLink = response?.data?.hangoutLink || null;
    }

    const event = new Event({
      title,
      description,
      start,
      end,
      allDay,
      userId,
      color,
      meetingLink,
    });

    await event.save();
    res.status(201).json(event);
  } catch (error) {
    console.error("Create Event Error:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
};
export const getUserEvents = async (req, res) => {
  try {
    const events = await Event.find({ userId: req.params.userId });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.eventId);
    res.json({ message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.eventId, req.body, { new: true });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event' });
  }
};
export const getTodayEventsCount = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow

    const eventsCount = await Event.countDocuments({
      start: { $gte: today, $lt: tomorrow }
    });

    res.status(200).json({ eventsToday: eventsCount });
  } catch (error) {
    console.error('Error fetching today\'s events count:', error);
    res.status(500).json({ message: 'Server error while fetching today\'s events count', error: error.message });
  }
};