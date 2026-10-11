# Paginated notification history

The inbox for every role supports older/previous pages and a newest-page reset.
Unread filtering now runs in the recipient-scoped database query, not only over
the most recent 100 records. The badge remains an all-inbox unread count.

Pages use descending `(created_at, id)` cursors with 100 displayed records and
one lookahead record. PostgreSQL timestamp precision is retained. Strictly
validated cursor fields prevent user input from becoming PostgREST filter syntax.
Both list and count explicitly filter the authenticated recipient in addition to
the existing RLS policies. No service-role access or database migration is added.

The inbox is live, not a historical snapshot: marking read can remove entries
from unread pages, and newly arriving messages appear on the newest page.
Changing the unread filter resets pagination. Read mutations revalidate all
notification query variants as well as the shared bell. Viewing or opening an
item still does not mark it read, and mark-all-read still affects the whole inbox.

Tests cover auth, recipient query scoping, unread filtering, cursor validation,
microsecond preservation, lookahead and safe database errors. Existing database
tests cover notification RLS and read-state ownership. Browser verification and
live delivery-worker configuration remain separate acceptance steps.
