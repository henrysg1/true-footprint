from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CountryViewSet, EmissionViewSet, IndicatorViewSet, ObservationViewSet, ChartViewSet, auth_check

router = DefaultRouter()
router.register(r'countries', CountryViewSet)
router.register(r'emissions', EmissionViewSet)
router.register(r'indicators', IndicatorViewSet)
router.register(r'observations', ObservationViewSet)
router.register(r'charts', ChartViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth-check/', auth_check)
]