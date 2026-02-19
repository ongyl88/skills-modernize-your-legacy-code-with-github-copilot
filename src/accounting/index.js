#!/usr/bin/env node
// Simple Node.js port of the original COBOL account system
// - preserves menu, operations, and in-memory data behavior

const readline = require('readline');

// Data layer (in-memory storage, mirrors STORAGE-BALANCE)
let STORAGE_BALANCE = 1000.00; // default initial balance
const PIC_MAX = 999999.99; // corresponds to PIC 9(6)V99

function roundToTwo(n) {
  return Math.round(n * 100) / 100;
}

function formatMoney(n) {
  return roundToTwo(n).toFixed(2);
}

// DataProgram equivalent
function dataProgram(operation, balance) {
  if (operation === 'READ') {
    return STORAGE_BALANCE;
  }
  if (operation === 'WRITE') {
    STORAGE_BALANCE = roundToTwo(balance);
    return true;
  }
  return null;
}

// Operations equivalent
async function operations(passedOperation, rl) {
  const op = passedOperation; // expected to be 6-char padded in COBOL; using same tokens here

  if (op === 'TOTAL ') {
    const bal = dataProgram('READ');
    console.log('Current balance: ' + formatMoney(bal));
    return;
  }

  if (op === 'CREDIT') {
    const amountStr = await questionAsync('Enter credit amount: ', rl);
    const amount = parseFloat(amountStr);
    if (Number.isNaN(amount) || amount <= 0) {
      console.log('Invalid amount. Please enter a positive number.');
      return;
    }
    if (amount > PIC_MAX) {
      console.log('Amount exceeds maximum allowed.');
      return;
    }
    let bal = dataProgram('READ');
    bal = roundToTwo(bal + amount);
    if (bal > PIC_MAX) {
      console.log('Resulting balance exceeds maximum allowed.');
      return;
    }
    dataProgram('WRITE', bal);
    console.log('Amount credited. New balance: ' + formatMoney(bal));
    return;
  }

  if (op === 'DEBIT ') {
    const amountStr = await questionAsync('Enter debit amount: ', rl);
    const amount = parseFloat(amountStr);
    if (Number.isNaN(amount) || amount <= 0) {
      console.log('Invalid amount. Please enter a positive number.');
      return;
    }
    let bal = dataProgram('READ');
    if (bal >= amount) {
      bal = roundToTwo(bal - amount);
      dataProgram('WRITE', bal);
      console.log('Amount debited. New balance: ' + formatMoney(bal));
    } else {
      console.log('Insufficient funds for this debit.');
    }
    return;
  }

  console.log('Unknown operation:', op);
}

function questionAsync(prompt, rl) {
  return new Promise((resolve) => rl.question(prompt, (ans) => resolve(ans.trim())));
}

// Main menu (mirrors MainProgram)
// Accepts an optional `rl` (readline interface) to make testing easier.
async function main(providedRl) {
  const rl = providedRl || readline.createInterface({ input: process.stdin, output: process.stdout });
  let continueFlag = true;

  while (continueFlag) {
    console.log('--------------------------------');
    console.log('Account Management System');
    console.log('1. View Balance');
    console.log('2. Credit Account');
    console.log('3. Debit Account');
    console.log('4. Exit');
    console.log('--------------------------------');

    const choiceStr = await questionAsync('Enter your choice (1-4): ', rl);
    const choice = parseInt(choiceStr, 10);

    switch (choice) {
      case 1:
        await operations('TOTAL ', rl);
        break;
      case 2:
        await operations('CREDIT', rl);
        break;
      case 3:
        await operations('DEBIT ', rl);
        break;
      case 4:
        continueFlag = false;
        break;
      default:
        console.log('Invalid choice, please select 1-4.');
    }
  }

  console.log('Exiting the program. Goodbye!');
  if (!providedRl) rl.close();
}

if (require.main === module) {
  main();
}

module.exports = {
  // exported for potential unit testing in the future
  dataProgram,
  operations,
  roundToTwo,
  formatMoney,
  _internal: { getBalance: () => STORAGE_BALANCE, setBalance: (b) => { STORAGE_BALANCE = b; } },
};
