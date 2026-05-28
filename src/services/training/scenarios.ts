import type { Scenario } from '@/models';

export const SCENARIOS: Scenario[] = [
  {
    id: 'gas-code',
    title: 'Gas Pipeline Code Selection',
    category: 'Codes',
    description: 'A new 36" gas transmission line, onshore Class 2. Select the governing design code.',
    steps: [
      {
        prompt: 'Which code governs design?',
        options: [
          { label: 'ASME B31.4', correct: false, feedback: 'B31.4 covers liquid hydrocarbons.' },
          { label: 'ASME B31.8', correct: true, feedback: 'Correct — gas transmission falls under B31.8.' },
          { label: 'API 1160', correct: false, feedback: 'API 1160 is integrity management for liquids.' },
          { label: 'DNV-ST-F101', correct: false, feedback: 'DNV-ST-F101 governs subsea pipelines.' },
        ],
      },
    ],
  },
  {
    id: 'design-factor',
    title: 'Design Factor by Class Location',
    category: 'Design',
    description: 'A gas line traverses a suburban area (Class 3).',
    steps: [
      {
        prompt: 'Maximum design factor F?',
        options: [
          { label: '0.72', correct: false, feedback: 'Class 1 only.' },
          { label: '0.60', correct: false, feedback: 'Class 2 limit.' },
          { label: '0.50', correct: true, feedback: 'Correct — Class 3 caps F at 0.50 per B31.8.' },
          { label: '0.40', correct: false, feedback: 'Class 4 (multi-storey).' },
        ],
      },
    ],
  },
  {
    id: 'wall-thickness',
    title: 'Wall Thickness Calculation',
    category: 'Calculations',
    description: 'P = 9.93 MPa, D = 762 mm, SMYS = 414 MPa, F = 0.72, CA = 3 mm. Compute t.',
    steps: [
      {
        prompt: 'Closest wall thickness (mm)?',
        options: [
          { label: '9.7', correct: false, feedback: 'Recheck Barlow + CA.' },
          { label: '15.7', correct: true, feedback: 'Correct — t ≈ (P·D)/(2·S·F) + CA ≈ 15.7 mm.' },
          { label: '21.4', correct: false, feedback: 'Over-conservative — double check F.' },
          { label: '6.0', correct: false, feedback: 'Below minimum.' },
        ],
      },
    ],
  },
  {
    id: 'hydrotest',
    title: 'Hydrotest Validation',
    category: 'Testing',
    description: 'MAOP = 8.0 MPa. Hydrotest record shows 9.0 MPa.',
    steps: [
      {
        prompt: 'Is the test acceptable per the typical 1.25× rule?',
        options: [
          { label: 'Yes', correct: false, feedback: 'Ratio is 1.125 — below 1.25.' },
          { label: 'No, retest required', correct: true, feedback: 'Correct — minimum 1.25 × MAOP = 10.0 MPa.' },
          { label: 'Yes if engineer signs off', correct: false, feedback: 'Code minimum is not waivable by signature.' },
        ],
      },
    ],
  },
];
