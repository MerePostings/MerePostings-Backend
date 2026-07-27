// Manual mock for config/stripe.js. The real module exports the stripe
// instance directly (module.exports = stripe), so this mirrors that shape.

const constructEvent = jest.fn();
const paymentIntentsCreate = jest.fn();
const paymentIntentsRetrieve = jest.fn();
const refundsCreate = jest.fn();
const customersCreate = jest.fn();

const stripe = {
  webhooks: {constructEvent},
  paymentIntents: {create: paymentIntentsCreate, retrieve: paymentIntentsRetrieve},
  refunds: {create: refundsCreate},
  customers: {create: customersCreate},
};

module.exports = stripe;
