const fs = require("fs");
const path = require("path");

const target = path.join(process.cwd(), "node_modules", "next", "dist", "trace", "report", "to-json.js");
const marker = "if (process.env.BRANDARMOR_DISABLE_NEXT_TRACE !== '0') return;";

if (!fs.existsSync(target)) {
  process.exit(0);
}

let source = fs.readFileSync(target, "utf8");
if (!source.includes(marker)) {
  source = source.replace(
    "const reportToLocalHost = (event)=>{",
    `const reportToLocalHost = (event)=>{\n    ${marker}`
  );
  fs.writeFileSync(target, source, "utf8");
}
