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
  } finally {
    client.release();
  }
};

export const getEventDetails = async (req, res) => {
  const client = await pool.connect();
  const getEventQuery = "SELECT * FROM events WHERE id = $1";
  const getUserIdQuery =
    "SELECT user_id FROM event_registrations WHERE event_id = $1";
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res
        .status(400)
        .json({ success: false, message: "No event Id provided" });
    }

    //Fetch event details
    const eventResult = await client.query(getEventQuery, [eventId]);

    if (eventResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No such event found" });
    }

    const eventData = eventResult.rows[0];

    //Fetch all user Ids registered to the event
    const getUserIdResult = await client.query(getUserIdQuery, [eventId]);
    const userIds = getUserIdResult.rows;

    const userInfo = await getUserDetails(userIds);

    return res.status(201).json({
      success: true,
      message: "Event data successfully fetched",
      event: eventData,
      users: userInfo,
    });
  } catch (error) {
    console.error("Error fetching event details", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching event details",
    });
  } finally {
    client.release();
  }
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
  } finally {
    client.release();
  }
};

export const cancelRegistration = async (req, res) => {
  const client = await pool.connect();
  const chekcRegistrationQuery =
    "SELECT * FROM event_registrations WHERE user_id = $1 AND event_id = $2";
  const DeleteQuery =
    "DELETE FROM event_registrations WHERE user_id = $1 AND event_id = $2";
  try {
    await client.query("BEGIN");
    const { eventId } = req.params;
    const { userId } = req.body;

    if (!eventId || !userId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing eventId or userId" });
    }

    //Check if user is not registered and no entry for that userId and eventId exists
    const registrationResult = await client.query(chekcRegistrationQuery, [
      userId,
      eventId,
    ]);
    if (registrationResult.rows.length == 0) {
      return res.status(404).json({
        success: false,
        message: "User has not registered for this event",
      });
    }

    //Delete the Registration
    await client.query(DeleteQuery, [userId, eventId]);
    await client.query("COMMIT");

    return res
      .status(200)
      .json({ success: true, message: "Registration cancelled successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error while cancelling registration ", error);
    return res.status(500).json({
      success: false,
      message: "Server error while cancelling registration",
    });
  } finally {
    client.release();
  }
};

export const listUpcomingEvents = async (req, res) => {
  const client = await pool.connect();
  const upcomingEventsQuery = `
    SELECT * FROM events 
    WHERE date_time > NOW() 
    ORDER BY date_time ASC, location ASC
  `;

  try {
    const result = await client.query(upcomingEventsQuery);

    return res.status(200).json({
      success: true,
      message: "Upcoming events fetched successfully",
      events: result.rows,
    });
  } catch (error) {
    console.error("Error while fetching upcoming events", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching upcoming events",
    });
  } finally {
    client.release();
  }
};

export const getEventStats = async (req, res) => {
  const client = await pool.connect();
  const eventQuery = "SELECT capacity FROM events WHERE id = $1";
  const registrationsCountQuery = `
    SELECT COUNT(*) AS registration_count 
    FROM event_registrations 
    WHERE event_id = $1
  `;

  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "No event ID provided",
      });
    }

    // Get event capacity
    const eventResult = await client.query(eventQuery, [eventId]);

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const capacity = eventResult.rows[0].capacity;

    // Get registration count
    const registrationsResult = await client.query(registrationsCountQuery, [
      eventId,
    ]);
    const registrationCount = parseInt(
      registrationsResult.rows[0].registration_count,
      10
    );

    // Calculate stats
    const remainingCapacity = capacity - registrationCount;
    const percentageUsed = (registrationCount / capacity) * 100;

    return res.status(200).json({
      success: true,
      message: "Event stats fetched successfully",
      stats: {
        totalRegistrations: registrationCount,
        remainingCapacity,
        percentageUsed: percentageUsed.toFixed(2), 
        totalCapacity: capacity,
      },
    });
  } catch (error) {
    console.error("Error while fetching event stats", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching event stats",
    });
  } finally {
    client.release();
  }
};

//Helper function
const getUserDetails = async (registrations) => {
  try {
    const userDetails = await Promise.all(
      registrations.map(async ({ user_id }) => {
        const result = await pool.query(
          "SELECT name, email FROM users WHERE id = $1",
          [user_id]
        );
        return result.rows[0];
      })
    );

    return userDetails;
  } catch (err) {
    console.error("Error fetching user details:", err);
    throw err;
  }
};
