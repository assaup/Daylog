from django.db.models import Prefetch, Q
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from .models import Exercise, Workout, WorkoutExercise, taxonomy
from .serializers import ExerciseSerializer, WorkoutSerializer


class ExerciseViewSet(viewsets.ReadOnlyModelViewSet):
    """Exercise library for the picker: global defaults + the user's own."""

    serializer_class = ExerciseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Exercise.objects.filter(
            Q(user__isnull=True) | Q(user=self.request.user), is_archived=False
        )

    @action(detail=False, methods=["get"])
    def taxonomy(self, request: Request) -> Response:
        """Region → muscle tree that drives the drill-down picker."""
        return Response(taxonomy())


class WorkoutViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Workout.objects.filter(user=self.request.user).prefetch_related(
            Prefetch(
                "exercises",
                queryset=WorkoutExercise.objects.select_related("exercise").prefetch_related(
                    "sets"
                ),
            )
        )
        params = self.request.query_params
        if params.get("date"):
            qs = qs.filter(date=params["date"])
        if params.get("from"):
            qs = qs.filter(date__gte=params["from"])
        if params.get("to"):
            qs = qs.filter(date__lte=params["to"])
        return qs

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "request": self.request}
