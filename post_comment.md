Warm colors = higher fertility rates, cool colors = lower fertility rates. 3 major wars (Franco-Prussian War, World War I, World War II) stand out, as do more recent events like COVID.

French fertility trends by month from 1861 to 2023. Warm colors = higher fertility rates, cool colors = lower fertility rates. More charts posted here as comments since Reddit is giving me a hard time with image uploads.

Data is (births in month) / (number of days in the month) / (number of women age 15-44) * 100k

The "general fertility rate" is usually expressed as the number of live births per 1000 women age 15-44 in a given year; I scaled the daily fertility rate per 100k women to get whole numbers. 15-44 is the age range used by the UN. I aggregated single-year age groups from the Human Mortality Database and linearly interpolated between censuses.

Three major wars stand out: the Franco-Prussian War (1870-1871), World War I (1914-1918), and World War II (1939-1945). France had its own post-war baby boom after WWII, which has had echoes in the early 1980s and around 2010. Even at this scale you can see the effects of COVID in late 2020 and early 2021. I'm curious to hear what other patterns you see (I'm not an expert on French history).

Inspired by a post by Aaron Penne from 8 years ago on monthly USA birth rates. Data availability has improved drastically since then, yet `matplotlib` has not.

I used the `turbo` colormap in matplotlib because it was designed to make subtle value differences visible... does it work here?

Source: [Human Mortality Database](https://www.mortality.org/)

Tools: python, polars, matplotlib

I'm working on a series of these heatmaps for other countries and am looking for feedback on the approach, formatting, labeling, etc. I'll post the code and data in a GitHub repository soon, probably with another country's heatmap tweaked as per your suggestions.


---
Here's a heatmap covering recent fertility trends, from 1975 to 2023:


I'm also experimenting with a "wrapped" heatmap for countries with very long time series (like France). What do you think of this version? The color scale is still the same for every row.


This heatmap shows the seasonality of births from 1861 to 2023. The seasonality heatmap shows the percentage of each year's births in each month, but I scaled the monthly averages to a 30-day month and the annual average to a 360-day year so that February had a fighting chance. Births seem to have shifted from spring to summer/fall roughly since the introduction of birth control.


This heatmap shows the seasonality of births from 1975 to 2023 (percentage of annual births in each month, normalized to a 30-day month and 360-day year). Births seem to have shifted from spring to summer/fall roughly since the introduction of birth control:


This line chart shows the overall most and least common birth months since 1861 compared to other months and the yearly average. Before the mid-1970s April was usually the most common birth month:


Since 1975 the most common birth month has been July, a shift from the spring months seen earlier:


This violin plot shows the distribution of monthly birth rates relative to trailing 12-month average since 1975. Births tend to rise in spring and peak in summer/early fall (except August, vacation month):