from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CountryViewSet, EmissionViewSet

router = DefaultRouter()
router.register(r'countries', CountryViewSet)
router.register(r'emissions', EmissionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]