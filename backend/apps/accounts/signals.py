from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.categories.models import DEFAULT_CATEGORIES, Category

User = get_user_model()


@receiver(post_save, sender=User)
def seed_default_categories(sender, instance, created, **kwargs):
    """Give every new user their own copy of the default categories."""
    if not created:
        return
    Category.objects.bulk_create(
        [Category(user=instance, **data) for data in DEFAULT_CATEGORIES]
    )
