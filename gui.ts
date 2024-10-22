import { Webview } from "@webview/webview";
import { post } from "./main.ts";

const htmlPath = "./index.html";
const htmlPage = await Deno.readTextFile(htmlPath);
await Deno.readTextFile("./main.ts");

const webview = new Webview();

webview.navigate(`data:text/html,${encodeURIComponent(htmlPage)}`);

webview.bind("post", post);

webview.run();

