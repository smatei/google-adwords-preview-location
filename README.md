# Google Adwords Preview Location Paramter (uule)


Google Adwords API comes with a list of geotarget locations (countries, counties, cities, postal codes, airports, ...) regularly updated by Google.

[https://developers.google.com/google-ads/api/data/geotargets](https://developers.google.com/google-ads/api/data/geotargets)

One can find these locations in Google Adwords Preview tool too. If a location is selected, a google search with a certain 
location uule= parameter will be previewed. For example, 

```
"20342","Scotland","Scotland,United Kingdom","2826","GB","Province",Active
```

will have the location parameter

```
w+CAIQIFISCZ-h8gPE4mFIERQHwwnY-sHn
```

that is

[https://www.google.co.uk/search?q=hotel&uule=w+CAIQIFISCZ-h8gPE4mFIERQHwwnY-sHn](https://www.google.co.uk/search?q=hotel&uule=w+CAIQIFISCZ-h8gPE4mFIERQHwwnY-sHn)

This can be useful when trying to scrape/check google results from a certain location. There are various uule versions, as parameter, as cookie, some of them explained here:

[https://valentin.app/uule.html](https://valentin.app/uule.html)

## Web UI

The project also includes a web interface that exposes the latest geotarget file with UULE values:

**https://smatei.github.io/google-adwords-preview-location/**

It lets you browse countries, search/filter locations, copy UULE parameters, and test them directly on Google Search.

In order to retrieve the list of all the locations parameters for all the active locations in the latest geotarget file, I have used the Anonymous Ad Preview Tool

[https://ads.google.com/anon/AdPreview](https://ads.google.com/anon/AdPreview)

The project now fetches a fresh `x-framework-xsrf-token` automatically with Playwright and Chromium, so you no longer need to copy it manually from the browser.

On the first call to `GoogleAdwordsLocationScript.retrieveUULE(...)`, `XsrfTokenFetcher` opens the Anonymous Ad Preview Tool in a visible Chromium window, waits for the page to load, and captures the token from the first outgoing request that includes the `X-Framework-Xsrf-Token` header. Once captured, the listener is removed and the browser is closed.

If you ever need to verify which token is being used, open the Anonymous Ad Preview Tool and look at any request under `aw_anonymous_diagnostic/_/rpc/` in the Network tab. The `X-Framework-Xsrf-Token` request header is the one the script now retrieves automatically:

![image](https://github.com/user-attachments/assets/637384fa-cdcd-4730-ae50-101fb37a9db9)

If you want to force a new token for every run, simply restart the JVM — the token is requested again on the first `GoogleAdwordsLocationScript.retrieveUULE(...)` call.

ProcessGeoLocationFile.java class will take an original google geotarget file, iterate all the lines

```
"1000036","Junin","Junin,Buenos Aires Province,Argentina","20009","AR","City",Active
"1000037","La Plata","La Plata,Buenos Aires Province,Argentina","20009","AR","City",Active
"1000039","Lomas de Zamora","Lomas de Zamora,Buenos Aires Province,Argentina","20009","AR","City",Active
"1000040","Luis Guillon","Luis Guillon,Buenos Aires Province,Argentina","20009","AR","City",Active
"1000041","Lujan","Lujan,Buenos Aires Province,Argentina","20009","AR","City",Active
"1000042","Mar del Plata","Mar del Plata,Buenos Aires Province,Argentina","20009","AR","City",Active
```

send a json containing the location id to the script 

[https://ads.google.com/aw_anonymous_diagnostic/_/rpc/PreviewService/GetPreviewAnonymous](https://ads.google.com/aw_anonymous_diagnostic/_/rpc/PreviewService/GetPreviewAnonymous)

receive the response, parse the uule, and then append the uule location as a separate column for all the Active location rows.

```
"1000036","Junin","Junin,Buenos Aires Province,Argentina","20009","AR","City",Active,w+CAIQIFISCWWFvesz67iVEecTz0z-r1L7
"1000037","La Plata","La Plata,Buenos Aires Province,Argentina","20009","AR","City",Active,w+CAIQIFISCaGFAB8r5qKVEeMSc1TwRPy8
"1000039","Lomas de Zamora","Lomas de Zamora,Buenos Aires Province,Argentina","20009","AR","City",Active,w+CAIQIFISCXX7-Kth0ryVETIwcmKfEbTT
"1000040","Luis Guillon","Luis Guillon,Buenos Aires Province,Argentina","20009","AR","City",Active,w+CAIQIFISCX1uOV7S07yVEfs7mvmh4Yvr
"1000041","Lujan","Lujan,Buenos Aires Province,Argentina","20009","AR","City",Active,w+CAIQIFISCUHGZKaHfbyVEa4iU8WWhwlV
"1000042","Mar del Plata","Mar del Plata,Buenos Aires Province,Argentina","20009","AR","City",Active,w+CAIQIFISCQlC0xlN2YSVESbR_kuAcJbd
```

But this can take a while and I have already done this (geotargets-2025-04-01-with-uule.csv). If you want only one location, please use GoogleAdwordsLocationScript.retrieveUULE method.

## Compile

```
mvn compile
```

## Run


```
mvn exec:java
```
