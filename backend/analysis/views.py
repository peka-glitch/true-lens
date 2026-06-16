from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Avg
from django.core.files.storage import default_storage
from .models import Analysis
from .serializers import AnalysisSerializer
from . import ollama_service


class OllamaStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(ollama_service.ollama_status())


class AnalyzeTextView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Content is required.'}, status=400)
        try:
            result = ollama_service.analyze_text(content)
        except Exception as exc:
            return Response({'error': f'AI analysis failed: {exc}'}, status=500)
        analysis = Analysis.objects.create(
            user=request.user, analysis_type='text', input_content=content, **result
        )
        return Response(AnalysisSerializer(analysis).data, status=201)


class AnalyzeURLView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        url = request.data.get('url', '').strip()
        if not url:
            return Response({'error': 'URL is required.'}, status=400)
        try:
            result = ollama_service.analyze_url(url)
        except Exception as exc:
            return Response({'error': f'AI analysis failed: {exc}'}, status=500)
        analysis = Analysis.objects.create(
            user=request.user, analysis_type='url', input_content=url, **result
        )
        return Response(AnalysisSerializer(analysis).data, status=201)


class AnalyzeImageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        image = request.FILES.get('image')
        if not image:
            return Response({'error': 'Image file is required.'}, status=400)
        path = default_storage.save(f'uploads/{image.name}', image)
        full_path = default_storage.path(path)
        try:
            result = ollama_service.analyze_image(full_path)
        except Exception as exc:
            return Response({'error': f'AI analysis failed: {exc}'}, status=500)
        analysis = Analysis.objects.create(
            user=request.user, analysis_type='image',
            input_content=f'Image: {image.name}', image=path, **result
        )
        return Response(AnalysisSerializer(analysis).data, status=201)


class HistoryView(generics.ListAPIView):
    serializer_class = AnalysisSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Analysis.objects.filter(user=self.request.user)
        verdict = self.request.query_params.get('verdict')
        atype = self.request.query_params.get('type')
        if verdict:
            qs = qs.filter(verdict=verdict)
        if atype:
            qs = qs.filter(analysis_type=atype)
        return qs


class StatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        analyses = Analysis.objects.filter(user=request.user)
        total = analyses.count()
        verdict_counts = {v: analyses.filter(verdict=v).count() for v in ['REAL', 'FAKE', 'UNCERTAIN']}
        avg_score = analyses.aggregate(avg=Avg('credibility_score'))['avg'] or 0
        by_type = {t: analyses.filter(analysis_type=t).count() for t in ['text', 'url', 'image']}
        recent = AnalysisSerializer(analyses[:5], many=True).data
        return Response({
            'total': total,
            'verdict_counts': verdict_counts,
            'avg_credibility_score': round(avg_score, 1),
            'by_type': by_type,
            'recent': recent,
        })


class AnalysisDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = AnalysisSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Analysis.objects.filter(user=self.request.user)
