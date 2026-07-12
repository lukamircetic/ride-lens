import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import { Layer } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { makeAppLive } from "./app";

const port = Number.parseInt(process.env.PORT ?? "3002", 10);
const hostname = process.env.HOST ?? "127.0.0.1";
const dataDir = process.env.RIDE_LENS_DATA_DIR;

const ServerLive = HttpRouter.serve(makeAppLive({ dataDir })).pipe(
  Layer.provide(BunHttpServer.layer({ hostname, port })),
);

BunRuntime.runMain(Layer.launch(ServerLive));
