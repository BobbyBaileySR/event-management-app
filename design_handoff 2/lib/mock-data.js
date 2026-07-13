// Shared mock data for the Event Management System design.

export const programs = ["Summit Series 2026", "Partner Enablement", "Developer Roadshow"];

export const events = [
  { id: "evt-01", name: "Product Summit — London", program: "Summit Series 2026", date: "Mar 12, 2026", time: "09:00 GMT", location: "The Barbican, London", status: "active", registered: 428, capacity: 500 },
  { id: "evt-02", name: "Product Summit — New York", program: "Summit Series 2026", date: "Apr 03, 2026", time: "09:30 EST", location: "Pier 57, NYC", status: "active", registered: 512, capacity: 600 },
  { id: "evt-03", name: "Partner Kickoff Breakfast", program: "Partner Enablement", date: "Feb 20, 2026", time: "08:00 GMT", location: "Setmore HQ, Bristol", status: "draft", registered: 34, capacity: 120 },
  { id: "evt-04", name: "Developer Roadshow — Berlin", program: "Developer Roadshow", date: "May 15, 2026", time: "10:00 CET", location: "Station Berlin", status: "active", registered: 189, capacity: 300 },
  { id: "evt-05", name: "Executive Roundtable", program: "Summit Series 2026", date: "Jan 28, 2026", time: "14:00 GMT", location: "The Ned, London", status: "cancelled", registered: 22, capacity: 40 },
  { id: "evt-06", name: "Developer Roadshow — Amsterdam", program: "Developer Roadshow", date: "Jun 09, 2026", time: "10:00 CET", location: "Beurs van Berlage", status: "draft", registered: 12, capacity: 250 },
  { id: "evt-07", name: "Regional Meetup — Austin", program: "", date: "Mar 22, 2026", time: "18:00 CST", location: "Capital Factory, Austin", status: "active", registered: 58, capacity: 80 },
  { id: "evt-08", name: "Customer Advisory Dinner", program: "", date: "Apr 18, 2026", time: "19:00 EST", location: "The Ned, NYC", status: "draft", registered: 14, capacity: 30 },
];

export const attendees = [
  { id: "att-01", name: "Amara Okafor", email: "amara.okafor@northwind.io", company: "Northwind", ticket: "Customer", status: "checked-in", checkedInAt: "08:52" },
  { id: "att-02", name: "Daniel Reyes", email: "d.reyes@lumefy.com", company: "Lumefy", ticket: "Customer", status: "checked-in", checkedInAt: "08:58" },
  { id: "att-03", name: "Priya Nair", email: "priya@meridian.co", company: "Meridian", ticket: "Customer", status: "registered", checkedInAt: null },
  { id: "att-04", name: "Tomás Alvarez", email: "tomas.a@baseline.dev", company: "Baseline", ticket: "Customer", status: "registered", checkedInAt: null },
  { id: "att-05", name: "Grace Whitmore", email: "grace.w@harbourpoint.com", company: "Harbour Point", ticket: "Customer", status: "registered", checkedInAt: null },
  { id: "att-06", name: "Kenji Watanabe", email: "kenji@fujidata.jp", company: "Fuji Data", ticket: "Customer", status: "checked-in", checkedInAt: "09:04" },
  { id: "att-07", name: "Sofia Rossi", email: "s.rossi@altura.it", company: "Altura", ticket: "Partner", status: "registered", checkedInAt: null },
  { id: "att-08", name: "Marcus Bell", email: "marcus.bell@vantage.io", company: "Vantage", ticket: "Customer", status: "registered", checkedInAt: null },
  { id: "att-09", name: "Lena Fischer", email: "lena.fischer@brightloop.com", company: "Brightloop", ticket: "Customer", status: "registered", checkedInAt: null },
  { id: "att-10", name: "Oliver Grant", email: "o.grant@parallel.io", company: "Parallel", ticket: "Partner", status: "checked-in", checkedInAt: "09:11" },
  { id: "att-11", name: "Naomi Cheng", email: "naomi.cheng@stackwell.com", company: "Stackwell", ticket: "Customer", status: "registered", checkedInAt: null },
  { id: "att-12", name: "Ravi Kapoor", email: "ravi@indigohealth.in", company: "Indigo Health", ticket: "Customer", status: "checked-in", checkedInAt: "09:14" },
  { id: "att-13", name: "Ellie Sandberg", email: "ellie.s@northgate.co", company: "Northgate", ticket: "Partner", status: "registered", checkedInAt: null },
  { id: "att-14", name: "Marco Silva", email: "marco.silva@atlasforge.com", company: "Atlas Forge", ticket: "Customer", status: "registered", checkedInAt: null },
  { id: "att-15", name: "Ingrid Solberg", email: "ingrid@fjordline.no", company: "Fjordline", ticket: "Customer", status: "checked-in", checkedInAt: "09:20" },
  { id: "att-16", name: "Jamal Osei", email: "jamal.osei@brightloop.com", company: "Brightloop", ticket: "Partner", status: "registered", checkedInAt: null },
  { id: "att-17", name: "Chloe Béranger", email: "chloe.b@lumiere.fr", company: "Lumière", ticket: "Customer", status: "registered", checkedInAt: null },
  { id: "att-18", name: "Diego Fernández", email: "diego.f@vertice.mx", company: "Vértice", ticket: "Customer", status: "checked-in", checkedInAt: "09:26" },
  { id: "att-19", name: "Hannah Kim", email: "hannah.kim@sundial.co", company: "Sundial", ticket: "Customer", status: "registered", checkedInAt: null },
  { id: "att-20", name: "Felix Bauer", email: "felix.bauer@ironclad.de", company: "Ironclad", ticket: "Partner", status: "registered", checkedInAt: null },
  { id: "att-21", name: "Aisha Rahman", email: "aisha.rahman@meridian.co", company: "Meridian", ticket: "Customer", status: "checked-in", checkedInAt: "09:31" },
  { id: "att-22", name: "Noah Petrov", email: "noah.petrov@fjordline.no", company: "Fjordline", ticket: "Customer", status: "registered", checkedInAt: null },
  { id: "att-23", name: "Isabel Duarte", email: "isabel.d@vertice.mx", company: "Vértice", ticket: "Partner", status: "registered", checkedInAt: null },
  { id: "att-24", name: "Theo Larsen", email: "theo.larsen@northgate.co", company: "Northgate", ticket: "Customer", status: "registered", checkedInAt: null },
  { id: "att-25", name: "Yuki Tanaka", email: "yuki.tanaka@fujidata.jp", company: "Fuji Data", ticket: "Customer", status: "checked-in", checkedInAt: "09:38" },
  { id: "att-26", name: "Clara Jensen", email: "clara.jensen@sundial.co", company: "Sundial", ticket: "Customer", status: "registered", checkedInAt: null },
  { id: "att-27", name: "Samuel Osei", email: "samuel.osei@ironclad.de", company: "Ironclad", ticket: "Partner", status: "registered", checkedInAt: null },
  { id: "att-28", name: "Beatriz Souza", email: "beatriz.souza@atlasforge.com", company: "Atlas Forge", ticket: "Customer", status: "registered", checkedInAt: null },
];

export const auditLog = [
  { id: "log-01", user: "Elena Marsh", action: "checked in", target: "Kenji Watanabe", time: "2 min ago", category: "checkin" },
  { id: "log-02", user: "Elena Marsh", action: "sent campaign", target: "“Doors open in 1 hour” to 428 attendees", time: "18 min ago", category: "email" },
  { id: "log-03", user: "James Cole", action: "updated event", target: "Product Summit — New York (capacity 600)", time: "1 hr ago", category: "event" },
  { id: "log-04", user: "James Cole", action: "created program", target: "Developer Roadshow", time: "3 hrs ago", category: "program" },
  { id: "log-05", user: "Priya Nair", action: "imported attendees", target: "142 contacts from HubSpot list “Q1 Registrants”", time: "Yesterday", category: "attendee" },
  { id: "log-06", user: "Elena Marsh", action: "archived event", target: "Executive Roundtable", time: "Yesterday", category: "event" },
];

export const hubspotLists = [
  { id: "hs-01", name: "Q1 Summit Registrants", contacts: 1284 },
  { id: "hs-02", name: "Partner Program — Active", contacts: 342 },
  { id: "hs-03", name: "Developer Newsletter", contacts: 8930 },
  { id: "hs-04", name: "VIP & Speakers", contacts: 96 },
];

export const emailTemplates = [
  { id: "tpl-01", name: "Ticket & Agenda Confirmation" },
  { id: "tpl-02", name: "Doors Open Reminder" },
  { id: "tpl-03", name: "Schedule Change Notice" },
  { id: "tpl-04", name: "VIP Welcome Pack" },
  { id: "tpl-05", name: "Post-Event Thank You" },
];

export const emailCampaigns = [
  { id: "camp-01", eventId: "evt-01", template: "Doors Open Reminder", recipients: 428, status: "sent", when: "Today · 08:34" },
  { id: "camp-02", eventId: "evt-01", template: "Ticket & Agenda Confirmation", recipients: 428, status: "sent", when: "Feb 20 · 10:00" },
  { id: "camp-03", eventId: "evt-01", template: "VIP Welcome Pack", recipients: 36, status: "scheduled", when: "Mar 11 · 09:00" },
  { id: "camp-04", eventId: "evt-02", template: "Ticket & Agenda Confirmation", recipients: 512, status: "sent", when: "Mar 1 · 09:00" },
  { id: "camp-05", eventId: "evt-02", template: "Doors Open Reminder", recipients: 512, status: "scheduled", when: "Apr 3 · 08:00" },
  { id: "camp-06", eventId: "evt-04", template: "Doors Open Reminder", recipients: 189, status: "scheduled", when: "May 14 · 18:00" },
  { id: "camp-07", eventId: "evt-03", template: "Schedule Change Notice", recipients: 34, status: "draft", when: "Not scheduled" },
];

export const statusLabels = { active: "Active", draft: "Completed", cancelled: "Cancelled" };
