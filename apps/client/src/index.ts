import sade from "sade";
import { name, version } from "../package.json";

import handler from "./handler";

const cli = sade(name, true);
cli.version(version);

cli.describe("A live collaborative editor in your terminal! ⚡️");

cli.example("");
cli.example("-c c0w.sh/Wkybpkrm");
cli.example("-p password");

cli.option("-c, --connect", "Connect to a room.");
cli.option("-p, --password", "Set a password to access a room.");

cli.action(handler);

cli.parse(process.argv);
