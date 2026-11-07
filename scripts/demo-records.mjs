// All people, clinics and laboratories in this file are made up.
export const HERO = { name: 'Rashid Mehmood', mrn: 'CM-1042', dob: '1968-03-14', sex: 'Male' };

export const OTHERS = [
  { name: 'Ayesha Khan', mrn: 'CM-1077', dob: '1980-07-02', sex: 'Female', labs: [['Hemoglobin', '12.8', 'g/dL', '12.0-15.5'], ['Fasting Glucose', '98', 'mg/dL', '70-100']], date: '2026-10-20', reason: 'Tiredness', time: '09:30' },
  { name: 'Muhammad Aslam', mrn: 'CM-1013', dob: '1963-01-22', sex: 'Male', labs: [['HbA1c', '6.9', '%', '4.0-5.6'], ['Creatinine', '1.0', 'mg/dL', '0.7-1.3']], date: '2026-10-11', reason: 'Diabetes review', time: '10:00' },
  { name: 'Fatima Noor', mrn: 'CM-1088', dob: '1974-11-09', sex: 'Female', labs: [['Fasting Glucose', '131', 'mg/dL', '70-100'], ['HbA1c', '7.6', '%', '4.0-5.6']], date: '2026-10-29', reason: 'Diabetes review', time: '10:30' },
  { name: 'Imran Qureshi', mrn: 'CM-1101', dob: '1985-05-18', sex: 'Male', labs: [['Hemoglobin', '15.1', 'g/dL', '13.0-17.0']], date: '2026-09-30', reason: 'Fever', time: '11:00' },
  { name: 'Zainab Ali', mrn: 'CM-1119', dob: '1991-02-27', sex: 'Female', labs: [['Hemoglobin', '11.4', 'g/dL', '12.0-15.5']], date: '2026-10-25', reason: 'Follow-up', time: '11:30' },
  { name: 'Tariq Hussain', mrn: 'CM-1004', dob: '1959-09-05', sex: 'Male', labs: [['Creatinine', '1.2', 'mg/dL', '0.7-1.3'], ['HbA1c', '7.1', '%', '4.0-5.6']], date: '2026-10-02', reason: 'Blood pressure check', time: '12:00' },
  { name: 'Sadia Malik', mrn: 'CM-1093', dob: '1977-12-12', sex: 'Female', labs: [['Fasting Glucose', '104', 'mg/dL', '70-100']], date: '2026-10-15', reason: 'Routine check', time: '12:30' },
];

const R = {
  hb: ['Hemoglobin', 'g/dL', '13.0-17.0'],
  a1c: ['HbA1c', '%', '4.0-5.6'],
  cr: ['Creatinine', 'mg/dL', '0.7-1.3'],
  fbs: ['Fasting Glucose', 'mg/dL', '70-100'],
};
const lab = (k, v) => [R[k][0], v, R[k][1], R[k][2]];
const report = (file, date, labs, look = {}) => ({ file, kind: 'lab', date, labs, look });

export const HERO_FILES = [
  report('01-lab-2021-11.jpg', '2021-11-12', [lab('a1c', '8.6'), lab('fbs', '165'), lab('cr', '1.1')], { rotate: -0.8, tone: 'old' }),
  report('02-lab-2022-06.jpg', '2022-06-10', [lab('a1c', '7.9'), lab('cr', '1.1')], { rotate: 0.5, shadow: true }),
  report('03-lab-2023-03.jpg', '2023-03-15', [lab('a1c', '7.4'), lab('cr', '1.1')], { rotate: 1.1, crease: true }),
  report('04-lab-2023-10.jpg', '2023-10-06', [lab('hb', '14.2'), lab('a1c', '7.2')], { rotate: -0.4 }),
  report('05-lab-2024-04.jpg', '2024-04-12', [lab('hb', '13.8'), lab('cr', '1.2')], { rotate: 0.7, shadow: true, tone: 'old' }),
  report('06-lab-2024-10.jpg', '2024-10-18', [lab('hb', '13.3'), lab('a1c', '7.0')], { rotate: -1.2, crease: true }),
  report('07-lab-2025-04.jpg', '2025-04-11', [lab('hb', '12.9'), lab('cr', '1.1')], { rotate: 0.3, blur: 0.5 }),
  report('08-lab-2025-10.jpg', '2025-10-17', [lab('hb', '12.4'), lab('a1c', '7.1')], { rotate: -0.6, tone: 'old' }),
  report('09-lab-2026-08.jpg', '2026-08-18', [lab('cr', '1.2'), lab('fbs', '128')], { rotate: 0.4 }),
  report('10-lab-2026-10.jpg', '2026-10-28', [lab('hb', '11.9'), lab('cr', '1.4')], { rotate: -0.3, shadow: true }),
  { file: '11-rx-2021-11.jpg', kind: 'rx', date: '2021-11-15', meds: [['Metformin', '500 mg', 'twice daily']], note: 'Diabetes. Diet advice.', look: { rotate: 0.9, font: 'Caveat' } },
  { file: '12-rx-2023-03.jpg', kind: 'rx', date: '2023-03-18', meds: [['Amlodipine', '5 mg', 'once daily']], note: 'BP raised. Continue metformin.', look: { rotate: -0.7, font: 'Kalam' } },
  { file: '13-rx-2024-10.jpg', kind: 'rx', date: '2024-10-20', meds: [['Metformin', 'SMUDGE', 'twice daily']], note: 'Review in 6 months.', look: { rotate: 1.4, font: 'Reenie Beanie', tone: 'old' } },
  { file: '14-rx-2025-10.jpg', kind: 'rx', date: '2025-10-20', meds: [['Atorvastatin', '10 mg', 'at night']], note: 'Add statin.', look: { rotate: -1, font: 'Caveat', crease: true } },
  { file: '15-rx-2026-10.jpg', kind: 'rx', date: '2026-10-30', clinic: 'Neighbourhood Pain Clinic', meds: [['Ibuprofen', '400 mg', 'three times daily']], note: 'Knee pain.', look: { rotate: 0.6, font: 'Kalam', shadow: true } },
  { file: '16-summary-2022-12.jpg', kind: 'summary', date: '2022-12-08', title: 'Discharge Summary', body: ['Admitted with high blood pressure and headache. Treated and discharged after two days.', 'Conditions: Type 2 diabetes. High blood pressure.', 'Allergy: Penicillin (skin rash).'], allergy: ['Penicillin', 'skin rash'], conditions: ['Type 2 diabetes', 'High blood pressure'], look: { rotate: -0.5 } },
  { file: '17-summary-2025-06.jpg', kind: 'summary', date: '2025-06-14', title: 'Specialist Eye Clinic Letter', body: ['Routine diabetic eye check. No major change seen.', 'Conditions: Type 2 diabetes.', 'Please repeat the eye check in one year.'], conditions: ['Type 2 diabetes'], look: { rotate: 0.8, tone: 'old' } },
  {
    file: '18-combined-2026-03.pdf',
    kind: 'combined',
    pages: [
      report('18-p1', '2026-03-05', [lab('a1c', '7.3'), lab('cr', '1.1')], { rotate: 0.4 }),
      { file: '18-p2', kind: 'summary', date: '2026-03-06', title: 'Clinic Visit Letter', body: ['Reviewed test results with the patient.', 'Conditions: Type 2 diabetes. High blood pressure.'], conditions: ['Type 2 diabetes', 'High blood pressure'], look: { rotate: -0.4 } },
    ],
  },
  { ...report('19-other-patient.jpg', '2026-09-12', [lab('hb', '15.0'), lab('cr', '0.9')], { rotate: 0.4 }), patient: { name: 'Rasheed Mahmood', mrn: 'CM-2231', dob: '1972-06-30', sex: 'Male' } },
  { ...report('20-unreadable-photo.jpg', '2026-04-02', [lab('hb', '13.0')], { rotate: 7, blur: 9, shadow: true }), unreadable: true },
];
