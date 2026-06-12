from django.db.models import Q
from rest_framework import permissions, viewsets

from .models import Category
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

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        # Soft delete to keep historical stats intact.
        instance.is_archived = True
        instance.save(update_fields=["is_archived"])
