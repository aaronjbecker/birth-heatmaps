"""
Combine data from the Human Mortality Database, UN, and other sources to prepare data for fertility and seasonality heatmaps.

Data sources:
- Human Mortality Database (HMD)
- UN Population Division
- Other sources as needed e.g. Japan population data

NOTE: raw data files are not redistributed as per license terms from data providers.

All sources will be combined and aggregated into a single DataFrame and saved to a CSV file,
  which we can share and use in subsequent visualization scripts.

TODO: should we also compute total population?
"""
import polars as pl
import polars.selectors as cs
# pandas does have superior datetime handling functionality, but otherwise I prefer polars.
from pathlib import Path


# ===============================
# DIRECTORY SETTINGS
# ===============================
hmd_data_dir = Path(__file__).parent / 'hmd_data'
un_data_dir = Path(__file__).parent / 'data'

# ===============================================
# HUMAN MORTALITY DATABASE DATA LOADERS
# ===============================================
# list of countries with at least some data to plot;
# not all of these have enough data to be really interesting,
# and several will need to have either births or population filled from other sources.
countries_and_labels = [
    ('AUS', 'Australia'),
    ('AUT', 'Austria'),
    ('BEL', 'Belgium'),
    ('BGR', 'Bulgaria'),
    ('CAN', 'Canada'),
    ('CHE', 'Switzerland'),
    ('CHL', 'Chile'),
    ('CZE', 'Czechia'),
    ('DEUTE', 'East Germany'),
    ('DEUTNP', 'Germany'),
    ('DEUTW', 'West Germany'),
    ('DNK', 'Denmark'),
    ('ESP', 'Spain'),
    ('EST', 'Estonia'),
    ('FIN', 'Finland'),
    ('FRATNP', 'France'),
    ('GBR_NIR', 'Northern Ireland'),
    ('GBRTENW', 'England and Wales'),
    ('GBR_NP', 'United Kingdom'),
    ('GBR_SCO', 'Scotland'),
    ('GRC', 'Greece'),
    ('HKG', 'Hong Kong'),
    ('HRV', 'Croatia'),
    ('HUN', 'Hungary'),
    ('IRL', 'Ireland'),
    ('ISL', 'Iceland'),
    ('ISR', 'Israel'),
    ('ITA', 'Italy'),
    ('JPN', 'Japan'),
    ('KOR', 'South Korea'),
    ('LTU', 'Lithuania'),
    ('LUX', 'Luxembourg'),
    ('LVA', 'Latvia'),
    ('NLD', 'Netherlands'),
    ('NOR', 'Norway'),
    ('NZL_NP', 'New Zealand'),
    ('POL', 'Poland'),
    ('PRT', 'Portugal'),
    ('RUS', 'Russia'),
    ('SVK', 'Slovakia'),
    ('SVN', 'Slovenia'),
    ('SWE', 'Sweden'),
    ('UKR', 'Ukraine'),
    ('USA', 'United States of America'),
]

# these loaders make assumptions about the file structure relative to this script.
# Human Mortality Database files need to be manually downloaded due to terms of use.
def load_births_file(country_code: str) -> pl.DataFrame:
    file_path = hmd_data_dir / f'{country_code}birthbymonth.txt'
    return pl.read_csv(file_path, infer_schema_length=100000)

def load_population_file(country_code: str) -> pl.DataFrame:
    file_path = hmd_data_dir / f'{country_code}pop.txt'
    return pl.read_csv(file_path, infer_schema_length=100000)


def process_births_file(births: pl.DataFrame) -> pl.DataFrame:
    """
    Process raw births data from the Human Mortality Database.
    """
    # filter out totals and select needed columns
    # when there's more than one source per year and month, use the LDB flag to filter to the best source,
    #   but use data not included in the final life database if it's our only source.    
    if not births['Month'].dtype.is_integer():
        # some countries only have integer months, so filtering is unnecessary
        births = births.filter(~pl.col('Month').is_in(['TOT', 'UNK'])).with_columns(pl.col('Month').cast(pl.Int64))
    births = births.with_columns(pl.col('Births').count().over(['Year', 'Month']).alias('n_sources'))\
        .filter(pl.when(pl.col('n_sources') > 1).then(pl.col('LDB') == 1).otherwise(pl.lit(True)))\
        .select(
            pl.col('Year').cast(pl.Int64), 
            pl.col('Month').cast(pl.Int64), 
            pl.col('Births').cast(pl.Float64))\
        .group_by(['Year', 'Month']).agg(
            # if we still have multiple sources, average them (not sure if this happens, but just in case)
            pl.col('Births').mean()
        ).sort(['Year', 'Month'])    
    return births


def process_hmd_population_file(population: pl.DataFrame) -> pl.DataFrame:
    """
    Process raw population data from the Human Mortality Database.    
    """    
    if not population['Age'].dtype.is_integer():
        population = population.filter(~pl.col('Age').is_in(['TOT', 'UNK'])).with_columns(pl.col('Age').cast(pl.Int32))
    # when there's more than one source per year and month and age, use the LDB flag to filter to the best source,
    #   but use data not included in the final life database if it's our only source.
    population = population.with_columns(pl.col('Population').count().over(['Year', 'Month', 'Age']).alias('n_sources'))\
        .filter(pl.when(pl.col('n_sources') > 1).then(pl.col('LDB') == 1).otherwise(pl.lit(True)))\
        .select(
            pl.col('Year').cast(pl.Int64), 
            pl.col('Month').cast(pl.Int64), # month here refers to timing of census/survey, probably not a monthly series.
            pl.col('Sex'),
            pl.col('Age').cast(pl.Int32), 
            pl.col('Population').cast(pl.Float64))\
        .group_by(['Year', 'Month', 'Sex', 'Age']).agg(
            # if we still have multiple sources, average them (not sure if this happens, but just in case)
            pl.col('Population').mean()
        ).sort(['Year', 'Month', 'Sex', 'Age'])
    return population


def filter_hmd_population_for_fertility_rate(population: pl.DataFrame) -> pl.DataFrame:
    """
    Filter population data to only include female population of childbearing age (15-44) so we can calculate the general fertility rate,
    and return the total population of childbearing age by year and month.
    Assumes that we're filtering all countries at once 
        (after each file has been loaded and processed into one DataFrame)
    """
    return population.filter(pl.col('Sex') == 'f')\
        .filter(pl.col('Age') >= 15, pl.col('Age') <= 44)\
        .group_by(['Country', 'Year', 'Month']).agg(
        pl.col('Population').sum().alias('childbearing_population')
    ).sort(['Country', 'Year', 'Month'])


# ===============================================
# UNITED NATIONS DATA
# ===============================================
month_names = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December']
month_name_to_number = {month_name: i+1 for i, month_name in enumerate(month_names)}

def load_un_births_file() -> pl.DataFrame:
    # source: https://data.un.org/Data.aspx?d=POP&f=tableCode%3A55
    # data has to be manually downloaded (using export link), unzipped, moved and renamed
    file_path = un_data_dir / 'un_births_by_month_data_raw.csv'
    df = pl.read_csv(file_path, infer_schema_length=1000000)
    # average multiple sources per country/year/month when they exist (Egypt, Singapore)
    df = df.filter(pl.col('Month').str.strip_chars().is_in(month_names)).select(
        pl.col('Country or Area').alias('Country'),
        pl.col('Year').cast(pl.Int64),
        pl.col('Month').str.strip_chars().replace_strict(month_name_to_number, return_dtype=pl.Int64).alias('Month'),
        pl.col('Value').cast(pl.Float64).alias('Births')
    ).group_by(['Country', 'Year', 'Month']).agg(
        pl.col('Births').mean()
    ).sort(['Country', 'Year', 'Month'])
    return df


# source: https://w3.unece.org/PXWeb2015/pxweb/en/STAT/STAT__30-GE__01-Pop/001_en_GEPOAGESEX_REG_r.px/table/tableViewLayout1/
# only has data since 1980, filters have to be manually applied in the UI.


# this source doesn't let you download the full dataset; the rows are limited to a few countries,
#    and you can't filter out provisional data.
# def load_un_population_file() -> pl.DataFrame:
#     # source: https://data.un.org/Data.aspx?d=POP&f=tableCode%3A22
#     # data has to be manually downloaded (using export link), unzipped, moved and renamed
#     file_path = un_data_dir / 'un_pop_by_age_group_raw.csv'
#     df = pl.read_csv(file_path, infer_schema_length=1000000)    
#     # every country has Total for Area, not all have separate urban/rural divisions.
#     df = df.filter(pl.col('Area') == 'Total')
#     return df


def load_un_population_file(births_countries: list[str]) -> pl.DataFrame:
    # this is data from the world population prospects;
    # it's only the historical part of the dataset, but it's still labeled as an estimate.
    # source: https://population.un.org/wpp/downloads?folder=Standard%20Projections&group=CSV%20format
    fn = 'WPP2024_PopulationBySingleAgeSex_Medium_1950-2023.csv'
    file_path = un_data_dir / fn
    df = pl.read_csv(file_path, infer_schema_length=1000000).filter(
        pl.col('Location').is_in(births_countries),
        pl.col('AgeGrpSpan') == 1 # only want single age groups
    ).select(
        pl.col('Location').alias('Country'),
        pl.col('Time').cast(pl.Int64).alias('Year'),
        pl.lit(1).cast(pl.Int64).alias('Month'), # assume January 1st of each year
        pl.col('AgeGrpStart').cast(pl.Int32).alias('Age'),
        pl.col('PopMale'),
        pl.col('PopFemale')
    ).unpivot(
        on=['PopMale', 'PopFemale'], 
        index=['Country', 'Year', 'Month', 'Age'], 
        variable_name='Sex', value_name='Population')\
    .with_columns(
        # this file is in thousands, rest of data is in unscaled count.
        pl.col('Population') * 1000,
        pl.col('Sex').replace_strict({'PopMale': 'm', 'PopFemale': 'f'})
    )
    return df


def filter_un_population_for_fertility_rate(population: pl.DataFrame) -> pl.DataFrame:
    """
    Filter population data to only include female population of childbearing age (15-44) so we can calculate the general fertility rate,
    and return the total population of childbearing age by year and month.
    Assumes that we're filtering all countries at once.
    """
    return population.filter(pl.col('Sex') == 'f')\
        .filter(pl.col('Age') >= 15, pl.col('Age') <= 44)\
        .group_by(['Country', 'Year', 'Month']).agg(
        pl.col('Population').sum().alias('childbearing_population')
    ).sort(['Country', 'Year', 'Month'])


def load_all_hmd_births_files() -> pl.DataFrame:
    births_all = []
    for country_code, country_name in countries_and_labels:
        births = load_births_file(country_code)
        births = process_births_file(births)
        births = births.with_columns(pl.lit(country_name).alias('Country'))
        births_all.append(births)
    return pl.concat(births_all) 


def load_all_hmd_population_files() -> pl.DataFrame:
    population_all = []
    for country_code, country_name in countries_and_labels:
        population = load_population_file(country_code)
        population = process_hmd_population_file(population)
        population = population.with_columns(pl.lit(country_name).alias('Country'))
        population_all.append(population)
    return pl.concat(population_all) 

#===============================================
# JAPAN POPULATION DATA
#===============================================

def load_jpn_pop_data():
    """
    Assumes that the file is in the same directory as this script.
    The CSV file was parsed from R source code and is in wide format, which we'll melt into long format.
    Source: `fmsb` R package by Minato Nakazawa, who processed data from:
        Statistics Bureau, Ministry of Internal Affairs and Communications: Population Census, 1888-2020.
    """
    file_path = Path(__file__).parent / 'jpop.csv'
    df = pl.read_csv(file_path, infer_schema_length=100000)
    # melt into long format
    df = df.unpivot(
        on=cs.numeric().exclude('Year'), 
        index=['Year', 'Sex'], 
        variable_name='Age', value_name='Population'
    ).filter(pl.col('Age') != '85+')\
    .with_columns(
        # for consistency with other sources, convert to lowercase
        pl.col('Sex').str.to_lowercase(),
        pl.col('Age').cast(pl.Int32),
        pl.col('Year').cast(pl.Int64),
        pl.lit('Japan').alias('Country'),
        pl.lit(10).cast(pl.Int64).alias('Month') # assume October 1st of each year (cf. documentation)
    ).group_by(['Country', 'Year', 'Month', 'Sex', 'Age']).agg(
        pl.col('Population').mean().alias('Population') # average multiple sources per year and month
    ).sort(['Country', 'Year', 'Month', 'Sex', 'Age'])
    return df



if __name__ == '__main__':
    hmd_births = load_all_hmd_births_files().select('Country', 'Year', 'Month', 'Births')\
        .with_columns(pl.lit('HMD').alias('Source'))
    un_births = load_un_births_file().select('Country', 'Year', 'Month', 'Births')\
        .with_columns(pl.lit('UN').alias('Source'))

    # always prefer HMD data over UN data when both are available
    new_un_births = un_births.join(hmd_births, on=['Country', 'Year', 'Month'], how='anti')
    # Ensure correct types for schema compatibility
    all_births = pl.concat([hmd_births, new_un_births]).with_columns([
        pl.col('Year').cast(pl.Int64),
        pl.col('Month').cast(pl.Int64),
        pl.col('Births').cast(pl.Float64),
    ]).sort(['Country', 'Year', 'Month'])
    births_countries = all_births['Country'].unique().to_list()

    hmd_population = load_all_hmd_population_files()
    hmd_population = filter_hmd_population_for_fertility_rate(hmd_population)
    jpn_pop = load_jpn_pop_data()
    jpn_pop = filter_hmd_population_for_fertility_rate(jpn_pop).with_columns(pl.lit('JPOP').alias('Source'))
    hmd_population = hmd_population.with_columns(pl.lit('HMD').alias('Source'))
    # remove JPOP rows that are already in HMD
    new_jpn_population = jpn_pop.join(hmd_population, on=['Country', 'Year', 'Month'], how='anti')
    hmd_population = pl.concat([hmd_population, new_jpn_population]).sort(['Country', 'Year', 'Month'])
    un_population = load_un_population_file(births_countries)
    un_population = filter_un_population_for_fertility_rate(un_population)    
    un_population = un_population.with_columns(pl.lit('UN').alias('Source'))
    # always prefer HMD data over UN data when both are available; 
    # both sources have annual population data, so we can join on Year only.
    new_un_population = un_population.join(hmd_population, on=['Country', 'Year'], how='anti')
    # HMD already includes JPOP rows
    # Ensure correct types for schema compatibility
    all_population = pl.concat([hmd_population, new_un_population]).with_columns([
        pl.col('Year').cast(pl.Int64),
        pl.col('Month').cast(pl.Int64),
        pl.col('childbearing_population').cast(pl.Float64),
    ]).sort(['Country', 'Year', 'Month'])
    
    all_population.write_csv(Path(__file__).parent / 'combined_population_data.csv')
    all_births.write_csv(Path(__file__).parent / 'combined_births_data.csv')

    # what countries do we have earlier births data than population data for?
    first_births_year = all_births.group_by('Country').agg(
        pl.col('Year').min().alias('first_births_year')
    )
    first_population_year = all_population.group_by('Country').agg(
        pl.col('Year').min().alias('first_population_year')
    )
    country_timing = first_births_year.join(first_population_year, on='Country', how='left')
    # it's easier to find population data than births data; 
    # if we have births that predate population we can try to find population data for those years.
    births_earlier = country_timing.filter(pl.col('first_births_year') < pl.col('first_population_year'))
    births_earlier.write_csv(Path(__file__).parent / 'births_earlier_than_population.csv')
    # TODO: find any gaps where we have birth data but not population data (even interpolated)

    import sys
    sys.exit()
