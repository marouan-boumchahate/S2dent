export function printMenu(operations) {
  console.log('\n==================================================');
  console.log('            S2dent Seed CLI Generator             ');
  console.log('==================================================');
  operations.forEach((op, index) => {
    console.log(`[${String(index + 1).padStart(2, ' ')}] ${op.label}`);
  });
  console.log(`[${String(operations.length + 1).padStart(2, ' ')}] Exit`);
  console.log('==================================================');
}

export function printResult(message, resultData) {
  console.log(`\n✓ ${message}`);
  if (resultData && typeof resultData === 'object') {
    const skipFields = ['__v', 'updatedAt', 'password', 'salt'];
    
    // Recursive formatter for nested objects
    const formatObject = (obj, indent = '  ') => {
      for (const [key, value] of Object.entries(obj)) {
        if (skipFields.includes(key)) continue;
        if (value === null || value === undefined) continue;
        
        if (typeof value === 'object' && !Array.isArray(value)) {
          console.log(`${indent}→ ${key}:`);
          formatObject(value, indent + '    ');
        } else if (Array.isArray(value)) {
          console.log(`${indent}→ ${key}: [${value.length} items]`);
        } else {
          console.log(`${indent}→ ${key}: ${JSON.stringify(value)}`);
        }
      }
    };
    
    formatObject(resultData);
  }
}

export function printError(title, error) {
  console.log(`\n✗ Error: ${title}`);
  if (error.status) {
    console.log(`  → Status: ${error.status}`);
  }
  console.log(`  → Message: ${error.message || error}`);
}

export function printInfo(msg) {
  console.log(`\nℹ ${msg}`);
}
