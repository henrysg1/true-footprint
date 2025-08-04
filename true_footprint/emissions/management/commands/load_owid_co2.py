import io
import pandas as pd
import requests
from django.core.management.base import BaseCommand
from emissions.models import Country, Emission, Population

OWID_URL = (
  "https://raw.githubusercontent.com/owid/co2-data/"
  "master/owid-co2-data.csv"
)

class Command(BaseCommand):
    help = "Load CO2 data from Our World in Data"

    def handle(self, *args, **options):
        resp = requests.get(OWID_URL, timeout=30)
        resp.raise_for_status()

        df = pd.read_csv(
            io.StringIO(resp.text),
            usecols=["country", "iso_code", "year", "co2", "consumption_co2", "population"]
        ).dropna(subset=["iso_code"])

        for _, row in df.iterrows():
            name = row.country
            iso  = row.iso_code
            year = int(row.year)
            terr = row.co2
            cons = row.consumption_co2
            pop  = row.population

            # Skip aggregates (OWID_WRL, etc.)
            if len(iso) != 3:
                continue

            country, _ = Country.objects.get_or_create(
                iso_code=iso,
                defaults={"name": name}
            )

            # Only upsert if territorial data exists
            if not pd.isna(terr):
                Emission.objects.update_or_create(
                    country=country,
                    year=year,
                    basis=Emission.TERRITORIAL,
                    defaults={"value": float(terr)}
                )

            # Only upsert if consumption data exists
            if not pd.isna(cons):
                Emission.objects.update_or_create(
                    country=country,
                    year=year,
                    basis=Emission.CONSUMPTION,
                    defaults={"value": float(cons)}
                )

            if not pd.isna(pop):
                Population.objects.update_or_create(
                    country=country,
                    year=year,
                    defaults={"population": int(pop)}
                )

        self.stdout.write(self.style.SUCCESS("✅ Loaded OWID CO2 data"))
