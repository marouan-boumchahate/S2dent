import readline from 'readline';

export function askText(label) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${label}: `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function askSecret(label) {
  return new Promise((resolve) => {
    process.stdout.write(`${label}: `);
    const rl = readline.createInterface({ input: process.stdin, output: null });
    let value = '';
    process.stdin.setRawMode(true);
    
    const onData = (data) => {
      const char = data.toString('utf-8');
      for (let i = 0; i < char.length; i++) {
        const c = char[i];
        if (c === '\r' || c === '\n') {
          process.stdout.write('\n');
          process.stdin.setRawMode(false);
          process.stdin.removeListener('data', onData);
          rl.close();
          resolve(value);
          return;
        } else if (c === '\u0008' || c === '\u007f') { // Backspace or Delete
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b'); // backspace, space, backspace to erase character
          }
        } else if (c === '\u0003') { // Ctrl+C
          process.stdin.setRawMode(false);
          process.stdin.removeListener('data', onData);
          rl.close();
          process.exit(0);
        } else {
          value += c;
          process.stdout.write('█');
        }
      }
    };
    
    process.stdin.on('data', onData);
  });
}


export async function askJson(label, schema) {
  const templateStr = JSON.stringify(schema);
  while (true) {
    console.log(`\n${label}`);
    console.log(`Template → ${templateStr}`);
    const answer = await askText('Your input (stringified JSON)');
    try {
      let parsed = JSON.parse(answer.trim() || '{}');
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      return parsed;
    } catch (err) {
      console.log('Invalid JSON — try again');
    }
  }
}



export async function askOtp(email) {
  console.log(`\nOTP sent to ${email}`);
  return askText('Enter verification code');
}


export async function askConfirm(label) {
  while (true) {
    const answer = await askText(`${label} (y/n)`);
    const lower = answer.toLowerCase().trim();
    if (lower === 'y' || lower === 'yes') return true;
    if (lower === 'n' || lower === 'no') return false;
    console.log('Please enter "y" or "n"');
  }
}


export async function askSelect(label, maxOption) {
  while (true) {
    const answer = await askText(label);
    const parsed = parseInt(answer.trim(), 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= maxOption) {
      return parsed;
    }
    console.log(`Invalid choice — select a number between 1 and ${maxOption}`);
  }
}

export function askKeyPress(label = 'Press any key when the transaction is mined...') {
  return new Promise((resolve) => {
    process.stdout.write(`\n${label}`);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const onKey = (chunk) => {
      if (chunk.toString() === '\u0003') {
        process.stdin.setRawMode(false);
        process.exit(0);
      }
      process.stdout.write('\n');
      process.stdin.setRawMode(false);
      process.stdin.removeListener('data', onKey);
      resolve();
    };
    process.stdin.on('data', onKey);
  });
}

