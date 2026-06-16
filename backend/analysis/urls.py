from django.urls import path
from .views import (
    AnalyzeTextView, AnalyzeURLView, AnalyzeImageView,
    HistoryView, StatsView, AnalysisDetailView, OllamaStatusView,
)

urlpatterns = [
    path('ollama/status/', OllamaStatusView.as_view()),
    path('analyze/text/', AnalyzeTextView.as_view()),
    path('analyze/url/', AnalyzeURLView.as_view()),
    path('analyze/image/', AnalyzeImageView.as_view()),
    path('history/', HistoryView.as_view()),
    path('stats/', StatsView.as_view()),
    path('analysis/<int:pk>/', AnalysisDetailView.as_view()),
]
