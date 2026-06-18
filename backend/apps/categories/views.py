from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import DEFAULT_CATEGORIES, Category
from .serializers import CategorySerializer


class IsOwnerOrReadOnlyDefault(permissions.BasePermission):
    """Default (global) categories are read-only; custom ones editable by owner."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user_id == request.user.id


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnlyDefault]

    def get_queryset(self):
        # Global defaults (user is null) + the user's own categories.
        qs = Category.objects.filter(Q(user__isnull=True) | Q(user=self.request.user))
        if self.request.query_params.get("include_archived") != "true":
            qs = qs.filter(is_archived=False)
        return qs

    @action(detail=False, methods=["get"])
    def presets(self, request):
        """Ready-made categories the user can add with one click."""
        return Response(
            [
                {"name": d["name"], "color": d["color"], "icon": d["icon"], "kind": d["kind"]}
                for d in DEFAULT_CATEGORIES
            ]
        )

    def create(self, request, *args, **kwargs):
        # Re-creating a previously deleted (archived) category restores the same
        # row instead of making a duplicate — keeps old entries linked to it.
        name = str(request.data.get("name", "")).strip()
        archived = (
            Category.objects.filter(user=request.user, is_archived=True, name__iexact=name)
            .order_by("-id")
            .first()
        )
        if name and archived:
            archived.is_archived = False
            archived.color = request.data.get("color", archived.color)
            archived.icon = request.data.get("icon", archived.icon)
            archived.kind = request.data.get("kind", archived.kind)
            archived.save()
            return Response(
                CategorySerializer(archived).data, status=status.HTTP_201_CREATED
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        # Soft delete to keep historical stats intact.
        instance.is_archived = True
        instance.save(update_fields=["is_archived"])

    @action(detail=True, methods=["post"])
    def edit(self, request, pk=None):
        """Edit a category, choosing how it affects existing records.

        Body: {name, color, icon, kind, mode: "all" | "new"}.
        - "all": update in place — past and future records reflect the change.
        - "new": only when name/kind changed — archive the current category
          (keeps history intact) and create a fresh one for future records.
        Cosmetic-only changes (color/icon) always update in place.
        """
        category = self.get_object()
        if category.user_id != request.user.id:
            return Response(
                {"detail": "Нельзя редактировать эту категорию."},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data
        new_vals = {
            "name": data.get("name", category.name),
            "color": data.get("color", category.color),
            "icon": data.get("icon", category.icon),
            "kind": data.get("kind", category.kind),
        }
        critical_changed = (
            new_vals["name"] != category.name or new_vals["kind"] != category.kind
        )

        if data.get("mode") == "new" and critical_changed:
            category.is_archived = True
            category.save(update_fields=["is_archived"])
            new_cat = Category.objects.create(user=request.user, **new_vals)
            return Response(
                CategorySerializer(new_cat).data, status=status.HTTP_201_CREATED
            )

        for key, value in new_vals.items():
            setattr(category, key, value)
        category.save()
        return Response(CategorySerializer(category).data)
