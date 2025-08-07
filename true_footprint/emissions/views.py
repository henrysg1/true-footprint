from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Country, Emission, Population, Dashboard, Chart
from .serializers import CountrySerializer, EmissionSerializer, DashboardSerializer, ChartSerializer


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


class DashboardViewSet(viewsets.ModelViewSet):
    serializer_class = DashboardSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Dashboard.objects.filter(owner=self.request.user)
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class ChartViewSet(viewsets.ModelViewSet):
    serializer_class = ChartSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Chart.objects.filter(dashboard__owner=self.request.user)
    def perform_create(self, serializer):
        dash_id = self.request.data.get('dashboard')
        serializer.save(dashboard_id=dash_id)