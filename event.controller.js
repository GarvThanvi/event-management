import pool from "./db.js";

export const createEvent = async (req, res) => {
  const client = await pool.connect();
  const insertQuery =
    "INSERT INTO events (title, date_time, location, capacity) VALUES ($1, $2, $3, $4) RETURNING id";
  try {
    await client.query("BEGIN");
    const { title, date, time, location, capacity } = req.body;
    const eventDateTime = new Date(`${date}T${time}:00`);
    const now = new Date();

    //Validate data
    if (!title || !date || !time || !location || !capacity) {
      return res.status(400).json({
        success: false,
        message: "Missing entry in form fields",
      });
    }

    if (capacity > 1000 || capacity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Capacity must be less than or equal to 1000",
      });
    }

    if (eventDateTime < now) {
      return res.status(400).json({
        success: false,
        message: "Event date and time must be in the future.",
      });
    }

    const result = await client.query(insertQuery, [
      title,
      eventDateTime,
      location,
      capacity,
    ]);
    const newEventId = result.rows[0].id;

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      eventId: newEventId,
      message: "Event creatred successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error while creating event ", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating event",
    });
  }
};

export const getEventDetails = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res
        .status(400)
        .json({ success: false, message: "No event Id provided" });
    }

    
  } catch (error) {}
};

export const registerUserForEvent = async (req, res) => {
  const client = await pool.connect();
  const eventDataQuery = "SELECT * FROM events WHERE id = $1";
  const chekcRegistrationQuery =
    "SELECT * FROM event_registrations WHERE event_id = $1 AND user_id = $2";
  const registrationQuery =
    "INSERT INTO event_registrations (event_id ,user_id) VALUES ($1, $2)";
  const capacityQuery =
    "SELECT COUNT(*) AS NoOfUsers FROM event_registrations WHERE event_id = $1";
  try {
    await client.query("BEGIN");
    const { eventId } = req.params;
    const { userId } = req.body;

    const eventResult = await client.query(eventDataQuery, [eventId]);
    const eventData = eventResult.rows[0];

    const now = new Date();
    //Checking if event is in past
    if (eventData.date_time < now) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot register for past events" });
    }

    //Check if capacity is left
    const eventCapacity = await client.query(capacityQuery, [eventId]);
    if (eventCapacity.rows[0].noofusers == eventData.capacity) {
      return res.status(409).json({
        success: false,
        message: "Cannot register more users, event capacity is full",
      });
    }

    //Check if user hasn't already registered
    const registrationResult = await client.query(chekcRegistrationQuery, [
      eventId,
      userId,
    ]);

    if (registrationResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "User is already registered in this event",
      });
    }

    //Inserting new user registration to database
    await client.query(registrationQuery, [eventId, userId]);
    await client.query("COMMIT");
    return res.status(200).json({
      success: true,
      message: "User successfully registered for the event",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error while registering user for event", error);
    return res.status(500).json({
      success: false,
      message: "Server error while registering to the event",
    });
  }
};
