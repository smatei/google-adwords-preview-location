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

    locationId = "1006605"; // no location
    uule = GoogleAdwordsLocationScript.retrieveUULE(locationId);
    logger.info(locationId + " UULE = " + uule);

    //    ProcessGeoLocationFile fileProcessor = new ProcessGeoLocationFile("geotargets-2026-08-12.csv", "geotargets-2026-08-12-with-uule.csv",
    //        "geotargets-2026-06-15-with-uule.csv");
    //    fileProcessor.processFile();
  }
}
