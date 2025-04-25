package com.stefan.matei.googlelocation;

import java.io.IOException;
import java.util.logging.Logger;
import org.apache.hc.core5.http.ParseException;
import org.json.JSONException;

public class App
{
  private static final Logger logger = Logger.getLogger(App.class.getName());

  public static void main(String[] args) throws ParseException, JSONException, IOException
  {
    String locationId = "20342"; // Scotland,United Kigdom
    String uule = GoogleAdwordsLocationScript.retrieveUULE(locationId);
    logger.info(locationId + " UULE = " + uule);

    locationId = "1007336"; // Glasgow,Scotland,United Kingdom
    uule = GoogleAdwordsLocationScript.retrieveUULE(locationId);
    logger.info(locationId + " UULE = " + uule);

    locationId = "20229"; // Bavaria,Germany
    uule = GoogleAdwordsLocationScript.retrieveUULE(locationId);
    logger.info(locationId + " UULE = " + uule);

    locationId = "11"; // no location
    uule = GoogleAdwordsLocationScript.retrieveUULE(locationId);
    logger.info(locationId + " UULE = " + uule);

    //    ProcessGeoLocationFile fileProcessor = new ProcessGeoLocationFile("geotargets-2025-04-01.csv", "geotargets-2025-04-01-with-uule.csv",
    //        "geotargets-2024-07-11-with-uule.csv");
    //    fileProcessor.processFile();
  }
}
