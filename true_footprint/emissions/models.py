from django.db import models

from true_footprint import settings


class Country(models.Model):
    name = models.CharField(max_length=100, unique=True)
    iso_code = models.CharField(max_length=3, unique=True)

    def __str__(self):
        return self.name
    

class Population(models.Model):
    country    = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name='populations'
    )
    year       = models.PositiveIntegerField()
    population = models.BigIntegerField(
        help_text="Total population for country-year"
    )

    class Meta:
        unique_together = ('country', 'year')
        ordering = ['country__iso_code', 'year']

    def __str__(self):
        return f"{self.country.iso_code} - {self.year}: {self.population}"


class Emission(models.Model):
    TERRITORIAL = 'territorial'
    CONSUMPTION = 'consumption'
    BASIS_CHOICES = [
        (TERRITORIAL, 'Territorial'),
        (CONSUMPTION, 'Consumption-based'),
    ]

    country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='emissions')
    year = models.PositiveIntegerField()
    basis = models.CharField(max_length=20, choices=BASIS_CHOICES)
    value = models.FloatField(help_text="Emissions in metric tonnes CO₂ equivalent")

    class Meta:
        unique_together = ('country', 'year', 'basis')
        ordering = ['country__iso_code', 'year']

    def __str__(self):
        return f"{self.country.iso_code} - {self.year} ({self.basis})"
    

class Indicator(models.Model):
    code = models.CharField(max_length=64, unique=True)  # e.g., "co2", "co2_per_capita"
    name = models.CharField(max_length=255)
    unit = models.CharField(max_length=64, blank=True)
    description = models.TextField(blank=True)
    source = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} ({self.unit})"

class Observation(models.Model):
    country = models.ForeignKey("emissions.Country", on_delete=models.CASCADE, related_name="observations")
    year = models.PositiveIntegerField()
    indicator = models.ForeignKey(Indicator, on_delete=models.CASCADE, related_name="observations")
    value = models.FloatField()

    class Meta:
        unique_together = ("country", "year", "indicator")
        ordering = ["country__iso_code", "year", "indicator__code"]

    def __str__(self):
        return f"{self.country.iso_code}-{self.year}-{self.indicator.code}: {self.value}"
    

# User Saving Models

class Dashboard(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL,
                              on_delete=models.CASCADE,
                              related_name='dashboards')
    name = models.CharField(max_length=100)
    created = models.DateTimeField(auto_now_add=True)


class Chart(models.Model):
    owner   = models.ForeignKey('auth.User', null=True, blank=True,
                                on_delete=models.SET_NULL, related_name='charts')
    name    = models.CharField(max_length=150)
    config  = models.JSONField()
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated']
        constraints = [
            models.UniqueConstraint(fields=['owner', 'name'], name='uniq_owner_name')
        ]

    def __str__(self):
        return self.name
