// Sri Lankan public holidays for 2026, as 'YYYY-MM-DD' strings, passed to leaveDays() so they are
// never deducted from a leave balance (Q3 assumption in docs/requirements.md: poya days are skipped).
//
// Source: the Government Printing Department's 2026 holiday calendar as reported by Ada Derana
// ("Sri Lanka's 2026 holiday calendar: Here's the full list", adaderana.lk/news/116465), cross-checked
// against calendarsrilanka.com on 2026-09-21. Every date below appears in both unless marked otherwise.
// Weekend holidays are listed too — harmless, since leaveDays skips weekends anyway.
// Islamic festival dates depend on the sighting of the moon and can move by a day.
// 2026 has an extra (Adhi) lunar month, so there are 13 full moon poya days.
const HOLIDAYS_2026 = [
  '2026-01-03', // Duruthu Full Moon Poya Day (Sat)
  '2026-01-15', // Tamil Thai Pongal Day
  '2026-02-01', // Navam Full Moon Poya Day (Sun)
  '2026-02-04', // Independence Day
  '2026-02-15', // Maha Shivaratri Day (Sun)
  '2026-03-02', // Medin Full Moon Poya Day
  '2026-03-21', // Eid-ul-Fitr (Sat, lunar)
  '2026-04-01', // Bak Full Moon Poya Day
  '2026-04-03', // Good Friday
  '2026-04-13', // Day before Sinhala and Tamil New Year
  '2026-04-14', // Sinhala and Tamil New Year Day
  '2026-05-01', // Vesak Full Moon Poya Day + International Labour Day
  '2026-05-02', // Day after Vesak Full Moon Poya Day (Sat) — TODO verify: calendarsrilanka.com
                //   calls 1 May "Adhi Vesak" and lists the day-after holiday on 31 May instead
  '2026-05-28', // Eid al-Adha (lunar)
  '2026-05-30', // Adhi Poson Full Moon Poya Day (Sat) — sources agree on the date, not the name
  '2026-06-29', // Poson Full Moon Poya Day
  '2026-07-29', // Esala Full Moon Poya Day
  '2026-08-26', // Milad-un-Nabi (lunar)
  '2026-08-27', // Nikini Full Moon Poya Day
  '2026-09-26', // Binara Full Moon Poya Day (Sat)
  '2026-10-25', // Vap Full Moon Poya Day (Sun)
  '2026-11-08', // Deepavali (Sun)
  '2026-11-24', // Ill Full Moon Poya Day
  '2026-12-23', // Unduvap Full Moon Poya Day
  '2026-12-25', // Christmas Day
];

// Only 2026 is loaded so far; a request in another year is counted with weekends excluded only.
const HOLIDAYS = [...HOLIDAYS_2026];

module.exports = { HOLIDAYS, HOLIDAYS_2026 };
