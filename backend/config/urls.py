"""Root URL configuration."""
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.entries.views import DayLogView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/categories/", include("apps.categories.urls")),
    path("api/day/", DayLogView.as_view()),
    path("api/entries/", include("apps.entries.urls")),
    path("api/stats/", include("apps.stats.urls")),
    path("api/workouts/", include("apps.workouts.urls")),
    # API docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]
