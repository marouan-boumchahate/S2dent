const sendEmail = async ({ to, subject, message }) => {
  // Will be implemented with actual email sending logic in the future
  await new Promise((resolve) => setTimeout(resolve, 3000));
  
  console.log(`From: S2dent <info@s2dent.com>\nTo: ${to}\nSubject: ${subject}\nMessage: ${message}`);
}

export { sendEmail };