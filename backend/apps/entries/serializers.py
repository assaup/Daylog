from rest_framework import serializers

from .models import DayLog, TimeEntry


class DayLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DayLog
        fields = ["date", "wake_time", "sleep_time"]


class TimeEntrySerializer(serializers.ModelSerializer):
    duration_minutes = serializers.IntegerField(read_only=True)
    category_detail = serializers.SerializerMethodField()

    class Meta:
        model = TimeEntry
        fields = [
            "id",
            "date",
            "start_time",
            "end_time",
            "category",
            "category_detail",
            "note",
            "duration_minutes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "duration_minutes"]

    def get_category_detail(self, obj: TimeEntry):
        if not obj.category:
            return None
        return {
            "id": obj.category.id,
            "name": obj.category.name,
            "color": obj.category.color,
            "icon": obj.category.icon,
            "kind": obj.category.kind,
        }

    def validate_category(self, value):
        if value is None:
            return value
        user = self.context["request"].user
        if value.user_id is not None and value.user_id != user.id:
            raise serializers.ValidationError("Category does not belong to you.")
        return value

    def validate(self, attrs):
        start = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end = attrs.get("end_time", getattr(self.instance, "end_time", None))
        if start and end and start == end:
            raise serializers.ValidationError("End time must differ from start time.")
        return attrs
