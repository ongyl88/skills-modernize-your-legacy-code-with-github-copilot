const { dataProgram, operations, roundToTwo, formatMoney, _internal } = require('../index');
const { EventEmitter } = require('events');

// Mock readline interface for testing
function createMockReadline(answers) {
  let answerIndex = 0;
  return {
    question: function (prompt, callback) {
      if (answerIndex < answers.length) {
        const answer = answers[answerIndex];
        answerIndex++;
        setImmediate(() => callback(answer || ''));
      } else {
        callback('');
      }
    },
    close: function () {
      // no-op
    }
  };
}

describe('School Accounting System (Node.js)', () => {
  beforeEach(() => {
    // Reset balance to 1000.00 before each test
    _internal.setBalance(1000.00);
  });

  // TC-01: View Balance (TOTAL)
  describe('TC-01: View Balance', () => {
    test('should display current balance as 1000.00 on startup', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const rl = createMockReadline();
      await operations('TOTAL ', rl);
      expect(consoleSpy).toHaveBeenCalledWith('Current balance: 1000.00');
      consoleSpy.mockRestore();
    });
  });

  // TC-02: Credit Account (valid amount)
  describe('TC-02: Credit Account (valid amount)', () => {
    test('should increase balance by 50.00 and display new balance 1050.00', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const rl = createMockReadline(['50.00']);
      await operations('CREDIT', rl);
      expect(_internal.getBalance()).toBe(1050.00);
      expect(consoleSpy).toHaveBeenCalledWith('Amount credited. New balance: 1050.00');
      consoleSpy.mockRestore();
    });

    test('should handle decimal precision correctly (e.g., 0.01)', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const rl = createMockReadline(['0.01']);
      await operations('CREDIT', rl);
      expect(_internal.getBalance()).toBe(1000.01);
      expect(consoleSpy).toHaveBeenCalledWith('Amount credited. New balance: 1000.01');
      consoleSpy.mockRestore();
    });
  });

  // TC-03: Debit Account (sufficient funds)
  describe('TC-03: Debit Account (sufficient funds)', () => {
    test('should decrease balance by 100.00 and display new balance 900.00', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const rl = createMockReadline(['100.00']);
      await operations('DEBIT ', rl);
      expect(_internal.getBalance()).toBe(900.00);
      expect(consoleSpy).toHaveBeenCalledWith('Amount debited. New balance: 900.00');
      consoleSpy.mockRestore();
    });

    test('should debit correctly when balance is exactly at amount', async () => {
      _internal.setBalance(50.00);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const rl = createMockReadline(['50.00']);
      await operations('DEBIT ', rl);
      expect(_internal.getBalance()).toBe(0.00);
      expect(consoleSpy).toHaveBeenCalledWith('Amount debited. New balance: 0.00');
      consoleSpy.mockRestore();
    });
  });

  // TC-04: Debit Account (insufficient funds)
  describe('TC-04: Debit Account (insufficient funds)', () => {
    test('should reject debit and display "Insufficient funds" message', async () => {
      _internal.setBalance(50.00);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const rl = createMockReadline(['200.00']);
      await operations('DEBIT ', rl);
      expect(_internal.getBalance()).toBe(50.00); // balance unchanged
      expect(consoleSpy).toHaveBeenCalledWith('Insufficient funds for this debit.');
      consoleSpy.mockRestore();
    });

    test('should prevent overdraft when debit equals or exceeds balance', async () => {
      _internal.setBalance(100.00);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const rl = createMockReadline(['150.00']);
      await operations('DEBIT ', rl);
      expect(_internal.getBalance()).toBe(100.00); // balance unchanged
      expect(consoleSpy).toHaveBeenCalledWith('Insufficient funds for this debit.');
      consoleSpy.mockRestore();
    });
  });

  // TC-05: Input validation — negative or non-numeric amount
  describe('TC-05: Input validation (negative/non-numeric)', () => {
    test('should reject negative amount in credit', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const rl = createMockReadline(['-50.00']);
      await operations('CREDIT', rl);
      expect(_internal.getBalance()).toBe(1000.00); // unchanged
      expect(consoleSpy).toHaveBeenCalledWith('Invalid amount. Please enter a positive number.');
      consoleSpy.mockRestore();
    });

    test('should reject non-numeric input in debit', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const rl = createMockReadline(['abc']);
      await operations('DEBIT ', rl);
      expect(_internal.getBalance()).toBe(1000.00); // unchanged
      expect(consoleSpy).toHaveBeenCalledWith('Invalid amount. Please enter a positive number.');
      consoleSpy.mockRestore();
    });

    test('should reject zero amount', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const rl = createMockReadline(['0']);
      await operations('CREDIT', rl);
      expect(_internal.getBalance()).toBe(1000.00); // unchanged
      expect(consoleSpy).toHaveBeenCalledWith('Invalid amount. Please enter a positive number.');
      consoleSpy.mockRestore();
    });
  });

  // TC-06: Numeric limits (overflow)
  describe('TC-06: Numeric limits (overflow)', () => {
    test('should reject credit that exceeds PIC max (999999.99)', async () => {
      _internal.setBalance(999900.00);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const rl = createMockReadline(['200.00']);
      await operations('CREDIT', rl);
      expect(consoleSpy).toHaveBeenCalledWith('Resulting balance exceeds maximum allowed.');
      expect(_internal.getBalance()).toBe(999900.00); // unchanged
      consoleSpy.mockRestore();
    });

    test('should reject amount that itself exceeds PIC max', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const rl = createMockReadline(['9999999.99']);
      await operations('CREDIT', rl);
      expect(consoleSpy).toHaveBeenCalledWith('Amount exceeds maximum allowed.');
      consoleSpy.mockRestore();
    });

    test('should allow credit that exactly reaches PIC max (999999.99)', async () => {
      _internal.setBalance(999900.00);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const rl = createMockReadline(['99.99']);
      await operations('CREDIT', rl);
      expect(_internal.getBalance()).toBe(999999.99);
      expect(consoleSpy).toHaveBeenCalledWith('Amount credited. New balance: 999999.99');
      consoleSpy.mockRestore();
    });
  });

  // TC-07: Operation code formatting / padding
  describe('TC-07: Operation code formatting', () => {
    test('should dispatch TOTAL with trailing space', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const rl = createMockReadline();
      await operations('TOTAL ', rl);
      expect(consoleSpy).toHaveBeenCalledWith('Current balance: 1000.00');
      consoleSpy.mockRestore();
    });

    test('should dispatch CREDIT without trailing space', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const rl = createMockReadline(['10.00']);
      await operations('CREDIT', rl);
      expect(_internal.getBalance()).toBe(1010.00);
      consoleSpy.mockRestore();
    });

    test('should dispatch DEBIT with trailing space', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const rl = createMockReadline(['50.00']);
      await operations('DEBIT ', rl);
      expect(_internal.getBalance()).toBe(950.00);
      consoleSpy.mockRestore();
    });
  });

  // TC-08: Persistence check (in-memory only)
  describe('TC-08: Persistence (in-memory only)', () => {
    test('should store balance change in memory during session', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const rl = createMockReadline(['100.00']);
      await operations('CREDIT', rl);
      expect(_internal.getBalance()).toBe(1100.00);
      
      // Verify next read returns updated balance
      const rl2 = createMockReadline();
      await operations('TOTAL ', rl2);
      expect(consoleSpy).toHaveBeenCalledWith('Current balance: 1100.00');
      consoleSpy.mockRestore();
    });

    test('should reset balance when app restarts (simulated by setBalance)', () => {
      _internal.setBalance(5000.00);
      expect(_internal.getBalance()).toBe(5000.00);
      
      // Simulate restart
      _internal.setBalance(1000.00);
      expect(_internal.getBalance()).toBe(1000.00);
    });
  });

  // TC-09: Menu navigation and invalid choice handling
  describe('TC-09: Menu navigation and invalid input', () => {
    test('should return from operations on valid command', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const rl = createMockReadline();
      await operations('TOTAL ', rl);
      expect(consoleSpy).toHaveBeenCalledWith('Current balance: 1000.00');
      consoleSpy.mockRestore();
    });
  });

  // Utility functions
  describe('Utility functions', () => {
    test('roundToTwo should round correctly', () => {
      expect(roundToTwo(1000.004)).toBe(1000.00);
      expect(roundToTwo(1000.005)).toBe(1000.01);
      expect(roundToTwo(1.234)).toBe(1.23);
    });

    test('formatMoney should format numbers with 2 decimal places', () => {
      expect(formatMoney(1000)).toBe('1000.00');
      expect(formatMoney(100.5)).toBe('100.50');
      expect(formatMoney(50.99)).toBe('50.99');
    });

    test('dataProgram READ should return current balance', () => {
      _internal.setBalance(500.00);
      const bal = dataProgram('READ');
      expect(bal).toBe(500.00);
    });

    test('dataProgram WRITE should update balance', () => {
      dataProgram('WRITE', 1500.00);
      expect(_internal.getBalance()).toBe(1500.00);
    });
  });
});
