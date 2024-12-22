const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../config/logger');

const transport = nodemailer.createTransport(config.email.smtp);
/* istanbul ignore next */
if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch(() => logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env'));
}

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} html
 * @returns {Promise}
 */
const sendEmail = async (to, subject, html) => {
  const msg = { from: config.email.from, to, subject, html };
  await transport.sendMail(msg);
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to, token) => {
  const subject = 'Reset password';
  // replace this url with the link to the reset password page of your front-end app
  const resetPasswordUrl = `https://gamming-charecter.vercel.app/reset-password?token=${token}`;
  const html = `
    <p>Hello,</p>
    <p>We received a request to reset your password.</p>
    <p>You can reset your password by clicking <a href="${resetPasswordUrl}">Reset Password</a>.</p>
    <p>If you did not request a password reset, please ignore this email or contact support if you have questions.</p>
    <p>Thank you,</p>
    <p>The Team</p>
  `;
  await sendEmail(to, subject, html);
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendVerificationEmail = async (to, username, token) => {
  const subject = 'Email Verification';
  // replace this url with the link to the email verification page of your front-end app
  const verificationEmailUrl = `https://gamming-character-backend.vercel.app/v1/auth/verify-email?token=${token}`;
  const html = `
    <p>Dear user,</p>
    <p>To verify your email, click on this link: <a href="${verificationEmailUrl}">Email Verification</a></p>
    <p>If you did not create an account, then ignore this email.</p>
    <p>Thank you!</p>

    <p>Gaming Characters</p>

  `;
  await sendEmail(to, subject, html);
};


/**
 * Send contact us email
 * @param {string} from
 * @param {string} subject
 * @param {string} message
 * @returns {Promise}
 */
const sendContactUsEmail = async (from, subject, phoneNumber, file, message) => {
  const to = config.email.from; // Assuming the contact us email goes to the configured email address
  const html = `
    <p>You have received a new message from the contact us form:</p>
    <p><strong>From:</strong> ${from}</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <p><strong>Subject:</strong> ${phoneNumber}</p>
    <p><strong>Message:</strong></p>
    <p>${message}</p>
    <p><img src="${file}" /></p>
  `;
  await sendEmail(to, subject, html);
};

module.exports = {
  transport,
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendContactUsEmail
};
