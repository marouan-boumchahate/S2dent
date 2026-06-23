import { operations } from './operations/index.js';
import { printMenu, printInfo } from './display.js';
import { askSelect } from './prompt.js';

export async function showMainMenu(adminToken) {
  while (true) {
    printMenu(operations);
    
    const maxChoice = operations.length + 1; // Last choice is Exit
    const choice = await askSelect('Select an operation number', maxChoice);
    
    if (choice === maxChoice) {
      printInfo('Exiting CLI Seed Generator. Goodbye!');
      process.exit(0);
    }
    
    const selectedOp = operations[choice - 1];
    printInfo(`Running: ${selectedOp.label}...`);
    
    try {
      await selectedOp.run(adminToken);
    } catch (err) {
      console.error('An unexpected error occurred during execution:', err);
    }
  }
}
