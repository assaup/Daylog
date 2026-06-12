from django.contrib import admin

from .models import DayLog, TimeEntry


@admin.register(TimeEntry)
class TimeEntryAdmin(admin.ModelAdmin):
    list_display = ("date", "start_time", "end_time", "category", "user")
    list_filter = ("date", "category")
    search_fields = ("note",)


@admin.register(DayLog)
class DayLogAdmin(admin.ModelAdmin):
    list_display = ("date", "wake_time", "sleep_time", "user")
    list_filter = ("date",)
