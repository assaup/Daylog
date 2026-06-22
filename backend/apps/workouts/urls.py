from rest_framework.routers import DefaultRouter

from .views import ExerciseViewSet, WorkoutViewSet

router = DefaultRouter()
# Register the more specific prefix first so /workouts/exercises/ resolves to
# the library, not the workout detail route under the empty prefix.
router.register(r"exercises", ExerciseViewSet, basename="exercise")
router.register(r"", WorkoutViewSet, basename="workout")

urlpatterns = router.urls
