import io
import pandas as pd
import requests
from django.core.management.base import BaseCommand
from emissions.models import Country, Indicator, Observation

OWID_URL = "https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv"

# Optional, extend as desired:
UNIT_MAP = {
    "co2": "Mt CO₂",
    "co2_per_capita": "t CO₂/person",
    "consumption_co2": "Mt CO₂",
    "consumption_co2_per_capita": "t CO₂/person",
    "gdp": "intl-$ (PPP)",
    "population": "people",
    # add more if you care about labels; leaving blank is fine
}

SKIP_COLS = {"country", "iso_code", "year"}  # metadata, not indicators

class Command(BaseCommand):
    help = "Load ALL OWID indicators into Indicator/Observation tables"

    def handle(self, *args, **options):
        resp = requests.get(OWID_URL, timeout=60)
        resp.raise_for_status()
        df = pd.read_csv(io.StringIO(resp.text))

        # Ensure core columns exist
        for col in ["country", "iso_code", "year"]:
            if col not in df.columns:
                raise RuntimeError(f"Missing required column {col}")

        # Create/update countries with proper names
        for iso, name in df[["iso_code", "country"]].drop_duplicates().itertuples(index=False):
            if isinstance(iso, str) and len(iso) == 3:
                Country.objects.update_or_create(
                    iso_code=iso,
                    defaults={"name": name}
                )

        # Create indicators (for every numeric column)
        indicator_codes = [c for c in df.columns if c not in SKIP_COLS]
        for code in indicator_codes:
            # human-ish name
            name = code.replace("_", " ").title()
            Indicator.objects.update_or_create(
                code=code,
                defaults={
                    "name": name,
                    "unit": UNIT_MAP.get(code, ""),
                    "source": "OWID CO₂ dataset"
                }
            )

        # Insert observations (skip aggregates like OWID_WRL)
        df = df[df["iso_code"].str.len() == 3]

        # melt to long form for bulk insert (faster than row loops)
        long = df.melt(id_vars=["iso_code", "year"], value_vars=indicator_codes,
                       var_name="code", value_name="value").dropna(subset=["value"])

        # Map FK ids to speed things up
        iso_to_country_id = dict(Country.objects.values_list("iso_code", "id"))
        code_to_indicator_id = dict(Indicator.objects.values_list("code", "id"))

        # Build Observation objects in chunks
        to_create = []
        for row in long.itertuples(index=False):
            country_id = iso_to_country_id.get(row.iso_code)
            indicator_id = code_to_indicator_id.get(row.code)
            if not country_id or not indicator_id:
                continue
            to_create.append(Observation(
                country_id=country_id,
                year=int(row.year),
                indicator_id=indicator_id,
                value=float(row.value),
            ))
            if len(to_create) >= 5000:
                Observation.objects.bulk_create(to_create, ignore_conflicts=True)
                to_create = []

        if to_create:
            Observation.objects.bulk_create(to_create, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS("Loaded OWID indicators & observations"))
