package com.stefan.matei.googlelocation;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
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

  private String geoLocationInputFile;
  private String geoLocationOutputFile;
  private Map<String, String> previousUULSGeoMap;

  public ProcessGeoLocationFile(String geoLocationInputFile, String geoLocationOutputFile,
      String previousUULSGeoFile) throws FileNotFoundException, IOException
  {
    this.geoLocationInputFile = geoLocationInputFile;
    this.geoLocationOutputFile = geoLocationOutputFile;

    // Load already-computed UULEs from the destination file (if it exists) so
    // repeated runs resume from where they left off.
    loadPreviousUULEMap(geoLocationOutputFile);
    // Also merge any older reference file passed in, without overwriting existing values.
    loadPreviousUULEMap(previousUULSGeoFile, false);
  }

  public void processFile()
  {
    Set<String> expectedActiveIds = new HashSet<>();
    Set<String> writtenActiveIds = new HashSet<>();

    try (BufferedReader reader = new BufferedReader(
        new InputStreamReader(new FileInputStream(geoLocationInputFile), "UTF-8"));
        PrintWriter writer = new PrintWriter(new OutputStreamWriter(
            new FileOutputStream(geoLocationOutputFile), "UTF-8"));)
    {

      String line = reader.readLine();
      writer.println(line + ",UULE");

      int index = 0;
      while ((line = reader.readLine()) != null)
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
          expectedActiveIds.add(locationId);
          System.out.println(locationId);
          try
          {
            String previousUule = getPreviousUUL(locationId);

            String uule = previousUule != null ? previousUule
                : GoogleAdwordsLocationScript.retrieveUULE(locationId);
            System.out.println(locationId + " uule=" + uule);

            if (uule != null)
            {
              writer.println(line + "," + uule);
              writtenActiveIds.add(locationId);
            }
          }
          catch (ParseException | JSONException | IOException e)
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
    catch (IOException e)
    {
      logger.log(Level.SEVERE, "Error processing geolocation file", e);
    }

    validate(expectedActiveIds, writtenActiveIds);
  }

  private void validate(Set<String> expectedActiveIds, Set<String> writtenActiveIds)
  {
    logger.info("Validation: expected active locations = " + expectedActiveIds.size()
        + ", written active locations = " + writtenActiveIds.size());

    if (expectedActiveIds.size() != writtenActiveIds.size())
    {
      Set<String> missing = new HashSet<>(expectedActiveIds);
      missing.removeAll(writtenActiveIds);
      logger.warning("Validation FAILED: missing active locations = " + missing.size());
      for (String id : missing)
      {
        logger.warning("Missing location id: " + id);
      }
    }
    else
    {
      logger.info("Validation PASSED: all active locations are present in the destination file.");
    }
  }

  private void loadPreviousUULEMap(String previousUULSGeoFile) throws FileNotFoundException, IOException
  {
    loadPreviousUULEMap(previousUULSGeoFile, true);
  }

  private void loadPreviousUULEMap(String previousUULSGeoFile, boolean reset) throws FileNotFoundException, IOException
  {
    if (previousUULSGeoFile == null)
    {
      return;
    }

    if (reset || previousUULSGeoMap == null)
    {
      previousUULSGeoMap = new HashMap<>();
    }

    try (BufferedReader reader = new BufferedReader(new FileReader(previousUULSGeoFile)))
    {
      String line = reader.readLine();

      while ((line = reader.readLine()) != null)
      {
        String id = line.substring(1, line.indexOf(",") - 1);
        String uule = line.substring(line.lastIndexOf(",") + 1);

        if (uule != null && !uule.trim().isEmpty())
        {
          previousUULSGeoMap.put(id, uule);
        }
      }
    }
  }

  private String getPreviousUUL(String id)
  {
    if (previousUULSGeoMap == null)
    {
      return null;
    }

    return previousUULSGeoMap.get(id);
  }
}
