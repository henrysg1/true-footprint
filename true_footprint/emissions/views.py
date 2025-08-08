from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Country, Emission, Population, Dashboard, Chart, Indicator, Observation
from .serializers import CountrySerializer, EmissionSerializer, DashboardSerializer, ChartSerializer, IndicatorSerializer, ObservationSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def auth_check(request):
    return Response({'ok': True, 'user': request.user.username})


class IsAuthenticatedOrReadOnly(permissions.IsAuthenticatedOrReadOnly):
    pass


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.owner_id == getattr(request.user, 'id', None)


class CountryViewSet(viewsets.ReadOnlyModelViewSet):
    """List and retrieve countries"""
    queryset = Country.objects.all()
    serializer_class = CountrySerializer
    filter_backends = [DjangoFilterBackend]
    search_fields = ['name', 'iso_code']


class EmissionViewSet(viewsets.ReadOnlyModelViewSet):
    """List and filter emissions"""
    queryset = Emission.objects.select_related('country').all()
    serializer_class = EmissionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['country__iso_code', 'year', 'basis']


    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        iso  = request.query_params.get('country__iso_code')
        year = request.query_params.get('year')
        if not iso or not year:
            return Response(
              {'detail': 'Both country__iso_code and year are required.'},
              status=400
            )

        # lookup
        try:
            country = Country.objects.get(iso_code=iso)
        except Country.DoesNotExist:
            return Response({'detail': 'Country not found.'}, status=404)

        # territorial & consumption
        terr = Emission.objects.filter(
            country=country, year=year, basis=Emission.TERRITORIAL
        ).first()
        cons = Emission.objects.filter(
            country=country, year=year, basis=Emission.CONSUMPTION
        ).first()

        # population
        pop_obj = Population.objects.filter(
            country=country, year=year
        ).first()
        pop_val = pop_obj.population if pop_obj else None

        # build payload
        return Response({
          'country': iso,
          'year': int(year),
          'territorial': terr.value if terr else None,
          'consumption': cons.value if cons else None,
          'population': pop_val,
          'per_capita_territorial':
              (terr.value / pop_val) if (terr and pop_val) else None,
          'per_capita_consumption':
              (cons.value / pop_val) if (cons and pop_val) else None,
        })


class IndicatorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Indicator.objects.all()
    serializer_class = IndicatorSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["code"]

class ObservationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Observation.objects.select_related("country", "indicator")
    serializer_class = ObservationSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["country__iso_code", "indicator__code", "year"]

    @action(detail=False, methods=["get"], url_path="timeseries")
    def timeseries(self, request):
        """
        Returns a tidy array [{year, <code1>: val, <code2>: val, ...}, ...]
        plus a units map for the selected indicators.
        """
        iso = request.query_params.get("country__iso_code")
        codes_csv = request.query_params.get("indicators", "")
        year_min = request.query_params.get("year_min")
        year_max = request.query_params.get("year_max")

        if not iso or not codes_csv:
            return Response({"detail": "country__iso_code and indicators are required."}, status=400)

        codes = [c.strip() for c in codes_csv.split(",") if c.strip()]
        qs = self.get_queryset().filter(country__iso_code=iso, indicator__code__in=codes)
        if year_min:
            qs = qs.filter(year__gte=year_min)
        if year_max:
            qs = qs.filter(year__lte=year_max)

        qs = qs.order_by("year", "indicator__code")
        years = sorted({o.year for o in qs})
        rows_by_year = {y: {"year": y} for y in years}
        for o in qs:
            rows_by_year[o.year][o.indicator.code] = o.value
        data = [rows_by_year[y] for y in years]

        units = {ind.code: ind.unit for ind in Indicator.objects.filter(code__in=codes)}
        return Response({"data": data, "units": units})


class DashboardViewSet(viewsets.ModelViewSet):
    serializer_class = DashboardSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Dashboard.objects.filter(owner=self.request.user)
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ChartViewSet(viewsets.ModelViewSet):
    queryset = Chart.objects.all()
    serializer_class = ChartSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get('mine') and self.request.user.is_authenticated:
            qs = qs.filter(owner=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=['post'])
    def upsert(self, request):
        """Create or update by (owner, name)."""
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentication required'}, status=401)
        name = request.data.get('name')
        config = request.data.get('config')
        if not name:
            return Response({'detail': 'name is required'}, status=400)
        obj, created = Chart.objects.update_or_create(
            owner=request.user, name=name,
            defaults={'config': config}
        )
        data = self.get_serializer(obj).data
        return Response(data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)