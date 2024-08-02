package com.stefan.matei.googlelocation;

import java.io.IOException;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.config.RequestConfig.Builder;
import org.apache.hc.client5.http.entity.UrlEncodedFormEntity;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.CloseableHttpResponse;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.NameValuePair;
import org.apache.hc.core5.http.ParseException;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.http.message.BasicNameValuePair;
import org.json.JSONException;
import org.json.JSONObject;

public class GoogleAdwordsLocationScript
{
  private static final Logger logger = Logger.getLogger(GoogleAdwordsLocationScript.class.getName());

  /**
   * Scrape uule parameter from the google anonymous preview tool script.
   *
   * @param locationId
   *          location id column for google geotargets file
   * @return uule parameter for the location
   * @throws IOException
   * @throws ParseException
   * @throws JSONException
   */
  public static String retrieveUULE(String locationId) throws IOException, ParseException, JSONException
  {
    int timeout = 30000;
    String serviceURL = "https://ads.google.com/aw_anonymous_diagnostic/_/rpc/PreviewService/GetPreviewAnonymous";
    HttpPost post = new HttpPost(serviceURL);

    String xrsfToken = "PQ8yWbxL8pfyq3vRtE479T_v3PI:1722504614381";
    String locationJson = "{\"2\":\"hotel\",\"4\":{\"2\":\"af\",\"3\":\"" + locationId +
        "\",\"5\":\"30001\",\"6\":\"610446\",\"7\":{\"1\":\"630153\",\"2\":\"630153\"}}}";

    List<NameValuePair> params = new ArrayList<NameValuePair>();
    params.add(new BasicNameValuePair("__ar", locationJson));
    post.setEntity(new UrlEncodedFormEntity(params, Charset.forName("utf-8")));

    post.setHeader("Accept", "application/json");
    post.setHeader("Content-type", "application/x-www-form-urlencoded");
    post.setHeader("X-Framework-Xsrf-Token", xrsfToken);

    Builder builder = RequestConfig.custom();

    builder.setConnectionRequestTimeout(timeout, TimeUnit.MILLISECONDS)
        .setConnectTimeout(timeout, TimeUnit.MILLISECONDS)
        .setResponseTimeout(timeout, TimeUnit.MILLISECONDS);

    RequestConfig requestConfig = builder.build();

    post.setConfig(requestConfig);

    try (CloseableHttpClient client = HttpClients.createDefault())
    {
      try (CloseableHttpResponse response = client.execute(post))
      {

        int responseCode = response.getCode();
        if (responseCode != 200)
        {
          logger.severe("Error sending request, response code: " + responseCode);
          logger.severe("Response: " + EntityUtils.toString(response.getEntity()));
          return null;
        }

        JSONObject responseJSON = new JSONObject(EntityUtils.toString(response.getEntity()));

        logger.info(responseJSON.toString());

        String uule = parseUULE(responseJSON);

        return uule;
      }
    }

  }

  private static String parseUULE(JSONObject response) throws JSONException
  {
    String url = response.getString("1");
    Pattern pattern = Pattern.compile(".*?uule=(.*?)&.*?");

    Matcher matcher = pattern.matcher(url);
    if (matcher.matches())
    {
      return matcher.group(1);
    }

    return null;
  }
}
