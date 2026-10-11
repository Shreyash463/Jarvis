/**
 * J.A.R.V.I.S Personality Matrix
 * Clean, natural dialogue, state captions, and time-aware greetings.
 */

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) {
    return "Good morning, sir. All telemetry feeds are nominal and at your disposal.";
  } else if (hour >= 12 && hour < 18) {
    return "Good afternoon, sir. Tactical feeds active. How may I be of assistance?";
  } else {
    return "Good evening, sir. Lab subroutines running smoothly. Ready when you are.";
  }
}

export const ORB_CAPTIONS: Record<
  string,
  { label: string; subcaption: string }
> = {
  idle: {
    label: "STANDBY",
    subcaption: "Ready, sir.",
  },
  listening: {
    label: "LISTENING",
    subcaption: "Listening...",
  },
  thinking: {
    label: "THINKING",
    subcaption: "Thinking...",
  },
  executing: {
    label: "EXECUTING",
    subcaption: "Executing directive...",
  },
  speaking: {
    label: "RESPONDING",
    subcaption: "Speaking...",
  },
  error: {
    label: "SYSTEM FAULT",
    subcaption: "The core is not responding, sir.",
  },
  offline: {
    label: "OFFLINE",
    subcaption: "Reconnecting...",
  },
};

export const PERSONALITY = {
  greeting: getTimeGreeting,

  calendarResponse: (eventCount: number, nextTitle: string, nextTime: string) =>
    `You have ${eventCount} events on your schedule today, sir. Next up is ${nextTitle} at ${nextTime}.`,

  inboxResponse: (unreadCount: number) =>
    `You have ${unreadCount} unread emails, sir. The latest is from Vedant Shenoy regarding the systems audit.`,

  sendEmailAwaiting:
    "I have drafted the email for Vedant Shenoy, sir. Please authorize transmission.",

  sendEmailApproved:
    "Done, sir. The email has been dispatched to Vedant Shenoy.",

  sendEmailDenied:
    "Understood, sir. Transmission cancelled.",

  deleteFileAwaiting:
    "Warning, sir: this action will permanently delete the file from the cluster. Authorization required.",

  deleteFileApproved:
    "Confirmed, sir. The target file has been permanently deleted.",

  deleteFileDenied:
    "Deletion cancelled, sir. Files remain untouched.",

  weatherResponse: (city: string, temp: number, condition: string, humidity: number) =>
    `Conditions in ${city} are currently ${condition.toLowerCase()}, with a temperature of ${temp}°C and ${humidity}% humidity, sir.`,

  systemResponse: (cpu: number, ram: number, disk: number, uptime: string) =>
    `System vitals are nominal, sir. CPU is at ${cpu}%, RAM at ${ram}%, storage at ${disk}%, and uptime is ${uptime}.`,

  openAppResponse: (appName: string) =>
    `Opening ${appName} for you now, sir.`,

  musicResponse: (track: string, artist: string) =>
    `Playing "${track}" by ${artist} now, sir.`,

  fallbackReplies: [
    "At your service, sir. How may I assist you?",
    "Right away, sir. Standing by for instructions.",
    "Online and operational, sir.",
  ],
};
