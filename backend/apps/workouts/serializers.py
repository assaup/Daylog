from django.db import transaction
from rest_framework import serializers

from .models import (
    Exercise,
    Muscle,
    Region,
    Workout,
    WorkoutExercise,
    WorkoutSet,
)


class ExerciseSerializer(serializers.ModelSerializer):
    is_default = serializers.SerializerMethodField()
    region_label = serializers.SerializerMethodField()
    muscle_label = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = [
            "id",
            "name",
            "region",
            "region_label",
            "primary_muscle",
            "muscle_label",
            "tracking",
            "is_archived",
            "is_default",
        ]
        read_only_fields = ["id", "is_archived"]

    def get_is_default(self, obj: Exercise) -> bool:
        return obj.user_id is None

    def get_region_label(self, obj: Exercise) -> str:
        return Region(obj.region).label

    def get_muscle_label(self, obj: Exercise) -> str:
        return Muscle(obj.primary_muscle).label


class WorkoutSetSerializer(serializers.ModelSerializer):
    volume = serializers.SerializerMethodField()

    class Meta:
        model = WorkoutSet
        fields = [
            "id",
            "order",
            "reps",
            "weight",
            "duration_seconds",
            "distance_km",
            "done",
            "volume",
        ]
        read_only_fields = ["id", "volume"]

    def get_volume(self, obj: WorkoutSet) -> float:
        if not obj.weight or not obj.reps:
            return 0.0
        return round(float(obj.weight) * obj.reps, 2)


class WorkoutExerciseSerializer(serializers.ModelSerializer):
    sets = WorkoutSetSerializer(many=True)
    exercise_detail = ExerciseSerializer(source="exercise", read_only=True)

    class Meta:
        model = WorkoutExercise
        fields = ["id", "exercise", "exercise_detail", "order", "sets"]
        read_only_fields = ["id"]


class WorkoutSerializer(serializers.ModelSerializer):
    exercises = WorkoutExerciseSerializer(many=True)
    duration_minutes = serializers.IntegerField(read_only=True)
    totals = serializers.SerializerMethodField()

    class Meta:
        model = Workout
        fields = [
            "id",
            "date",
            "start_time",
            "end_time",
            "note",
            "duration_minutes",
            "exercises",
            "totals",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "duration_minutes", "created_at", "updated_at"]

    def get_totals(self, obj: Workout) -> dict:
        sets = reps = duration = 0
        volume = distance = 0.0
        for we in obj.exercises.all():
            for s in we.sets.all():
                sets += 1
                reps += s.reps or 0
                duration += s.duration_seconds or 0
                if s.distance_km:
                    distance += float(s.distance_km)
                if s.weight and s.reps:
                    volume += float(s.weight) * s.reps
        return {
            "exercises": obj.exercises.count(),
            "sets": sets,
            "reps": reps,
            "volume": round(volume, 2),
            "duration_seconds": duration,
            "distance_km": round(distance, 2),
        }

    def validate_exercise_ownership(self, exercises_data):
        """Each referenced exercise must be global or owned by the user."""
        user = self.context["request"].user
        for ex_data in exercises_data:
            ex = ex_data["exercise"]
            if ex.user_id is not None and ex.user_id != user.id:
                raise serializers.ValidationError("Exercise does not belong to you.")

    def _write_children(self, workout: Workout, exercises_data: list) -> None:
        """Replace the workout's exercises/sets with the submitted nested data."""
        workout.exercises.all().delete()
        for ex_index, ex_data in enumerate(exercises_data):
            sets_data = ex_data.pop("sets", [])
            we = WorkoutExercise.objects.create(
                workout=workout,
                exercise=ex_data["exercise"],
                order=ex_data.get("order", ex_index),
            )
            WorkoutSet.objects.bulk_create(
                [
                    WorkoutSet(
                        workout_exercise=we,
                        order=s.get("order", s_index),
                        reps=s.get("reps"),
                        weight=s.get("weight"),
                        duration_seconds=s.get("duration_seconds"),
                        distance_km=s.get("distance_km"),
                        done=s.get("done", False),
                    )
                    for s_index, s in enumerate(sets_data)
                ]
            )

    @transaction.atomic
    def create(self, validated_data):
        exercises_data = validated_data.pop("exercises", [])
        self.validate_exercise_ownership(exercises_data)
        workout = Workout.objects.create(
            user=self.context["request"].user, **validated_data
        )
        self._write_children(workout, exercises_data)
        return workout

    @transaction.atomic
    def update(self, instance, validated_data):
        exercises_data = validated_data.pop("exercises", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if exercises_data is not None:
            self.validate_exercise_ownership(exercises_data)
            self._write_children(instance, exercises_data)
        return instance
