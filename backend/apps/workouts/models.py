from django.conf import settings
from django.db import models


class Region(models.TextChoices):
    """Top-level body zones — first step of the exercise drill-down picker."""

    CHEST = "chest", "Грудь"
    BACK = "back", "Спина"
    ARMS = "arms", "Руки"
    LEGS = "legs", "Ноги"
    CORE = "core", "Пресс"
    CARDIO = "cardio", "Кардио"


class Muscle(models.TextChoices):
    """Specific muscles — second step of the picker; carried by each exercise."""

    # Грудь
    CHEST = "chest", "Грудь"
    # Спина
    LATS = "lats", "Широчайшие"
    TRAPS = "traps", "Трапеции"
    LOWER_BACK = "lower_back", "Поясница"
    # Руки
    BICEPS = "biceps", "Бицепс"
    TRICEPS = "triceps", "Трицепс"
    FOREARMS = "forearms", "Предплечья"
    SHOULDERS = "shoulders", "Плечи"
    # Ноги
    QUADS = "quads", "Квадрицепс"
    HAMSTRINGS = "hamstrings", "Бицепс бедра"
    GLUTES = "glutes", "Ягодицы"
    CALVES = "calves", "Икры"
    # Пресс
    ABS = "abs", "Пресс"
    OBLIQUES = "obliques", "Косые"
    # Кардио
    CARDIO = "cardio", "Кардио"


class Tracking(models.TextChoices):
    """How a set is measured, which drives the editor inputs per exercise."""

    WEIGHT_REPS = "weight_reps", "Вес и повторения"
    BODYWEIGHT = "bodyweight", "Свой вес (вес опционально)"
    DURATION = "duration", "Время"
    DISTANCE = "distance", "Дистанция и время"


# Muscle → region grouping, drives the drill-down picker (зона → мышца).
MUSCLES_BY_REGION: dict[str, list[str]] = {
    Region.CHEST: [Muscle.CHEST],
    Region.BACK: [Muscle.LATS, Muscle.TRAPS, Muscle.LOWER_BACK],
    Region.ARMS: [Muscle.BICEPS, Muscle.TRICEPS, Muscle.SHOULDERS, Muscle.FOREARMS],
    Region.LEGS: [Muscle.QUADS, Muscle.HAMSTRINGS, Muscle.GLUTES, Muscle.CALVES],
    Region.CORE: [Muscle.ABS, Muscle.OBLIQUES],
    Region.CARDIO: [Muscle.CARDIO],
}

# Accent colour per region — mirrors the per-category colour used on the Day page.
REGION_COLORS: dict[str, str] = {
    Region.CHEST: "#ff8c42",
    Region.BACK: "#4f8cff",
    Region.ARMS: "#a78bfa",
    Region.LEGS: "#3ddc97",
    Region.CORE: "#f4c430",
    Region.CARDIO: "#22d3ee",
}


def taxonomy() -> list[dict]:
    """Region → muscles tree with labels and colours, for the picker UI."""
    return [
        {
            "region": region,
            "region_label": Region(region).label,
            "color": REGION_COLORS[region],
            "muscles": [
                {"muscle": m, "muscle_label": Muscle(m).label} for m in muscles
            ],
        }
        for region, muscles in MUSCLES_BY_REGION.items()
    ]


# Seeded as global (user=null) exercises via data migration. Each exercise carries
# its zone + primary muscle (so the picker doubles as a filter and per-muscle stats
# come for free) and a tracking type that decides which inputs the editor shows.
DEFAULT_EXERCISES = [
    # Грудь
    {"name": "Жим лёжа", "region": Region.CHEST, "primary_muscle": Muscle.CHEST},
    {"name": "Жим гантелей лёжа", "region": Region.CHEST, "primary_muscle": Muscle.CHEST},
    {"name": "Жим в наклоне", "region": Region.CHEST, "primary_muscle": Muscle.CHEST},
    {"name": "Сведение в кроссовере", "region": Region.CHEST, "primary_muscle": Muscle.CHEST},
    {"name": "Отжимания", "region": Region.CHEST, "primary_muscle": Muscle.CHEST, "tracking": Tracking.BODYWEIGHT},
    {"name": "Брусья", "region": Region.CHEST, "primary_muscle": Muscle.CHEST, "tracking": Tracking.BODYWEIGHT},
    # Спина
    {"name": "Подтягивания", "region": Region.BACK, "primary_muscle": Muscle.LATS, "tracking": Tracking.BODYWEIGHT},
    {"name": "Тяга верхнего блока", "region": Region.BACK, "primary_muscle": Muscle.LATS},
    {"name": "Горизонтальная тяга", "region": Region.BACK, "primary_muscle": Muscle.LATS},
    {"name": "Тяга штанги в наклоне", "region": Region.BACK, "primary_muscle": Muscle.LATS},
    {"name": "Становая тяга", "region": Region.BACK, "primary_muscle": Muscle.LOWER_BACK},
    {"name": "Шраги", "region": Region.BACK, "primary_muscle": Muscle.TRAPS},
    # Руки
    {"name": "Подъём штанги на бицепс", "region": Region.ARMS, "primary_muscle": Muscle.BICEPS},
    {"name": "Подъём гантелей на бицепс", "region": Region.ARMS, "primary_muscle": Muscle.BICEPS},
    {"name": "Молотковые сгибания", "region": Region.ARMS, "primary_muscle": Muscle.BICEPS},
    {"name": "Французский жим", "region": Region.ARMS, "primary_muscle": Muscle.TRICEPS},
    {"name": "Разгибание на блоке", "region": Region.ARMS, "primary_muscle": Muscle.TRICEPS},
    {"name": "Жим узким хватом", "region": Region.ARMS, "primary_muscle": Muscle.TRICEPS},
    {"name": "Жим штанги стоя", "region": Region.ARMS, "primary_muscle": Muscle.SHOULDERS},
    {"name": "Махи гантелями в стороны", "region": Region.ARMS, "primary_muscle": Muscle.SHOULDERS},
    {"name": "Сгибание запястий", "region": Region.ARMS, "primary_muscle": Muscle.FOREARMS},
    # Ноги
    {"name": "Приседания со штангой", "region": Region.LEGS, "primary_muscle": Muscle.QUADS},
    {"name": "Жим ногами", "region": Region.LEGS, "primary_muscle": Muscle.QUADS},
    {"name": "Выпады", "region": Region.LEGS, "primary_muscle": Muscle.QUADS},
    {"name": "Разгибание ног", "region": Region.LEGS, "primary_muscle": Muscle.QUADS},
    {"name": "Сгибание ног лёжа", "region": Region.LEGS, "primary_muscle": Muscle.HAMSTRINGS},
    {"name": "Румынская тяга", "region": Region.LEGS, "primary_muscle": Muscle.HAMSTRINGS},
    {"name": "Ягодичный мост", "region": Region.LEGS, "primary_muscle": Muscle.GLUTES},
    {"name": "Подъём на носки", "region": Region.LEGS, "primary_muscle": Muscle.CALVES},
    # Пресс
    {"name": "Скручивания", "region": Region.CORE, "primary_muscle": Muscle.ABS, "tracking": Tracking.BODYWEIGHT},
    {"name": "Планка", "region": Region.CORE, "primary_muscle": Muscle.ABS, "tracking": Tracking.DURATION},
    {"name": "Подъём ног в висе", "region": Region.CORE, "primary_muscle": Muscle.ABS, "tracking": Tracking.BODYWEIGHT},
    {"name": "Русский твист", "region": Region.CORE, "primary_muscle": Muscle.OBLIQUES, "tracking": Tracking.BODYWEIGHT},
    # Кардио
    {"name": "Бег", "region": Region.CARDIO, "primary_muscle": Muscle.CARDIO, "tracking": Tracking.DISTANCE},
    {"name": "Ходьба", "region": Region.CARDIO, "primary_muscle": Muscle.CARDIO, "tracking": Tracking.DISTANCE},
    {"name": "Велотренажёр", "region": Region.CARDIO, "primary_muscle": Muscle.CARDIO, "tracking": Tracking.DISTANCE},
    {"name": "Скакалка", "region": Region.CARDIO, "primary_muscle": Muscle.CARDIO, "tracking": Tracking.DURATION},
    {"name": "Гребной тренажёр", "region": Region.CARDIO, "primary_muscle": Muscle.CARDIO, "tracking": Tracking.DISTANCE},
]


class Exercise(models.Model):
    """Exercise library item. null user => global default, read-only for everyone."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="exercises",
    )
    name = models.CharField(max_length=120)
    region = models.CharField(max_length=16, choices=Region.choices)
    primary_muscle = models.CharField(max_length=16, choices=Muscle.choices)
    tracking = models.CharField(
        max_length=16, choices=Tracking.choices, default=Tracking.WEIGHT_REPS
    )
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["region", "name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.primary_muscle})"


class Workout(models.Model):
    """A single training session on a given day."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workouts",
    )
    date = models.DateField(db_index=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-start_time"]
        indexes = [models.Index(fields=["user", "date"])]

    def __str__(self) -> str:
        return f"Workout {self.date}"

    @property
    def duration_minutes(self) -> int | None:
        if not self.start_time or not self.end_time:
            return None
        start = self.start_time.hour * 60 + self.start_time.minute
        end = self.end_time.hour * 60 + self.end_time.minute
        if end < start:  # crosses midnight
            end += 24 * 60
        return end - start


class WorkoutExercise(models.Model):
    """One exercise performed within a session, holding an ordered list of sets."""

    workout = models.ForeignKey(
        Workout, on_delete=models.CASCADE, related_name="exercises"
    )
    exercise = models.ForeignKey(
        Exercise, on_delete=models.PROTECT, related_name="logged_in"
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return f"{self.exercise.name} @ {self.workout.date}"


class WorkoutSet(models.Model):
    """A single set. Which fields are used depends on the exercise's tracking type:
    weight_reps/bodyweight -> reps (+ optional weight); duration -> duration_seconds;
    distance -> distance_km (+ duration_seconds). `done` ticks off a planned set.
    """

    workout_exercise = models.ForeignKey(
        WorkoutExercise, on_delete=models.CASCADE, related_name="sets"
    )
    order = models.PositiveIntegerField(default=0)
    reps = models.PositiveIntegerField(null=True, blank=True)
    weight = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    distance_km = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    done = models.BooleanField(default=False)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return f"set #{self.order}"
