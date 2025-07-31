# Event Management API

## Setup Instructions

1. Prerequisites:
   - Node.js (v14+)
   - PostgreSQL (v12+)
   - npm

2. Installation:

   git clone 
   cd event-management-task
   npm install

3. Create A PostgreSQL Database Locally

4. Create .env file with these contents 

    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_HOST=localhost
    DB_PORT=5432
    DB=your_db_name
    PORT=8000

5. Run the server
    Command - nodemon index.js / node index.js

API Description
Events
POST /create-event: Create a new event
GET /get-event/:eventId: Get event details
GET /upcoming-events: List upcoming events (sorted by date then location)
GET /event-stats/:eventId: Get event statistics

Registrations
POST /register-user/:eventId: Register user for event
DELETE /cancel-registration/:eventId: Cancel user registration

Example Request and Reponses

REQUEST:
POST /create-event
Content-Type: application/json

{
  "title": "Tech Conference",
  "date": "2023-12-15",
  "time": "09:00",
  "location": "Convention Center",
  "capacity": 500
}
RESPONSE:
{
  "success": true,
  "eventId": 5,
  "message": "Event created successfully"
}