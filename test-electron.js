const e = require("electron"); console.log("app type:", typeof e.app); e.app.whenReady().then(() => { console.log("READY"); setTimeout(() => e.app.quit(), 1000); });
