// adapted from https://github.com/facebook/create-react-app/blob/main/packages/react-dev-utils/openBrowser.js

import { dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import spawn from "cross-spawn";
import open from "open";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://github.com/sindresorhus/open#app
var OSX_CHROME = "google chrome";

const Actions = Object.freeze({
  NONE: 0,
  BROWSER: 1,
  SCRIPT: 2,
});

/**
 *
 * @param {string | undefined} browser
 * @returns
 */
function getBrowserEnv(browser) {
  // Attempt to honor this environment variable.
  // It is specific to the operating system.
  // See https://github.com/sindresorhus/open#app for documentation.
  const value = browser || process.env.BROWSER;
  const args = process.env.BROWSER_ARGS
    ? process.env.BROWSER_ARGS.split(" ")
    : [];
  let action;
  if (!value) {
    // Default.
    action = Actions.BROWSER;
  } else if (value.toLowerCase().endsWith(".js")) {
    action = Actions.SCRIPT;
  } else if (value.toLowerCase() === "none") {
    action = Actions.NONE;
  } else {
    action = Actions.BROWSER;
  }
  return { action, value, args };
}

/**
 *
 * @param {string} scriptPath
 * @param {string} url
 * @returns
 */
function executeNodeScript(scriptPath = "", url) {
  const extraArgs = process.argv.slice(2);
  const child = spawn(process.execPath, [scriptPath, ...extraArgs, url], {
    stdio: "inherit",
  });
  child.on("close", (code) => {
    if (code !== 0) {
      console.log();
      console.log(
        "The script specified as BROWSER environment variable failed.",
      );
      console.log(scriptPath + " exited with code " + code + ".");
      console.log();
      return;
    }
  });
  return true;
}

/**
 *
 * @param {string | string[] | undefined} browser
 * @param {string} url
 * @param {string[]} args
 * @returns
 */
function startBrowserProcess(browser, url, args) {
  // If we're on OS X, the user hasn't specifically
  // requested a different browser, we can try opening
  // Chrome with AppleScript. This lets us reuse an
  // existing tab when possible instead of creating a new one.
  const shouldTryOpenChromiumWithAppleScript =
    process.platform === "darwin" &&
    (typeof browser !== "string" || browser === OSX_CHROME);

  if (shouldTryOpenChromiumWithAppleScript) {
    // Will use the first open browser found from list
    const supportedChromiumBrowsers = [
      "Google Chrome Canary",
      "Google Chrome Dev",
      "Google Chrome Beta",
      "Google Chrome",
      "Microsoft Edge",
      "Brave Browser",
      "Vivaldi",
      "Chromium",
    ];

    for (let chromiumBrowser of supportedChromiumBrowsers) {
      try {
        // Try our best to reuse existing tab
        // on OSX Chromium-based browser with AppleScript
        execSync('ps cax | grep "' + chromiumBrowser + '"');
        execSync(
          'osascript openChrome.applescript "' +
            encodeURI(url) +
            '" "' +
            chromiumBrowser +
            '"',
          {
            cwd: __dirname,
            stdio: "ignore",
          },
        );
        return true;
      } catch (err) {}
    }
  }

  // Another special case: on OS X, check if BROWSER has been set to "open".
  // In this case, instead of passing `open` to `opn` (which won't work),
  // just ignore it (thus ensuring the intended behavior, i.e. opening the system browser):
  // https://github.com/facebook/create-react-app/pull/1690#issuecomment-283518768
  if (process.platform === "darwin" && browser === "open") {
    browser = undefined;
  }

  // If there are arguments, they must be passed as array with the browser
  if (typeof browser === "string" && args.length > 0) {
    browser = [browser].concat(args);
  }

  // Fallback to open
  // (It will always open new tab)
  try {
    var options = {
      app: { name: browser || OSX_CHROME },
      wait: false,
      url: true,
    };
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    open(url, options).catch(() => {}); // Prevent `unhandledRejection` error.
    return true;
  } catch (err) {
    return false;
  }
}

/**
 *
 * @param {string} url
 * @param {string | undefined} browser
 * @returns
 */
function openBrowser(url, browser) {
  const { action, value, args } = getBrowserEnv(browser);
  switch (action) {
    case Actions.NONE:
      // Special case: BROWSER="none" will prevent opening completely.
      return false;
    case Actions.SCRIPT:
      return executeNodeScript(value, url);
    case Actions.BROWSER:
      return startBrowserProcess(value, url, args);
    default:
      throw new Error("Not implemented.");
  }
}

export default openBrowser;
