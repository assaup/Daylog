from collections import defaultdict
from datetime import date, timedelta

from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.entries.models import DayLog, TimeEntry


def _minutes(start, end) -> int:
    s = start.hour * 60 + start.minute
    e = end.hour * 60 + end.minute
    if e < s:
        e += 24 * 60
    return e - s


def _to_minutes(t) -> int:
    return t.hour * 60 + t.minute


def _fmt_time(total_minutes: int | None) -> str | None:
    if total_minutes is None:
        return None
    total_minutes %= 24 * 60
    return f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"


def _spread_hours(buckets: dict, start, end) -> None:
    """Distribute an interval's minutes across the hours of the day it covers."""
    s = start.hour * 60 + start.minute
    e = end.hour * 60 + end.minute
    if e < s:
        e += 24 * 60
    for minute in range(s, e):
        buckets[(minute // 60) % 24] += 1


class StatsView(APIView):
    """Aggregated analytics for charts and KPI cards.

    Query params:
      from=YYYY-MM-DD, to=YYYY-MM-DD  (defaults to the last 7 days)
    Returns aggregates by category, by kind, and by day, plus KPI summary.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request) -> Response:
        today = date.today()
        date_to = request.query_params.get("to") or today.isoformat()
        date_from = (
            request.query_params.get("from")
            or (today - timedelta(days=6)).isoformat()
        )

        entries = (
            TimeEntry.objects.filter(
                user=request.user, date__gte=date_from, date__lte=date_to
            )
            .select_related("category")
        )

        by_category: dict[int, dict] = {}
        by_kind: dict[str, int] = defaultdict(int)
        by_day: dict[str, dict] = defaultdict(lambda: defaultdict(int))
        by_day_prod: dict[str, int] = defaultdict(int)
        by_day_total: dict[str, int] = defaultdict(int)
        by_day_kind: dict[str, dict] = defaultdict(lambda: defaultdict(int))
        prod_by_hour: dict[int, int] = defaultdict(int)
        total_minutes = 0

        for e in entries:
            mins = _minutes(e.start_time, e.end_time)
            total_minutes += mins
            day_key = e.date.isoformat()
            by_day_total[day_key] += mins

            if e.category:
                cat_id = e.category.id
                if cat_id not in by_category:
                    by_category[cat_id] = {
                        "id": cat_id,
                        "name": e.category.name,
                        "color": e.category.color,
                        "icon": e.category.icon,
                        "kind": e.category.kind,
                        "minutes": 0,
                    }
                by_category[cat_id]["minutes"] += mins
                by_kind[e.category.kind] += mins
                by_day[day_key][e.category.name] += mins
                by_day_kind[day_key][e.category.kind] += mins
                if e.category.kind == "productive":
                    by_day_prod[day_key] += mins
                    _spread_hours(prod_by_hour, e.start_time, e.end_time)
            else:
                by_kind["neutral"] += mins
                by_day[day_key]["Без категории"] += mins
                by_day_kind[day_key]["neutral"] += mins

        productive = by_kind.get("productive", 0)
        waste = by_kind.get("waste", 0)
        neutral = by_kind.get("neutral", 0)
        productivity_index = round(productive / total_minutes * 100) if total_minutes else 0

        num_days = (date.fromisoformat(date_to) - date.fromisoformat(date_from)).days + 1
        # Average over days that actually have entries, not the whole range.
        filled_days = len(by_day)

        # --- Sleep / wake analytics from DayLog ---
        # Fetch one extra day before the range so the first day's sleep (which
        # depends on the previous night's bedtime) can be computed.
        start_d = date.fromisoformat(date_from)
        end_d = date.fromisoformat(date_to)
        logs = DayLog.objects.filter(
            user=request.user,
            date__gte=(start_d - timedelta(days=1)).isoformat(),
            date__lte=date_to,
        )
        log_by_date = {log.date.isoformat(): log for log in logs}

        wake_vals, sleep_norm_vals, sleep_durations = [], [], []
        cur = start_d
        while cur <= end_d:
            log = log_by_date.get(cur.isoformat())
            if log:
                if log.wake_time:
                    wake_vals.append(_to_minutes(log.wake_time))
                if log.sleep_time:
                    bed = _to_minutes(log.sleep_time)
                    # Normalise bedtimes for averaging across midnight: an
                    # early-morning bedtime (before noon) is the late night of
                    # the same day (+24h), so 23:00 & 02:00 average to 00:30.
                    sleep_norm_vals.append(bed + 24 * 60 if bed < 12 * 60 else bed)
                # A night's sleep = previous day's bedtime -> this day's wake.
                prev = log_by_date.get((cur - timedelta(days=1)).isoformat())
                if log.wake_time and prev and prev.sleep_time:
                    duration = (_to_minutes(log.wake_time) - _to_minutes(prev.sleep_time)) % (
                        24 * 60
                    )
                    sleep_durations.append(duration)
            cur += timedelta(days=1)

        def _avg(values):
            return round(sum(values) / len(values)) if values else None

        avg_wake = _avg(wake_vals)
        avg_sleep = _avg(sleep_norm_vals)
        avg_sleep_minutes = _avg(sleep_durations)

        # --- Productivity trend per day (index = productive / total) ---
        trend = []
        cur = start_d
        while cur <= end_d:
            key = cur.isoformat()
            day_total = by_day_total.get(key, 0)
            kinds = by_day_kind.get(key, {})
            day_prod = kinds.get("productive", 0)
            trend.append(
                {
                    "date": key,
                    "productive": day_prod,
                    "neutral": kinds.get("neutral", 0),
                    "waste": kinds.get("waste", 0),
                    "total": day_total,
                    "index": round(day_prod / day_total * 100) if day_total else 0,
                }
            )
            cur += timedelta(days=1)

        # --- Goal & streak ---
        try:
            goal = max(0, int(request.query_params.get("goal", 0)))
        except ValueError:
            goal = 0
        goal_days = sum(1 for d in trend if goal and d["productive"] >= goal)
        current_streak = 0
        if goal:
            # Walk back from today over the last 90 days of productive totals.
            streak_entries = TimeEntry.objects.filter(
                user=request.user,
                category__kind="productive",
                date__gte=(today - timedelta(days=90)).isoformat(),
                date__lte=today.isoformat(),
            ).select_related("category")
            prod_per_day: dict[str, int] = defaultdict(int)
            for e in streak_entries:
                prod_per_day[e.date.isoformat()] += _minutes(e.start_time, e.end_time)
            day = today
            while prod_per_day.get(day.isoformat(), 0) >= goal:
                current_streak += 1
                day -= timedelta(days=1)

        prod_hours = [{"hour": h, "minutes": prod_by_hour.get(h, 0)} for h in range(24)]

        return Response(
            {
                "range": {"from": date_from, "to": date_to, "days": num_days},
                "totals": {
                    "minutes": total_minutes,
                    "productive": productive,
                    "neutral": neutral,
                    "waste": waste,
                    "productivity_index": productivity_index,
                    "filled_days": filled_days,
                    "avg_minutes_per_day": (
                        round(total_minutes / filled_days) if filled_days else 0
                    ),
                    "avg_wake_time": _fmt_time(avg_wake),
                    "avg_sleep_time": _fmt_time(avg_sleep),
                    "avg_sleep_minutes": avg_sleep_minutes,
                    "goal": goal,
                    "goal_days": goal_days,
                    "current_streak": current_streak,
                },
                "trend": trend,
                "prod_hours": prod_hours,
                "by_category": sorted(
                    by_category.values(), key=lambda x: x["minutes"], reverse=True
                ),
                "by_kind": [
                    {"kind": "productive", "minutes": productive},
                    {"kind": "neutral", "minutes": neutral},
                    {"kind": "waste", "minutes": waste},
                ],
                "by_day": [
                    {"date": day, **cats} for day, cats in sorted(by_day.items())
                ],
            }
        )
