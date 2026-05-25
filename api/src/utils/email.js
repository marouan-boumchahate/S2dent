const sendEmail = async ({ to, subject, message }) => {
  // Will be implemented with actual email sending logic in the future
  console.log('\n\n----------------------- Email Sending Simulation -----------------------');
  console.log(`From: S2dent <info@s2dent.com>\nTo: ${to}\nSubject: ${subject}\nMessage: ${message}`);
  console.log('------------------------------------------------------------------------\n\n');
}

export { sendEmail };