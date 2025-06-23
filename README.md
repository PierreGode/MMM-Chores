# MMM-Chores

**MMM-Chores** is a module for [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror) that allows you to manage your household chores.

It provides an admin interface where you can add, edit, and delete tasks. You can also set due dates and assign tasks to different persons. The module displays the tasks on your MagicMirror, allowing you to keep track of your household chores at a glance.

The data is stored in `data.json` to make the data persistent between restarts.

*Update 2025-05-30: Added AI Generate, It is a helper that will create tasks for coming 7 days based on your data.json history. the more history accumulated the better it will get predicting tasks to create and whom to assign them to.
*Update 2025-06-16: Tasks can now be set to recur weekly, monthly or yearly when created.

## Screenshots
  
![frontend](img/screenshot1_frontend.png)

![backend](img/admin.png)

## Installation

```bash
cd ~/MagicMirror/modules
git clone https://github.com/PierreGode/MMM-Chores
cd MMM-Chores
npm install
```

## Update

```bash
cd ~/MagicMirror/modules/MMM-Chores
git pull
npm install
```

## Configuration
in /MagicMirror/config/config.js
```js
{
  module: "MMM-Chores",
  position: "bottom_right",
  header: "Chores",
  config: {
    updateInterval: 60 * 1000,
    adminPort: 5003,
    openaiApiKey: "your-openApi-key-here",
    useAI: true,        // hide AI features when false
    showDays: 3,       // show tasks from today and the next 2 days (total 3 days)
    showPast: true,    // also show unfinished tasks from past days
    textMirrorSize: "small", // small, medium or large
    dateFormatting: "MM-DD",  // Date format pattern to display task dates.
                              // Use tokens like 'yyyy', 'mm', 'dd'.
                              // Set to "" to hide the date completely.
    leveling: {               // optional leveling system
      enabled: true,
      yearsToMaxLevel: 3,
      choresPerWeekEstimate: 4,
      maxLevel: 100
    },
    levelTitles: [            // titles for every 10 levels
      "Junior",
      "Apprentice",
      "Journeyman",
      "Experienced",
      "Expert",
      "Veteran",
      "Master",
      "Grandmaster",
      "Legend",
      "Mythic"
    ]
  }
},
```

### Level titles

For level **N** (1 ≤ N ≤ 100), the module chooses a title based on the ten-level
interval that `N` belongs to. Level 1–10 uses the first entry in `levelTitles`,
11–20 the second entry, and so on. The boundaries are inclusive, so level 10
still uses the first title and 11 uses the second.

Specify your own titles by providing a `levelTitles` array with exactly ten
strings in the configuration. If omitted, the defaults shown above are used.

### Per-person levels

Each person earns experience separately. Their current level and title are stored
in `data.json` and shown next to the name in the admin interface. On the
MagicMirror display the assigned person's name will include a small
`lvlX` badge.

## Admin Interface

Go to http://yourmirrorIP:5003/ #page will be reachable within same network.
> [!CAUTION]
> DO NOT expose application with portforward

## Push Notifications

If you wish to use push notifications follow guide below. 

![cert](img/screenshot3_cert.png)

### 1. in MagicMirror/modules/MMM-Chores create a folder certs

```bash
mkdir MagicMirror/modules/MMM-Chores/certs
```

### 2. Generate a private key in MMM-Chores/certs

```bash
openssl genrsa -out server.key 2048
```

### 3. Create a certificate signing request (CSR)

```bash
openssl req -new -key server.key -out server.csr -subj "/C=SE/ST=Stockholm/L=Stockholm/O=Home/CN=192.168.1.192" <--- YOUR IP
```

### 4. Generate a self-signed cert valid for 1 year

```bash
openssl x509 -req -in server.csr -signkey server.key -out server.crt -days 365
```

copy /certs/server.crt and install on your devices.

browse to https://yourmirrorIP:5004/ and allow push notifications.

> [!NOTE]
> And yes everything will yell unsafe, warning warning, Not Secure, that is what happens when you do a selfsigned certificate and not a micrsoft signed cert for loads of money ;P

