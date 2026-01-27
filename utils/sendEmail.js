const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text) => {
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

    const mailOptions = {
      from: '"My Drive App" <no-reply@mydrive.com>',
      to: to,
      subject: subject,
      text: text,
      html: `<b>${text}</b>`,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Message sent: %s", info.messageId);
    
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

  } catch (error) {
    console.error("Error sending email:", error);
  }
};

module.exports = sendEmail;