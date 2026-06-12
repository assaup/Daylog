from rest_framework import serializers

from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    is_default = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "color",
            "icon",
            "kind",
            "is_archived",
            "is_default",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "is_default"]

    def get_is_default(self, obj: Category) -> bool:
        return obj.user_id is None
