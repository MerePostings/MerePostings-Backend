const postmark = require("postmark");

const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);

const sendVerificationEmail = async (
  email,
  emailVerificationLink,
  firstName
) => {
  client.sendEmail({
    from: `${process.env.EMAILUSER}`,
    to: `${email}`,
    Subject: "Verify your email address",
    HtmlBody: `
      <!doctype html>
      <html lang="und" dir="auto" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
          <head>
          <title></title>
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">

          <link href="https://fonts.googleapis.com/css?family=Playfair+Display:400,500,600,700" rel="stylesheet" type="text/css">
          <link href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,500,700" rel="stylesheet" type="text/css">

          <style type="text/css">
              #outlook a {
                  padding: 0;
              }

              body {
                  margin: 0;
                  padding: 0;
                  -webkit-text-size-adjust: 100%;
                  -ms-text-size-adjust: 100%;
              }

              table,
              td {
                  border-collapse: collapse;
                  width: 100%;
              }

              img {
                  border: 0;
                  height: auto;
                  line-height: 100%;
                  width: 120px !important;
                  object-fit: contain;
                  height: 120px !important;
                  outline: none;
                  text-decoration: none;
                  -ms-interpolation-mode: bicubic;
              }

              p {
                  display: block;
                  margin: 13px 0;
              }

              .hp-nav__logo {
                  font-family: 'Playfair Display', serif;
                  font-size: 35px;
                  font-weight: 600;
                  color: #ffffff;
                  letter-spacing: 0.02em;
                  text-decoration: none !important;
              }

              .hp-nav__logo span {
                  color: #154360;
              }

              .logo {
                  font-size: large;
                  text-decoration: none;
              }
          </style>

          <!-- Fixed broken @import -->
          <style type="text/css">
              @import ur[](https://fonts.googleapis.com/css?family=Open+Sans:300,400,500,700);
          </style>

          <style type="text/css">
              @media only screen and (min-width:480px) {
                  .mj-column-per-100 {
                      width: 100% !important;
                      max-width: 100%;
                  }
              }
          </style>

          <style media="screen and (min-width:480px)">
              .moz-text-html .mj-column-per-100 {
                  width: 100% !important;
                  max-width: 100%;
              }
          </style>

          <style type="text/css">
              @media only screen and (max-width:479px) {
                  table.mj-full-width-mobile {
                      width: 100% !important;
                  }
                  td.mj-full-width-mobile {
                      width: auto !important;
                  }
              }
          </style>
          </head>

          <body style="word-spacing:normal;background-color:#F4F4F4;">
          <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">Welcome to Mere Postings - Your Ultimate Real Estate Listing Spot</div>

          <div style="background-color:#F4F4F4;" lang="und" dir="auto">
              <div style="background:#7a8c6e;background-color:#7a8c6e;margin:0px auto;max-width:600px;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#7a8c6e;background-color:#7a8c6e;width:100%;">
                  <tbody>
                  <tr>
                      <td style="direction:ltr;font-size:0px;padding:20px 0;text-align:center;">
                      <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                          <tbody>
                              <tr>
                              <td align="center" style="font-size:0px;padding:0;word-break:break-word;">
                                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
                                  <tbody>
                                      <tr>
                                      <td align="center" class="logo" style="padding:0;">
                                          <a href="${process.env.FRONTEND_URL}" 
                                            class="hp-nav__logo" 
                                            style="text-decoration: none !important; color: #ffffff; font-family: 'Playfair Display', serif; font-size: 35px; font-weight: 600; letter-spacing: 0.02em;">
                                              <span>Mere</span>Postings
                                          </a>
                                      </td>
                                      </tr>
                                  </tbody>
                                  </table>
                              </td>
                              </tr>
                          </tbody>
                          </table>
                      </div>
                      </td>
                  </tr>
                  </tbody>
              </table>
            </div>

              <div style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:600px;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;">
                  <tbody>
                  <tr>
                      <td style="direction:ltr;font-size:0px;padding:30px 20px;text-align:center;">
                      <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                          <tbody>
                              <tr>
                              <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                                  <div style="font-family: sans-serif;font-size:20px;line-height:1;text-align:center;color:#333333;">Welcome, ${firstName}! to Mere Postings</div>
                              </td>
                              </tr>
                              <tr>
                              <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                                  <div style="font-family:'Open Sans', sans-serif;font-size:16px;line-height:1;text-align:center;color:#777777;">Your Real Estate Solution!</div>
                              </td>
                              </tr>
                          </tbody>
                          </table>
                      </div>
                      </td>
                  </tr>
                  </tbody>
              </table>
              </div>

              <div style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:600px;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;">
                  <tbody>
                  <tr>
                      <td style="direction:ltr;font-size:0px;padding:20px 20px;text-align:center;">
                      <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                          <tbody>
                              <tr>
                                  <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                                      <div style="font-family:'Open Sans', sans-serif;font-size:14px;line-height:1;text-align:left;color:#696C72;">It's a pleasure to have you here! In order to activate your account with us, please click the button below.</div>
                                  </td>
                              </tr>
                          </tbody>
                          </table>
                      </div>
                      </td>
                  </tr>
                  </tbody>
              </table>
              </div>

              <div style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:600px;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;">
                  <tbody>
                  <tr>
                      <td style="direction:ltr;font-size:0px;padding:20px 0;text-align:center;">
                      <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0;line-height:0;text-align:left;display:inline-block;width:100%;direction:ltr;">
                          <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                              <tbody>
                              <tr>
                                  <td align="center" style="font-size:0px;padding:15px 30px;word-break:break-word;">
                                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
                                      <tbody>
                                      <tr>
                                          <td align="center" role="presentation" style="border:none;border-radius:5px;cursor:auto;mso-padding-alt:10px 25px;background:transparent;" valign="middle">
                                          <a href="${emailVerificationLink}" 
                                            style="display:inline-block;background:transparent;color:#154360;border:2px solid #154360;font-family:'Open Sans', Helvetica, Arial, sans-serif;font-size:16px;font-weight:600;line-height:120%;margin:0;text-decoration:none;text-transform:none;padding:10px 30px;border-radius:5px;" 
                                            target="_blank">Verify My Email</a>
                                          </td>
                                      </tr>
                                      </tbody>
                                  </table>
                                  </td>
                              </tr>
                              </tbody>
                          </table>
                          </div>
                      </div>
                      </td>
                  </tr>
                  </tbody>
              </table>
              </div>

              <div style="background:#7a8c6e;background-color:#7a8c6e;margin:0px auto;max-width:600px;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#7a8c6e;background-color:#7a8c6e;width:100%;">
                  <tbody>
                  <tr>
                      <td style="direction:ltr;font-size:0px;padding:20px;text-align:center;">
                      <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                            <tbody>
                                <tr>
                                <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                                    <div style="font-family:'Open Sans', sans-serif;font-size:12px;line-height:1;text-align:center;color:#e9e9e9;">This is an auto-generated email. Please do not reply to this message. For help with any questions about your Mere Postings account, please contact us here.</div>
                                </td>
                                </tr>
                                <tr>
                                <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                                    <div style="font-family:'Open Sans', sans-serif;font-size:12px;line-height:1;text-align:center;color:#e9e9e9;">&copy; 2025 Mere Postings. All rights reserved.</div>
                                </td>
                                </tr>
                            </tbody>
                          </table>
                      </div>
                      </td>
                  </tr>
                  </tbody>
              </table>
              </div>
          </div>
          </body>
      </html>`,
      MessageStream: "notifications"
    });
};

const sendPaymentConfirmationEmail = async (
  email,
  firstName,
  amountPaid,
  listingLink
) => {
  client.sendEmail({
    from: `${process.env.EMAILUSER}`,
    to: `${email}`,
    Subject: "Payment Confirmation - Your Listing is Now Active",
    HtmlBody: `
      <!doctype html>
      <html lang="und" dir="auto" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
          <head>
          <title></title>
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">

          <link href="https://fonts.googleapis.com/css?family=Playfair+Display:400,500,600,700" rel="stylesheet" type="text/css">
          <link href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,500,700" rel="stylesheet" type="text/css">

          <style type="text/css">
              #outlook a {
                  padding: 0;
              }

              body {
                  margin: 0;
                  padding: 0;
                  -webkit-text-size-adjust: 100%;
                  -ms-text-size-adjust: 100%;
              }

              table,
              td {
                  border-collapse: collapse;
                  width: 100%;
              }

              img {
                  border: 0;
                  height: auto;
                  line-height: 100%;
                  width: 120px !important;
                  object-fit: contain;
                  height: 120px !important;
                  outline: none;
                  text-decoration: none;
                  -ms-interpolation-mode: bicubic;
              }

              p {
                  display: block;
                  margin: 13px 0;
              }

              .hp-nav__logo {
                  font-family: 'Playfair Display', serif;
                  font-size: 35px;
                  font-weight: 600;
                  color: #ffffff;
                  letter-spacing: 0.02em;
                  text-decoration: none !important;
              }

              .hp-nav__logo span {
                  color: #154360;
              }

              .logo {
                  font-size: large;
                  text-decoration: none;
              }
          </style>


          <style type="text/css">
              @import ur[](https://fonts.googleapis.com/css?family=Open+Sans:300,400,500,700);
          </style>

          <style type="text/css">
              @media only screen and (min-width:480px) {
                  .mj-column-per-100 {
                      width: 100% !important;
                      max-width: 100%;
                  }
              }
          </style>

          <style media="screen and (min-width:480px)">
              .moz-text-html .mj-column-per-100 {
                  width: 100% !important;
                  max-width: 100%;
              }
          </style>

          <style type="text/css">
              @media only screen and (max-width:479px) {
                  table.mj-full-width-mobile {
                      width: 100% !important;
                  }
                  td.mj-full-width-mobile {
                      width: auto !important;
                  }
              }
          </style>
          </head>

          <body style="word-spacing:normal;background-color:#F4F4F4;">
          <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">Payment Confirmation - Your Mere Postings Listing is Now Live</div>

          <div style="background-color:#F4F4F4;" lang="und" dir="auto">
              <!-- HEADER - Mere Postings Green -->
              <div style="background:#7a8c6e;background-color:#7a8c6e;margin:0px auto;max-width:600px;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#7a8c6e;background-color:#7a8c6e;width:100%;">
                  <tbody>
                  <tr>
                      <td style="direction:ltr;font-size:0px;padding:20px 0;text-align:center;">
                      <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                          <tbody>
                              <tr>
                              <td align="center" style="font-size:0px;padding:0;word-break:break-word;">
                                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
                                  <tbody>
                                      <tr>
                                      <td align="center" class="logo" style="padding:0;">
                                          <a href="${process.env.FRONTEND_URL}" 
                                            class="hp-nav__logo" 
                                            style="text-decoration: none !important; color: #ffffff; font-family: 'Playfair Display', serif; font-size: 35px; font-weight: 600; letter-spacing: 0.02em;">
                                              <span>Mere</span>Postings
                                          </a>
                                      </td>
                                      </tr>
                                  </tbody>
                                  </table>
                              </td>
                              </tr>
                          </tbody>
                          </table>
                      </div>
                      </td>
                  </tr>
                  </tbody>
              </table>
            </div>

              <div style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:600px;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;">
                  <tbody>
                  <tr>
                      <td style="direction:ltr;font-size:0px;padding:30px 20px;text-align:center;">
                      <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                          <tbody>
                              <tr>
                              <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                                  <div style="font-family: sans-serif;font-size:28px;line-height:1;text-align:center;color:#333333;">Payment Confirmation</div>
                              </td>
                              </tr>
                              <tr>
                              <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                                  <div style="font-family:'Open Sans', sans-serif;font-size:16px;line-height:1;text-align:center;color:#777777;">Thank you for your purchase!</div>
                              </td>
                              </tr>
                          </tbody>
                          </table>
                      </div>
                      </td>
                  </tr>
                  </tbody>
              </table>
              </div>

              <div style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:600px;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;">
                    <tbody>
                    <tr>
                        <td style="direction:ltr;font-size:0px;padding:20px 20px;text-align:center;">
                        <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                            <tbody>

                                <!-- Greeting -->
                                <tr>
                                <td align="left" style="font-size:0px;padding:10px 25px 6px 25px;word-break:break-word;">
                                    <div style="font-family:'Open Sans', sans-serif;font-size:18px;font-weight:600;line-height:1;text-align:left;color:#333333;">
                                    Hello, ${firstName}!
                                    </div>
                                </td>
                                </tr>

                                <!-- Body text -->
                                <tr>
                                <td align="left" style="font-size:0px;padding:6px 25px 10px 25px;word-break:break-word;">
                                    <div style="font-family:'Open Sans', sans-serif;font-size:14px;font-weight:400;line-height:1.6;text-align:left;color:#555555;">
                                    Your payment was received and your listing is now being reviewed. We'll have everything ready shortly — sit back and let us take it from here.
                                    </div>
                                </td>
                                </tr>

                                <!-- CTA Button -->
                                <tr>
                                <td align="center" style="font-size:0px;padding:25px 30px;word-break:break-word;">
                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
                                    <tbody>
                                        <tr>
                                        <td align="center" role="presentation" style="border:none;border-radius:5px;cursor:auto;mso-padding-alt:10px 25px;background:transparent;" valign="middle">
                                            <a href="${listingLink}"
                                            style="display:inline-block;background:transparent;color:#154360;border:2px solid #154360;font-family:'Open Sans', Helvetica, Arial, sans-serif;font-size:16px;font-weight:600;line-height:120%;margin:0;text-decoration:none;text-transform:none;padding:12px 32px;border-radius:5px;"
                                            target="_blank">View Your Listing</a>
                                        </td>
                                        </tr>
                                    </tbody>
                                    </table>
                                </td>
                                </tr>

                            </tbody>
                            </table>
                        </div>
                        </td>
                    </tr>
                    </tbody>
                </table>
            </div>

              <div style="background:#7a8c6e;background-color:#7a8c6e;margin:0px auto;max-width:600px;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#7a8c6e;background-color:#7a8c6e;width:100%;">
                  <tbody>
                  <tr>
                      <td style="direction:ltr;font-size:0px;padding:20px;text-align:center;">
                      <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                            <tbody>
                                <tr>
                                <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                                    <div style="font-family:'Open Sans', sans-serif;font-size:12px;line-height:1;text-align:center;color:#e9e9e9;">
                                        This is an auto-generated email. Please do not reply to this message. 
                                        For help with any questions about your Mere Postings account, please contact us at 
                                        <a href="mailto:support@torontorealestaterealty.com" style="color:#e9e9e9;text-decoration:none;">support@torontorealestaterealty.com</a>.
                                    </div>
                                </td>
                                </tr>
                                <tr>
                                <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                                    <div style="font-family:'Open Sans', sans-serif;font-size:12px;line-height:1;text-align:center;color:#e9e9e9;">© 2025 Mere Postings. All rights reserved.</div>
                                </td>
                                </tr>
                            </tbody>
                          </table>
                      </div>
                      </td>
                  </tr>
                  </tbody>
              </table>
              </div>
          </div>
          </body>
      </html>`,
      MessageStream: "notifications"
    });
};

const meetingScheduled = async (email, name, date, time, link) => {
  client.sendEmail({
    From: `${process.env.EMAILUSER}`,
    To: `${email}`,
    Subject: `Your Meeting Has Been Scheduled`,
    HtmlBody: `
      <!doctype html>
      <html lang="und" dir="auto" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
          <title></title>
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">

          <link href="https://fonts.googleapis.com/css?family=Playfair+Display:400,500,600,700" rel="stylesheet" type="text/css">
          <link href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,500,700" rel="stylesheet" type="text/css">

          <style type="text/css">
            #outlook a { padding: 0; }
            body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
            table, td { border-collapse: collapse; width: 100%; }
            img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
            p { display: block; margin: 13px 0; }
            .hp-nav__logo {
              font-family: 'Playfair Display', serif;
              font-size: 35px;
              font-weight: 600;
              color: #ffffff;
              letter-spacing: 0.02em;
              text-decoration: none !important;
            }
            .hp-nav__logo span { color: #154360; }
          </style>

          <style type="text/css">
            @media only screen and (min-width:480px) {
              .mj-column-per-100 { width: 100% !important; max-width: 100%; }
            }
          </style>
          <style media="screen and (min-width:480px)">
            .moz-text-html .mj-column-per-100 { width: 100% !important; max-width: 100%; }
          </style>
          <style type="text/css">
            @media only screen and (max-width:479px) {
              table.mj-full-width-mobile { width: 100% !important; }
              td.mj-full-width-mobile { width: auto !important; }
            }
          </style>
        </head>

        <body style="word-spacing:normal;background-color:#F4F4F4;">
          <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">Your meeting has been scheduled</div>

          <div style="background-color:#F4F4F4;" lang="und" dir="auto">
            <div style="background:#7a8c6e;background-color:#7a8c6e;margin:0px auto;max-width:600px;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#7a8c6e;background-color:#7a8c6e;width:100%;">
                <tbody>
                  <tr>
                    <td style="direction:ltr;font-size:0px;padding:20px 0;text-align:center;">
                      <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                          <tbody>
                            <tr>
                              <td align="center" style="font-size:0px;padding:0;word-break:break-word;">
                                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
                                  <tbody>
                                    <tr>
                                      <td align="center" style="padding:0;">
                                        <a href="${process.env.FRONTEND_URL}"
                                          class="hp-nav__logo"
                                          style="text-decoration: none !important; color: #ffffff; font-family: 'Playfair Display', serif; font-size: 35px; font-weight: 600; letter-spacing: 0.02em;">
                                          <span>Mere</span>Postings
                                        </a>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:600px;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;">
                <tbody>
                  <tr>
                    <td style="direction:ltr;font-size:0px;padding:30px 20px;text-align:center;">
                      <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                          <tbody>
                            <tr>
                              <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                                <div style="font-family:'Playfair Display', serif;font-size:28px;line-height:1;text-align:center;color:#333333;">Meeting Scheduled!</div>
                              </td>
                            </tr>
                            <tr>
                              <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                                <div style="font-family:'Open Sans', sans-serif;font-size:16px;line-height:1;text-align:center;color:#777777;">Please take a look at the details below.</div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:600px;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;">
                <tbody>
                  <tr>
                    <td style="direction:ltr;font-size:0px;padding:20px 20px;text-align:center;">
                      <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                          <tbody>

                            <tr>
                              <td align="left" style="font-size:0px;padding:10px 25px 6px 25px;word-break:break-word;">
                                <div style="font-family:'Open Sans', sans-serif;font-size:18px;font-weight:600;line-height:1;text-align:left;color:#333333;">
                                  Hello, ${name}!
                                </div>
                              </td>
                            </tr>

                            <tr>
                              <td align="left" style="font-size:0px;padding:6px 25px 10px 25px;word-break:break-word;">
                                <div style="font-family:'Open Sans', sans-serif;font-size:14px;font-weight:400;line-height:1.6;text-align:left;color:#555555;">
                                  Your meeting has been scheduled for <strong>${date}</strong> at <strong>${time}</strong>. 
                                  If you have any questions or are unable to attend, please reach out to us at 
                                  <a href="mailto:support@torontorealestaterealty.com" style="color:#154360;">support@torontorealestaterealty.com</a>.
                                </div>
                              </td>
                            </tr>

                            <tr>
                              <td align="center" style="font-size:0px;padding:25px 30px;word-break:break-word;">
                                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
                                  <tbody>
                                    <tr>
                                      <td align="center" role="presentation" style="border:none;border-radius:5px;cursor:auto;mso-padding-alt:10px 25px;background:transparent;" valign="middle">
                                        <a href="${link}"
                                          style="display:inline-block;background:transparent;color:#154360;border:2px solid #154360;font-family:'Open Sans', Helvetica, Arial, sans-serif;font-size:16px;font-weight:600;line-height:120%;margin:0;text-decoration:none;text-transform:none;padding:12px 32px;border-radius:5px;"
                                          target="_blank">Join Meeting</a>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>

                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="background:#7a8c6e;background-color:#7a8c6e;margin:0px auto;max-width:600px;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#7a8c6e;background-color:#7a8c6e;width:100%;">
                <tbody>
                  <tr>
                    <td style="direction:ltr;font-size:0px;padding:20px;text-align:center;">
                      <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                          <tbody>
                            <tr>
                              <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                                <div style="font-family:'Open Sans', sans-serif;font-size:12px;line-height:1;text-align:center;color:#e9e9e9;">
                                  This is an auto-generated email. Please do not reply to this message.
                                  For help with any questions about your Mere Postings account, please contact us at
                                  <a href="mailto:support@torontorealestaterealty.com" style="color:#e9e9e9;text-decoration:none;">support@torontorealestaterealty.com</a>.
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                                <div style="font-family:'Open Sans', sans-serif;font-size:12px;line-height:1;text-align:center;color:#e9e9e9;">© 2025 Mere Postings. All rights reserved.</div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </body>
      </html>`,
    MessageStream: "notifications",
  });
};

module.exports = {
  sendVerificationEmail,
  sendPaymentConfirmationEmail,
  meetingScheduled
};
