import type { Note, User } from './types'

export const USERS: User[] = [
  { id: 'u-01', name: 'Devon Lane', email: 'devon@lasertech.com', role: 'Admin', active: true, joinedAt: '2024-02-11' },
  { id: 'u-02', name: 'Ahmed Saleh', email: 'ahmed.s@lasertech.com', role: 'Technician', active: true, joinedAt: '2024-05-03' },
  { id: 'u-03', name: 'Mariam Hassan', email: 'mariam.h@lasertech.com', role: 'Accountant', active: true, joinedAt: '2024-08-19' },
  { id: 'u-04', name: 'Omar Khalil', email: 'omar.k@lasertech.com', role: 'Technician', active: false, joinedAt: '2025-01-07' },
  { id: 'u-05', name: 'Farida Nabil', email: 'farida.n@lasertech.com', role: 'Accountant', active: true, joinedAt: '2025-03-25' },
  { id: 'u-06', name: 'Youssef Adel', email: 'youssef.a@lasertech.com', role: 'Technician', active: true, joinedAt: '2025-06-14' },
  { id: 'u-07', name: 'Nadia Fathy', email: 'nadia.f@lasertech.com', role: 'Admin', active: true, joinedAt: '2025-09-02' },
  { id: 'u-08', name: 'Karim Mostafa', email: 'karim.m@lasertech.com', role: 'Technician', active: false, joinedAt: '2025-11-20' },
]

export const NOTES: Note[] = [
  { id: 'n-01', date: '2026-11-02', title: 'Tube 130W running hot', content: 'Replaced water in the chiller and re-checked flow sensor. Tube temperature stable at 24°C after two hours of cutting.', tag: 'Maintenance' },
  { id: 'n-02', date: '2026-11-01', title: 'Gift Box Egypt re-order', content: 'Client confirmed re-order of 200 kraft paper boxes for Valentine season. Prepare quote with 10% bulk discount.', tag: 'Orders' },
  { id: 'n-03', date: '2026-10-31', title: 'Best sales week this quarter', content: 'Revenue crossed EGP 120k driven by acrylic signage orders. Push the same bundle offer to remaining list.', tag: 'Sales' },
  { id: 'n-04', date: '2026-10-30', title: 'Lens inventory check', content: 'Two ZnSe mirrors arrived scratched from supplier — filed a claim. Adjusted stock count to reflect usable units.', tag: 'General' },
  { id: 'n-05', date: '2026-10-29', title: 'Rotary attachment training', content: 'Omar completed training on cup engraving with the rotary attachment. Approved to work on client jobs solo.', tag: 'General' },
  { id: 'n-06', date: '2026-10-28', title: 'Power consumption spike', content: 'November electricity bill expected to rise. Schedule heavy cutting jobs before 2 PM to stay under load peaks.', tag: 'Maintenance' },
  { id: 'n-07', date: '2026-10-27', title: 'New corporates lead', content: 'Following the MEDIC exhibition, 14 new corporate leads requested awards engraving quotes. Distributed to sales.', tag: 'Sales' },
]
