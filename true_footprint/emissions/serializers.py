from rest_framework import serializers
from .models import Country, Emission, Population, Dashboard, Chart, Indicator, Observation


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


class IndicatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Indicator
        fields = ["id", "code", "name", "unit", "description", "source"]


class ObservationSerializer(serializers.ModelSerializer):
    country = serializers.SlugRelatedField(read_only=True, slug_field="iso_code")
    indicator = serializers.SlugRelatedField(read_only=True, slug_field="code")

    class Meta:
        model = Observation
        fields = ["id", "country", "year", "indicator", "value"]


class ChartSerializer(serializers.ModelSerializer):
    owner = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Chart
        fields = ['id', 'name', 'config', 'owner', 'created', 'updated']

    def get_owner(self, obj):
        return obj.owner.username if obj.owner else None


class DashboardSerializer(serializers.ModelSerializer):
    charts = ChartSerializer(many=True, read_only=True)
    class Meta:
        model = Dashboard
        fields = ['id', 'name', 'charts']