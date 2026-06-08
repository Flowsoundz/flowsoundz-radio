import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.flowsoundz.radio",
  appName: "FlowSoundz Radio",
  webDir: "public", // placeholder — app loads from server.url below
  server: {
    url: "https://flowsoundzradio.com",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
    allowsLinkPreview: false,
    scrollEnabled: false,
    backgroundColor: "#07070f",
    preferredContentMode: "mobile",
    limitsNavigationsToAppBoundDomains: true,
  },
};

export default config;
