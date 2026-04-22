const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();

const authRoutes = require('./routes/authRoutes')
const userRoutes = require('./routes/userRoutes')
const propertyRoutes = require('./routes/propertyRoutes')
const scheduleRoutes = require('./routes/scheduleRoutes')
const adminRoutes = require('./routes/adminRoutes')
const stripeWebhookRoutes = require('./routes/stripeWebhookRoutes')

const handleError = require('./middlewares/errorHandler')

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://mere-posting-staging.web.app",
      "https://mere-postings-admin-staging.web.app",
    ],
    credentials: true,
  })
);

app.use("/v1/webhook", stripeWebhookRoutes);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/v1/auth', authRoutes)
app.use('/v1/user', userRoutes)
app.use('/v1/property', propertyRoutes)
app.use('/v1/schedule', scheduleRoutes)
app.use('/v1/admin', adminRoutes)

app.use(handleError);

module.exports = app;
