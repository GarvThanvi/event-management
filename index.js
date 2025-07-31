import express from "express";
import "dotenv/config";

import {
  createEvent,
  getEventDetails,
  registerUserForEvent,
} from "./event.controller.js";

const app = express();
const PORT = 8000;

app.use(express.json());

app.post("/create-event", createEvent);
app.get("/get-event/:eventId", getEventDetails);
app.post("/register-user/:eventId", registerUserForEvent);

app.listen(PORT, () => {
  console.log(`Server Running on Port ${PORT}`);
});
