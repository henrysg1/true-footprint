from django.db import models

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
