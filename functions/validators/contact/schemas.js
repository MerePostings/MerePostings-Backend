const {z} = require("zod");
const {emailSchema} = require("../shared/email");

// Same list as the Contact us page in Mere-Postings-FE.
const CONTACT_TOPICS = [
  "My listing",
  "Listing changes",
  "Offers / negotiations",
  "Documents / forms",
  "Showing questions",
  "Deposit / transaction questions",
  "Technical help",
  "Before I start my listing",
  "Other",
];

const contactInquirySchema = z.strictObject({
  name: z.string().trim().min(1, "Please enter your name").max(200),
  email: z.string().trim().pipe(emailSchema()),
  topic: z.enum(CONTACT_TOPICS, {message: "Please choose a topic"}),
  message: z.string().trim().min(1, "Please enter a message").max(5000),
});

module.exports = {contactInquirySchema, CONTACT_TOPICS};
