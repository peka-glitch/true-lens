from django.contrib import admin
from .models import Analysis

@admin.register(Analysis)
class AnalysisAdmin(admin.ModelAdmin):
    list_display = ('user', 'analysis_type', 'verdict', 'credibility_score', 'created_at')
    list_filter = ('verdict', 'analysis_type', 'confidence_level')
    search_fields = ('user__username', 'input_content')
