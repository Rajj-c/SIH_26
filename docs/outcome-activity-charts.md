# Outcome Explorer activity charts

Industry and institution Outcome Explorer pages now include selected-period totals
and a monthly grouped bar chart. The chart consumes the existing authorized,
date-filtered `buildOutcomeTrends` model; it does not fetch broader records or
introduce sample data. No migration or additional service is required.

Series can be independently toggled with labelled keyboard-accessible checkboxes.
The existing table remains the textual source for all exact counts. Zero activity
has an explicit empty state. Animation is disabled to avoid motion and misleading
transitions while filters change. Wide periods scroll on narrow screens.

Boundary months reflect only selected UTC dates. Totals count events, not unique
people or stages of one conversion funnel. Current authorization/cohort definitions
and existing small-count withholding on aggregate export remain unchanged.

This does not implement historical membership snapshots, score-effectiveness
comparisons, or validated placement success rates.
