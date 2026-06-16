from django.db import transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DayLog, TimeEntry
from .serializers import DayLogSerializer, TimeEntrySerializer


class DayLogView(APIView):
    """Wake-up / bedtime anchors for a given day. GET ?date=, PUT to upsert."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request) -> Response:
        date = request.query_params.get("date")
        if not date:
            return Response({"detail": "date is required"}, status=status.HTTP_400_BAD_REQUEST)
        log = DayLog.objects.filter(user=request.user, date=date).first()
        if not log:
            return Response({"date": date, "wake_time": None, "sleep_time": None})
        return Response(DayLogSerializer(log).data)

    def put(self, request: Request) -> Response:
        serializer = DayLogSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        # Only touch the fields actually sent, so updating one anchor (e.g.
        # yesterday's bedtime) doesn't wipe the other (that day's wake).
        defaults = {k: data[k] for k in ("wake_time", "sleep_time") if k in request.data}
        log, _ = DayLog.objects.update_or_create(
            user=request.user, date=data["date"], defaults=defaults
        )
        return Response(DayLogSerializer(log).data)


class TimeEntryViewSet(viewsets.ModelViewSet):
    serializer_class = TimeEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = TimeEntry.objects.filter(user=self.request.user).select_related("category")
        date = self.request.query_params.get("date")
        if date:
            qs = qs.filter(date=date)
        date_from = self.request.query_params.get("from")
        date_to = self.request.query_params.get("to")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"])
    def bulk(self, request: Request) -> Response:
        """Replace all entries for a date in one shot (used by the Day page)."""
        date = request.data.get("date")
        rows = request.data.get("entries", [])
        if not date:
            return Response(
                {"detail": "date is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Keep only meaningful rows (have a time range and a category) and stamp
        # each with the day's date, which the serializer requires per-row.
        cleaned = [
            {**r, "date": date}
            for r in rows
            if r.get("start_time") and r.get("end_time") and r.get("category")
        ]

        serializer = TimeEntrySerializer(
            data=cleaned, many=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            TimeEntry.objects.filter(user=request.user, date=date).delete()
            objects = [
                TimeEntry(user=request.user, **item)
                for item in serializer.validated_data
            ]
            TimeEntry.objects.bulk_create(objects)

        saved = self.get_queryset().filter(date=date)
        return Response(
            TimeEntrySerializer(saved, many=True, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )
