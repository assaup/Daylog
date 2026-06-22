from django.db import migrations


def sync_defaults(apps, schema_editor):
    """Set tracking on existing global exercises and add any new defaults
    (e.g. the cardio block), keyed by name. Idempotent."""
    from apps.workouts.models import DEFAULT_EXERCISES, Tracking

    Exercise = apps.get_model("workouts", "Exercise")
    for data in DEFAULT_EXERCISES:
        Exercise.objects.update_or_create(
            user=None,
            name=data["name"],
            defaults={
                "region": data["region"],
                "primary_muscle": data["primary_muscle"],
                "tracking": data.get("tracking", Tracking.WEIGHT_REPS),
            },
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("workouts", "0003_remove_exercise_is_bodyweight_exercise_tracking_and_more"),
    ]

    operations = [
        migrations.RunPython(sync_defaults, noop),
    ]
