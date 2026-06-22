from django.contrib import admin

from .models import Exercise, Workout, WorkoutExercise, WorkoutSet


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ("name", "region", "primary_muscle", "tracking", "user")
    list_filter = ("region", "primary_muscle", "tracking")
    search_fields = ("name",)


class WorkoutSetInline(admin.TabularInline):
    model = WorkoutSet
    extra = 0


class WorkoutExerciseInline(admin.TabularInline):
    model = WorkoutExercise
    extra = 0


@admin.register(Workout)
class WorkoutAdmin(admin.ModelAdmin):
    list_display = ("date", "user", "start_time", "end_time")
    list_filter = ("date",)
    inlines = [WorkoutExerciseInline]


@admin.register(WorkoutExercise)
class WorkoutExerciseAdmin(admin.ModelAdmin):
    inlines = [WorkoutSetInline]
