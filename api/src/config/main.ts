let dbName = process.env.DB_NAME || 'geli';
if (process.env.NODE_ENV === 'test') {
  dbName = 'test';
}
export default {
  // Secret key for JWT signing and encryption
  secret: process.env.SECRET || 'notSoSecret234oi23o423ooqnafsnaaslfj',

  // BaseUrl for Webfrontend
  baseurl: process.env.BASEURL || 'http://localhost:4200',

  // Database connection information
  database: `mongodb://${process.env.DB_HOST || 'localhost'}:27017/${dbName}`,

  // Setting port for server
  port: process.env.PORT || 3030,

  // Email configuration
  // for provider see https://nodemailer.com/smtp/well-known/
  // Use either Provider or SMTPServer/Port
  mailProvider: process.env.MAILPROVIDER || 'DebugMail',
  mailSMTPServer: process.env.MAILSMTPSERVER || undefined,
  mailSMTPPort: process.env.MAILSMTPPORT || 25,
  mailAuth: {
    user: process.env.MAILUSER || undefined,
    pass: process.env.MAILPASS || ''
  },
  mailSender: process.env.MAILSENDER || 'no-reply@geli.edu',

  teacherMailRegex: process.env.TEACHER_MAIL_REGEX || '^.+@.+\..+$',

  nonProductionWarning: process.env.NONPRODUCTIONWARNING || undefined,
};
