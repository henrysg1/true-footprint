from rest_framework import serializers
from .models import Country, Emission, Population, Dashboard, Chart


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ['id', 'name', 'iso_code']


class EmissionSerializer(serializers.ModelSerializer):
    country = CountrySerializer(read_only=True)

    population = serializers.SerializerMethodField()
    per_capita = serializers.SerializerMethodField()

    class Meta:
        model = Emission
        fields = ['id', 'country', 'year', 'basis', 'value', 'population', 'per_capita']


    def get_population(self, obj):
        pop = Population.objects.filter(
            country=obj.country,
            year=obj.year
        ).first()
        return pop.population if pop else None


    def get_per_capita(self, obj):
        pop_val = self.get_population(obj)
        if pop_val:
            return obj.value / pop_val
        return None


class ChartSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chart
        fields = ['id', 'name', 'config']

class DashboardSerializer(serializers.ModelSerializer):
    charts = ChartSerializer(many=True, read_only=True)
    class Meta:
        model = Dashboard
        fields = ['id', 'name', 'charts']