from django.db import migrations


def seed_exercises(apps, schema_editor):
    """Create the global (user=null) default exercise library, idempotently."""
    from apps.workouts.models import DEFAULT_EXERCISES

    Exercise = apps.get_model("workouts", "Exercise")
    for data in DEFAULT_EXERCISES:
        Exercise.objects.get_or_create(
            user=None,
            name=data["name"],
            defaults={
                "region": data["region"],
                "primary_muscle": data["primary_muscle"],
                "is_bodyweight": data.get("is_bodyweight", False),
            },
        )


def unseed_exercises(apps, schema_editor):
    from apps.workouts.models import DEFAULT_EXERCISES

    Exercise = apps.get_model("workouts", "Exercise")
    names = [d["name"] for d in DEFAULT_EXERCISES]
    Exercise.objects.filter(user__isnull=True, name__in=names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("workouts", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_exercises, unseed_exercises),
    ]
