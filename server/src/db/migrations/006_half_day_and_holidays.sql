-- Capstone (docs/capstone/design.md): half-day leave + public holidays as data instead of code.
-- Down path: server/src/db/down/006_half_day_and_holidays.down.sql (run by hand; see the design doc §5).

-- 1. Half days. day_part describes the request's LAST day: FULL, AM (morning off) or PM (afternoon off).
--    Existing rows become FULL, so every existing request keeps its meaning.
ALTER TABLE leave_requests
  ADD COLUMN day_part TEXT NOT NULL DEFAULT 'FULL' CHECK (day_part IN ('FULL', 'AM', 'PM'));

-- 2. Public holidays. A date is a holiday or not, so the date is the key (two holidays on one date = one row).
CREATE TABLE public_holidays (
  holiday_date DATE PRIMARY KEY,
  name         TEXT NOT NULL CHECK (length(trim(name)) > 0),
  year         INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM holiday_date)::int) STORED,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX public_holidays_year ON public_holidays (year);

-- 3. The 2026 Sri Lankan public holidays, previously hard-coded in server/src/lib/holidays.js.
--    Starting list for HR to confirm against the official gazette; HR maintains it in the app from now on.
INSERT INTO public_holidays (holiday_date, name, note) VALUES
  ('2026-01-03', 'Duruthu Full Moon Poya Day', 'to confirm against the official gazette'),
  ('2026-01-15', 'Tamil Thai Pongal Day', 'to confirm against the official gazette'),
  ('2026-02-01', 'Navam Full Moon Poya Day', 'to confirm against the official gazette'),
  ('2026-02-04', 'Independence Day', 'to confirm against the official gazette'),
  ('2026-02-15', 'Maha Shivaratri Day', 'to confirm against the official gazette'),
  ('2026-03-02', 'Medin Full Moon Poya Day', 'to confirm against the official gazette'),
  ('2026-03-21', 'Eid-ul-Fitr', 'to confirm against the official gazette (lunar, can move by a day)'),
  ('2026-04-01', 'Bak Full Moon Poya Day', 'to confirm against the official gazette'),
  ('2026-04-03', 'Good Friday', 'to confirm against the official gazette'),
  ('2026-04-13', 'Day before Sinhala and Tamil New Year', 'to confirm against the official gazette'),
  ('2026-04-14', 'Sinhala and Tamil New Year Day', 'to confirm against the official gazette'),
  ('2026-05-01', 'Vesak Full Moon Poya Day + International Labour Day', 'to confirm against the official gazette'),
  ('2026-05-02', 'Day after Vesak Full Moon Poya Day', 'to confirm against the official gazette (one source lists this holiday on 31 May)'),
  ('2026-05-28', 'Eid al-Adha', 'to confirm against the official gazette (lunar, can move by a day)'),
  ('2026-05-30', 'Adhi Poson Full Moon Poya Day', 'to confirm against the official gazette (sources agree on the date, not the name)'),
  ('2026-06-29', 'Poson Full Moon Poya Day', 'to confirm against the official gazette'),
  ('2026-07-29', 'Esala Full Moon Poya Day', 'to confirm against the official gazette'),
  ('2026-08-26', 'Milad-un-Nabi', 'to confirm against the official gazette (lunar, can move by a day)'),
  ('2026-08-27', 'Nikini Full Moon Poya Day', 'to confirm against the official gazette'),
  ('2026-09-26', 'Binara Full Moon Poya Day', 'to confirm against the official gazette'),
  ('2026-10-25', 'Vap Full Moon Poya Day', 'to confirm against the official gazette'),
  ('2026-11-08', 'Deepavali', 'to confirm against the official gazette'),
  ('2026-11-24', 'Ill Full Moon Poya Day', 'to confirm against the official gazette'),
  ('2026-12-23', 'Unduvap Full Moon Poya Day', 'to confirm against the official gazette'),
  ('2026-12-25', 'Christmas Day', 'to confirm against the official gazette');
