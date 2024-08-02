package com.stefan.matei.googlelocation;

import java.io.BufferedReader;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.apache.hc.core5.http.ParseException;
import org.json.JSONException;

/**
 * Iterate the google geolocation file and create a similar file that has
 * uule column for all the active locations.
 *
 */
public class ProcessGeoLocationFile
{
  private static final Logger logger = Logger.getLogger(ProcessGeoLocationFile.class.getName());

  private final String geoLocationInputFile;
  private final String geoLocationOutputFile;

  public ProcessGeoLocationFile(String geoLocationInputFile, String geoLocationOutputFile)
  {
    this.geoLocationInputFile = geoLocationInputFile;
    this.geoLocationOutputFile = geoLocationOutputFile;
  }

  public void processFile()
  {
    try (BufferedReader reader = new BufferedReader(new FileReader("geotargets-2024-07-11.csv"));
        PrintWriter writer = new PrintWriter(new OutputStreamWriter(
            new FileOutputStream("geotargets-2024-07-11-with-uule.csv"), "UTF-8"));)
    {

      String line = reader.readLine();
      writer.println(line + ",UULE");

      int index = 0;
      while (line != null)
      {
        line = reader.readLine();

        if (line != null)
        {
          if (index++ % 100 == 0)
          {
            logger.info("..............index " + index);
            writer.flush();
          }

          System.out.println(line);

          // get uule parameter only for active locations
          if (line.endsWith("Active"))
          {
            String locationId = line.substring(1, line.indexOf("\","));
            System.out.println(locationId);
            try
            {
              String uule = GoogleAdwordsLocationScript.retrieveUULE(locationId);
              System.out.println(uule);

              if (uule != null)
              {
                writer.println(line + "," + uule);
              }
            }
            catch (ParseException | JSONException e)
            {
              logger.log(Level.SEVERE, "Error retrieving uule parameter for " + locationId, e);
            }
          }
          else
          {
            writer.println(line + ",");
          }
        }
      }
    }
    catch (IOException e)
    {
      logger.log(Level.SEVERE, "Error processing geolocation file", e);
    }
  }
}
