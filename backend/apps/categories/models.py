from django.conf import settings
from django.db import models


class CategoryKind(models.TextChoices):
    PRODUCTIVE = "productive", "Productive"
    NEUTRAL = "neutral", "Neutral"
    WASTE = "waste", "Waste"


# Seeded for every new user on registration.
DEFAULT_CATEGORIES = [
    {"name": "Учёба", "color": "#4f8cff", "icon": "📚", "kind": CategoryKind.PRODUCTIVE},
    {"name": "Работа", "color": "#3ddc97", "icon": "💼", "kind": CategoryKind.PRODUCTIVE},
    {"name": "Тренировка", "color": "#ff8c42", "icon": "🏋️", "kind": CategoryKind.PRODUCTIVE},
    {"name": "Чтение", "color": "#a78bfa", "icon": "📖", "kind": CategoryKind.PRODUCTIVE},
    {"name": "Сон", "color": "#6b7280", "icon": "😴", "kind": CategoryKind.NEUTRAL},
    {"name": "Еда", "color": "#f4c430", "icon": "🍽️", "kind": CategoryKind.NEUTRAL},
    {"name": "Дорога", "color": "#94a3b8", "icon": "🚌", "kind": CategoryKind.NEUTRAL},
    {"name": "Соцсети / Тикток", "color": "#ff4d6d", "icon": "📱", "kind": CategoryKind.WASTE},
    {"name": "Сериалы / YouTube", "color": "#e11d48", "icon": "📺", "kind": CategoryKind.WASTE},
    {"name": "Другое", "color": "#cbd5e1", "icon": "❓", "kind": CategoryKind.NEUTRAL},
]


class Category(models.Model):
    # null user => global default category, visible to everyone but not editable.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="categories",
    )
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=9, default="#cbd5e1")
    icon = models.CharField(max_length=16, blank=True, default="")
    kind = models.CharField(
        max_length=16,
        choices=CategoryKind.choices,
        default=CategoryKind.NEUTRAL,
    )
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self) -> str:
        return f"{self.name} ({self.kind})"
