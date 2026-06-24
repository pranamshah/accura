'use client';
import { useState } from 'react';
import { useTallyStore } from '@/store/tallyStore';

export default function CalculatorPanel() {
  const { showCalculator, toggleCalculator } = useTallyStore();
  const [display, setDisplay] = useState('0');
  const [expr, setExpr] = useState('');
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  if (!showCalculator) return null;

  function inputDigit(digit: string) {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  }

  function inputDecimal() {
    if (waitingForOperand) { setDisplay('0.'); setWaitingForOperand(false); return; }
    if (!display.includes('.')) setDisplay(display + '.');
  }

  function handleOperator(op: string) {
    setExpr(expr + display + ' ' + op + ' ');
    setWaitingForOperand(true);
  }

  function calculate() {
    try {
      const full = expr + display;
      // eslint-disable-next-line no-eval
      const result = eval(full.replace(/×/g, '*').replace(/÷/g, '/'));
      setDisplay(String(parseFloat(result.toFixed(8))));
      setExpr('');
      setWaitingForOperand(true);
    } catch {
      setDisplay('Error');
      setExpr('');
      setWaitingForOperand(true);
    }
  }

  function clear() {
    setDisplay('0');
    setExpr('');
    setWaitingForOperand(false);
  }

  function toggleSign() {
    setDisplay(String(parseFloat(display) * -1));
  }

  function percent() {
    setDisplay(String(parseFloat(display) / 100));
  }

  const buttons = [
    ['C', '+/-', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '='],
  ];

  function handleBtn(btn: string) {
    if (btn === 'C') { clear(); return; }
    if (btn === '+/-') { toggleSign(); return; }
    if (btn === '%') { percent(); return; }
    if (btn === '=') { calculate(); return; }
    if (['+', '-', '×', '÷'].includes(btn)) { handleOperator(btn); return; }
    if (btn === '.') { inputDecimal(); return; }
    inputDigit(btn);
  }

  return (
    <div className="calculator-panel">
      <div style={{ background: '#0f3460', padding: '3px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#00BFFF', fontSize: 11 }}>CALCULATOR  [Ctrl+N]</span>
        <span style={{ color: '#a0a0a0', cursor: 'pointer', fontSize: 12 }} onClick={toggleCalculator}>✕</span>
      </div>
      <div className="calc-display">
        <div style={{ fontSize: 10, color: '#a0a0a0', minHeight: 16 }}>{expr}</div>
        <div>{display}</div>
      </div>
      <div className="calc-grid">
        {buttons.map((row, ri) =>
          row.map((btn, ci) => (
            <button
              key={`${ri}-${ci}`}
              className={`calc-btn${['+','-','×','÷'].includes(btn) ? ' op' : ''}${btn === '=' ? ' eq' : ''}`}
              onClick={() => handleBtn(btn)}
              style={btn === '0' ? { gridColumn: 'span 2' } : {}}
            >
              {btn}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
