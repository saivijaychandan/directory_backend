const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text, extraHtml = '') => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        .container {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e0e0e0;
        }
        .header {
          background-color: #007bff;
          padding: 20px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 30px 20px;
          color: #333333;
          line-height: 1.6;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 15px;
          text-align: center;
          font-size: 12px;
          color: #888888;
        }
        .button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #007bff;
          color: #ffffff;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
        }
      </style>
    </head>
    <body style="background-color: #f4f4f4; padding: 20px; margin: 0;">
      
      <div class="container">
        <div class="header">
          <h1>My Drive</h1>
        </div>

        <div class="content">
          ${extraHtml ? extraHtml : `<p>${text}</p>`}
        </div>

        <div class="footer">
          <p>Secure Cloud Storage for your memories.</p>
          <p>If you didn't request this email, please ignore it.</p>
        </div>
      </div>

    </body>
    </html>
    `;

    const mailOptions = {
      from: '"My Drive App" <no-reply@mydrive.com>',
      to: to,
      subject: subject,
      text: text,
      html: htmlTemplate,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

  } catch (error) {
    console.error("Error sending email:", error);
  }
};

module.exports = sendEmail;