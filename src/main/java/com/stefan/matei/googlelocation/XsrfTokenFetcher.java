package com.stefan.matei.googlelocation;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.Request;
import com.microsoft.playwright.options.LoadState;

import java.io.IOException;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;
import java.util.logging.Logger;

/**
 * Fetch a fresh X-Framework-Xsrf-Token from the Google Anonymous Ad Preview Tool
 * using Playwright + Chromium. The token is read from the outgoing RPC request
 * header instead of being copied manually from the browser.
 */
public class XsrfTokenFetcher
{
  private static final Logger logger = Logger.getLogger(XsrfTokenFetcher.class.getName());

  private static final String PREVIEW_URL = "https://ads.google.com/anon/AdPreview";
  private static final String RPC_URL_PATTERN = "**/aw_anonymous_diagnostic/_/rpc/PreviewService/GetPreviewAnonymous";

  /**
   * Open the Ad Preview tool in Chromium and capture the X-Framework-Xsrf-Token header.
   *
   * @return a fresh token, or null if it could not be captured
   * @throws IOException
   *           if Playwright or the browser cannot be launched
   */
  public static String fetchFreshToken() throws IOException
  {
    AtomicReference<String> tokenRef = new AtomicReference<>();
    CountDownLatch latch = new CountDownLatch(1);

    try (Playwright playwright = Playwright.create())
    {
      BrowserType.LaunchOptions launchOptions = new BrowserType.LaunchOptions()
          .setChannel("chrome")
          .setHeadless(false);

      Browser browser = playwright.chromium().launch(launchOptions);

      BrowserContext context = browser.newContext(new Browser.NewContextOptions()
          .setLocale("en-US")
          .setViewportSize(1280, 720));

      Page page = context.newPage();

      page.route(RPC_URL_PATTERN, route ->
      {
        logger.info("route " + route.toString());
        String token = route.request().headerValue("X-Framework-Xsrf-Token");
        if (token != null && !token.isEmpty())
        {
          tokenRef.set(token);
          logger.info("Captured fresh X-Framework-Xsrf-Token from route.");
          latch.countDown();
        }
        route.resume();
      });

      // Capture the first token seen on any page request that carries the header,
      // then stop listening so subsequent RPCs are ignored.
      final Consumer<Request>[] requestHandlerHolder = new Consumer[1];
      requestHandlerHolder[0] = request ->
      {
        String token = request.headerValue("X-Framework-Xsrf-Token");
        if (token != null && !token.isEmpty())
        {
          tokenRef.set(token);
          logger.info("Captured fresh X-Framework-Xsrf-Token from request: " + request.url());
          logger.info("Token " + token);
          latch.countDown();
          page.offRequest(requestHandlerHolder[0]);
        }
      };
      page.onRequest(requestHandlerHolder[0]);

      logger.info("Navigating to " + PREVIEW_URL);
      page.navigate(PREVIEW_URL);
      page.waitForLoadState(LoadState.NETWORKIDLE);

      boolean captured = latch.await(60, TimeUnit.SECONDS);
      if (!captured)
      {
        logger.warning("Token was not captured within 60 seconds.");
      }
    }
    catch (InterruptedException e)
    {
      Thread.currentThread().interrupt();
      throw new IOException("Interrupted while waiting for token", e);
    }
    catch (Exception e)
    {
      throw new IOException("Failed to fetch fresh token with Playwright", e);
    }

    return tokenRef.get();
  }
}
