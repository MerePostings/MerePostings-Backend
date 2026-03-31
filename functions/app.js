const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();

const authRoutes = require('./routes/authRoutes')
const userRoutes = require('./routes/userRoutes')

const handleError = require('./middlewares/errorHandler')

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://mere-posting-staging.web.app",
    ],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/v1/auth', authRoutes)
app.use('/v1/user', userRoutes)

app.use(handleError);

module.exports = app;
