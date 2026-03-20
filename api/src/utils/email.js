const sendWelcomeEmail = async ({ to, academyName }) => {
  // Will be implemented with actual email sending logic in the future
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  console.log(`Welcome email sent to ${to} for academy ${academyName}`);
}

export { sendWelcomeEmail };