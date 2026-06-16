from django.db import models
from django.contrib.auth.models import User


class Analysis(models.Model):
    TYPE_CHOICES = [
        ('text', 'Text'),
        ('url', 'URL'),
        ('image', 'Image'),
    ]
    VERDICT_CHOICES = [
        ('REAL', 'Real'),
        ('FAKE', 'Fake'),
        ('UNCERTAIN', 'Uncertain'),
    ]
    CONFIDENCE_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='analyses')
    analysis_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    input_content = models.TextField()
    image = models.ImageField(upload_to='uploads/', null=True, blank=True)

    verdict = models.CharField(max_length=10, choices=VERDICT_CHOICES, default='UNCERTAIN')
    credibility_score = models.IntegerField(default=50)
    confidence_level = models.CharField(max_length=10, choices=CONFIDENCE_CHOICES, default='MEDIUM')
    detected_category = models.CharField(max_length=100, blank=True)
    key_claims = models.JSONField(default=list)
    misleading_elements = models.JSONField(default=list)
    explanation = models.TextField(blank=True)
    recommendations = models.JSONField(default=list)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} | {self.analysis_type} | {self.verdict} | {self.created_at:%Y-%m-%d}"
