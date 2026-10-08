// Phone alerts. v1 uses ntfy (free iPhone/Android app; you subscribe to a
// private topic name and anything POSTed to it shows up as a notification).
// To use your own Web Push code from Study Buddy instead, replace sendAlert.

export interface Alert {
  title: string;
  body: string;
  url?: string;
}

export async function sendAlert(topic: string | undefined, alert: Alert): Promise<boolean> {
  if (!topic) return false;
  const res = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
    method: "POST",
    body: alert.body,
    headers: {
      Title: alert.title,
      Tags: "construction",
      ...(alert.url ? { Click: alert.url } : {}),
    },
  });
  return res.ok;
}
