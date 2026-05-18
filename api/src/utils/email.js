const sendEmail = async ({ to, subject, message }) => {
  // Will be implemented with actual email sending logic in the future
  console.log(`From: S2dent <info@s2dent.com>\nTo: ${to}\nSubject: ${subject}\nMessage: ${message}`);
}

export { sendEmail };