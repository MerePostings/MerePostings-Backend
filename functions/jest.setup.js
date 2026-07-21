const path = require("path");

process.env.NODE_ENV = "test";
process.env.SIGNATURE = path.join(__dirname, "__fixtures__", "fake-service-account.json");
process.env.STORAGEBUCKET = "test-project.appspot.com";
process.env.STRIPE_SECRET_KEY = "sk_test_fake";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_fake";
process.env.POSTMARK_SERVER_TOKEN = "fake-postmark-token";
process.env.BASE_FEE_CENTS = "9900";
process.env.ADMIN_FEE_CENTS = "2500";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.EMAILUSER = "no-reply@test.local";
